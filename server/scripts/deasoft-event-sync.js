require('dotenv').config();

const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getDeasoftToken, getDeasoftEventResult } = require('../helpers/deasoft');

// Cron notturno che allinea gli esiti dell'AGENDAZIONE DIRETTA Deasoft.
// Per ogni lead agendata (con idDeasoft) chiama GET ?Type=EventResult&id_deasoft=...
// e salva i post-esiti (presentato/non presentato, preventivato, fatturato, valore).
// Flusso SEPARATO da Nexus e dal vecchio deasoft-nightly-sync (che usa id_leadsystem/idNexus).
// Ambiente beta finche' Marica (Deasoft) non conferma il prod.

let running = false;
const CRON_EXPR = process.env.DEASOFT_EVENT_SYNC_CRON || '0 4 * * *';
const CRON_ENABLED = (process.env.DEASOFT_EVENT_SYNC_ENABLED || 'true').toLowerCase() === 'true';
const HISTORY_LIMIT = Number(process.env.DEASOFT_EVENT_SYNC_HISTORY_LIMIT || 20);
const DRY_RUN = (process.env.DEASOFT_EVENT_SYNC_DRY_RUN || 'false').toLowerCase() === 'true';
// Finestra: guarda le lead agendate negli ultimi N giorni (0 = nessun limite temporale).
const LOOKBACK_DAYS = Number(process.env.DEASOFT_EVENT_SYNC_LOOKBACK_DAYS || 90);
const PROGRESS_LOG_EVERY = 25;

// Estrae un valore dal payload EventResult provando piu' nomi campo (case-insensitive),
// dato che lo schema esatto della risposta Deasoft e' da confermare.
function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  const lowerMap = {};
  for (const k of Object.keys(obj)) lowerMap[k.toLowerCase()] = obj[k];
  for (const key of keys) {
    const v = lowerMap[key.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// Il payload potrebbe essere un array o annidato in data/result: prende il primo record utile.
function normalizeEventPayload(payload) {
  if (Array.isArray(payload)) return payload[0] || {};
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data[0] || {};
    if (payload.data && typeof payload.data === 'object') return payload.data;
    if (Array.isArray(payload.result)) return payload.result[0] || {};
    if (payload.result && typeof payload.result === 'object') return payload.result;
  }
  return payload || {};
}

function mapEsiti(payload) {
  const rec = normalizeEventPayload(payload);
  return {
    presentato: pick(rec, ['presentato', 'presente', 'presentation', 'presented', 'stato']),
    preventivato: pick(rec, ['preventivato', 'preventivo', 'quoted', 'quote']),
    fatturato: pick(rec, ['fatturato', 'invoiced', 'billed']),
    valore: pick(rec, ['valore', 'value', 'importo', 'amount', 'valore_fatturato']),
  };
}

function getLookbackRange() {
  if (!LOOKBACK_DAYS || LOOKBACK_DAYS <= 0) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - LOOKBACK_DAYS);
  return start;
}

async function syncOnce() {
  if (running) {
    console.log('[Deasoft event sync] Skip: already running');
    return;
  }
  running = true;

  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Missing env DATABASE');
  let didConnectHere = false;

  try {
    const mongoAlreadyConnected = mongoose.connection.readyState === 1;
    if (!mongoAlreadyConnected) {
      await mongoose.connect(uri);
      didConnectHere = true;
    }

    const token = await getDeasoftToken();

    // Solo lead del NUOVO flusso di agendazione diretta (agendata=true) con id_deasoft
    // valorizzato. IMPORTANTE: NON basta filtrare per idDeasoft, perche' esiste un flusso
    // preesistente (comparadentista.js fetchLeadsUpdatesFromSheet, utente call-center) che
    // usa idDeasoft per tutt'altro: quel filtro le escluderebbe erroneamente dal loro giro
    // e le includerebbe nel nostro. agendata=true e' impostato solo dal callback
    // /webhook-agendazione-deasoft, quindi isola esattamente le lead che ci interessano.
    const query = {
      agendata: true,
      idDeasoft: { $exists: true, $nin: [null, ''] },
    };
    const start = getLookbackRange();
    if (start) {
      query.$or = [
        { agendataAt: { $gte: start } },
        { dataTimestamp: { $gte: start } },
      ];
    }

    const leads = await Lead.find(query).sort({ agendataAt: -1, dataTimestamp: -1 });
    console.log(`[Deasoft event sync] Start | leads=${leads.length} | lookbackDays=${LOOKBACK_DAYS} | dryRun=${DRY_RUN}`);

    let processed = 0;
    let ok = 0;
    let failed = 0;

    for (const lead of leads) {
      processed++;
      const idDeasoft = String(lead.idDeasoft || '').trim();

      if (processed % PROGRESS_LOG_EVERY === 0) {
        console.log(`[Deasoft event sync] Progress | processed=${processed} | ok=${ok} | failed=${failed}`);
      }

      try {
        const payload = await getDeasoftEventResult(idDeasoft, token);
        const esiti = mapEsiti(payload);

        const history = Array.isArray(lead.deasoft_event_sync?.syncHistory)
          ? [...lead.deasoft_event_sync.syncHistory]
          : [];
        history.push({ at: new Date(), ok: true, error: null, payload });
        if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);

        lead.deasoft_event = payload;
        lead.deasoft_event_sync = {
          ...(lead.deasoft_event_sync ? lead.deasoft_event_sync.toObject?.() || lead.deasoft_event_sync : {}),
          lastSyncAt: new Date(),
          lastError: null,
          lastIdDeasoft: idDeasoft,
          presentato: esiti.presentato,
          preventivato: esiti.preventivato,
          fatturato: esiti.fatturato,
          valore: esiti.valore,
          syncHistory: history,
        };

        if (!DRY_RUN) await lead.save();
        ok++;
        console.log(`[Deasoft event sync] ${DRY_RUN ? 'DRY-RUN ok' : 'Updated'} lead ${lead._id} | idDeasoft=${idDeasoft} | esiti=${JSON.stringify(esiti)}`);
      } catch (error) {
        const errorMessage = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
        const history = Array.isArray(lead.deasoft_event_sync?.syncHistory)
          ? [...lead.deasoft_event_sync.syncHistory]
          : [];
        history.push({ at: new Date(), ok: false, error: errorMessage, payload: null });
        if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);

        lead.deasoft_event_sync = {
          ...(lead.deasoft_event_sync ? lead.deasoft_event_sync.toObject?.() || lead.deasoft_event_sync : {}),
          lastSyncAt: new Date(),
          lastError: errorMessage,
          lastIdDeasoft: idDeasoft,
          syncHistory: history,
        };

        if (!DRY_RUN) await lead.save();
        failed++;
        console.error(`[Deasoft event sync] Failed lead ${lead._id} | idDeasoft=${idDeasoft}:`, error?.response?.data || error.message);
      }
    }

    console.log(`[Deasoft event sync] Done | processed=${processed} | ok=${ok} | failed=${failed}`);
  } catch (err) {
    console.error('[Deasoft event sync] FAILED:', err?.response?.data || err.message);
  } finally {
    try {
      if (didConnectHere && mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
    } catch (_) {}
    running = false;
  }
}

if (CRON_ENABLED) {
  console.log(`[Deasoft event sync] cron enabled: ${CRON_EXPR} (dryRun=${DRY_RUN})`);
  cron.schedule(CRON_EXPR, () => {
    syncOnce().catch((e) => console.error('[Deasoft event sync] schedule error:', e?.message || e));
  });
}

module.exports = { syncOnce };
