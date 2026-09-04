require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getDeasoftToken, getDeasoftLeadOutcome, mappaEsiti } = require('../helpers/deasoft');

let running = false;
const CRON_EXPR = process.env.DEASOFT_SYNC_CRON || '0 5 * * *';
const CRON_ENABLED = (process.env.DEASOFT_SYNC_ENABLED || 'true').toLowerCase() === 'true';
const SYNC_UTENTE = process.env.DEASOFT_SYNC_UTENTE || '65d3110eccfb1c0ce51f7492';
const BATCH_SIZE = Number(process.env.DEASOFT_SYNC_BATCH_SIZE || 50);
const TARGET_NEXUS_ESITO_KEYWORD = (process.env.DEASOFT_TARGET_NEXUS_ESITO_KEYWORD || 'fissato').trim();
/** Esito Nexus da non sincronizzare: "già fissato" (regex case-insensitive; vuoto = nessuna esclusione). */
const EXCLUDE_NEXUS_ESITO_REGEX_SOURCE = (
  process.env.DEASOFT_EXCLUDE_NEXUS_ESITO_REGEX || 'già\\s*fissato'
).trim();
const DEASOFT_HISTORY_LIMIT = Number(process.env.DEASOFT_SYNC_HISTORY_LIMIT || 20);
const DEBUG_CSV_DIR = process.env.DEASOFT_DEBUG_CSV_DIR || path.resolve(__dirname, '../csv');
// Il CSV di debug scriveva un file a ogni giro con tutte le lead processate: su Railway
// il disco e' effimero, quindi e' solo lavoro sprecato. Si accende quando serve davvero.
const DEBUG_CSV = String(process.env.DEASOFT_DEBUG_CSV || 'false').toLowerCase() === 'true';
const DRY_RUN = (process.env.DEASOFT_SYNC_DRY_RUN || 'false').toLowerCase() === 'true';

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (!/[",\n\r]/.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

function buildDebugCsv(rows) {
  const headers = [
    'leadId',
    'idNexus',
    'nome',
    'email',
    'numeroTelefono',
    'nexusEsito',
    'syncOk',
    'deasoftResult',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = [
      row.leadId,
      row.idNexus,
      row.nome,
      row.email,
      row.numeroTelefono,
      row.nexusEsito,
      row.syncOk,
      row.deasoftResult,
    ].map(csvEscape);
    lines.push(values.join(','));
  }
  return `${lines.join('\n')}\n`;
}

// Finestra di rilettura, in mesi. Allineata a quella del sync Nexus: un appuntamento
// puo' svolgersi mesi dopo la creazione della lead, e preventivo e fatturato arrivano
// dopo la visita. Con 4 mesi sono circa 12.700 lead per giro, una chiamata ciascuna.
const SYNC_MESI = Number(process.env.DEASOFT_SYNC_MESI || 4);
// Quante lead interrogare in parallelo. In sequenza il giro non finiva: ogni lead costa
// circa 2s di chiamata piu' il salvataggio, quindi 12.700 lead volevano oltre 30 ore e
// il cron della notte dopo trovava il giro precedente ancora in corso. Con 8 in
// parallelo si scende sotto le 2 ore. Da alzare solo se Deasoft regge.
const CONCORRENZA = Number(process.env.DEASOFT_SYNC_CONCORRENZA || 8);
// Tetto sulle lead processate: serve alle prove controllate, in produzione resta nullo.
const MAX_LEADS = process.env.DEASOFT_SYNC_MAX_LEADS ? Number(process.env.DEASOFT_SYNC_MAX_LEADS) : null;
// Ogni quanti giorni tornare a chiedere una lead che abbiamo gia' interrogato.
// L'endpoint Deasoft impiega ~13s quando trova il dato e rallenta sotto carico: chiedere
// tutte le 12.700 lead ogni notte vuol dire un giro che non finisce mai (misurato il
// 04/09/2026: dopo 12 ore era al 36%). Si torna a chiedere solo quando ha senso.
const RICHIEDI_DOPO_GIORNI = Number(process.env.DEASOFT_SYNC_RICHIEDI_GIORNI || 1);
// Esito gia' fatturato: e' il capolinea, non serve rileggerlo ogni notte.
const RICHIEDI_FINALE_GIORNI = Number(process.env.DEASOFT_SYNC_FINALE_GIORNI || 14);
// Contatto che Deasoft non trova: probabilmente non lo trovera' nemmeno domani.
const RICHIEDI_KO_GIORNI = Number(process.env.DEASOFT_SYNC_KO_GIORNI || 7);

function getFinestraRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - SYNC_MESI);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function syncOnce() {
  if (running) {
    console.log('[Deasoft sync] Skip: already running');
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
    const { start, end } = getFinestraRange();
    const nexusEsitoKeywordRegex = new RegExp(TARGET_NEXUS_ESITO_KEYWORD, 'i');
    const excludeNexusEsitoRegex = EXCLUDE_NEXUS_ESITO_REGEX_SOURCE
      ? new RegExp(EXCLUDE_NEXUS_ESITO_REGEX_SOURCE, 'i')
      : null;

    const matchTargetEsito = {
      $or: [
        { 'nexus_sync.lastEsito': { $regex: nexusEsitoKeywordRegex } },
        { 'nexus_lead.esito': { $regex: nexusEsitoKeywordRegex } },
      ],
    };

    const query = {
      dataTimestamp: { $gte: start, $lte: end },
      idNexus: { $exists: true, $nin: [null, ''] },
      ...(excludeNexusEsitoRegex
        ? {
            $and: [
              matchTargetEsito,
              {
                $nor: [
                  { 'nexus_sync.lastEsito': { $regex: excludeNexusEsitoRegex } },
                  { 'nexus_lead.esito': { $regex: excludeNexusEsitoRegex } },
                ],
              },
            ],
          }
        : matchTargetEsito),
    };
    if (SYNC_UTENTE) query.utente = SYNC_UTENTE;

    // Un esito puo' esistere solo DOPO la visita: le lead con appuntamento futuro non
    // hanno ancora nulla da raccontare e si saltano finche' la data non e' passata.
    // Quelle senza data restano dentro: non sappiamo quando sia la visita.
    const adesso = new Date();
    query.$or = [
      { 'appuntamento.dataOraTs': null },
      { 'appuntamento.dataOraTs': { $exists: false } },
      { 'appuntamento.dataOraTs': { $lt: adesso } },
    ];

    let leads = await Lead.find(query).sort({ dataTimestamp: -1 });
    const totaleInFinestra = leads.length;

    const giorniFa = (g) => new Date(adesso.getTime() - g * 24 * 3600 * 1000);
    const daRichiedere = (lead) => {
      const d = lead.deasoft_sync || {};
      if (!d.lastSyncAt) return true;                                  // mai interrogata
      if (d.fatturato === true) return d.lastSyncAt < giorniFa(RICHIEDI_FINALE_GIORNI);
      if (d.lastError) return d.lastSyncAt < giorniFa(RICHIEDI_KO_GIORNI);
      return d.lastSyncAt < giorniFa(RICHIEDI_DOPO_GIORNI);
    };
    leads = leads.filter(daRichiedere);
    const saltate = totaleInFinestra - leads.length;

    if (MAX_LEADS) leads = leads.slice(0, MAX_LEADS);
    const debugRows = [];
    console.log(`[Deasoft sync] Start | da interrogare=${leads.length} | in finestra=${totaleInFinestra} | saltate perche' gia' aggiornate=${saltate}`, {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      targetNexusEsitoKeyword: TARGET_NEXUS_ESITO_KEYWORD,
      excludeNexusEsitoRegex: EXCLUDE_NEXUS_ESITO_REGEX_SOURCE || null,
      historyLimit: DEASOFT_HISTORY_LIMIT,
      dryRun: DRY_RUN,
    });

    let fatte = 0;
    const processaLead = async (lead) => {
      const idNexus = String(lead.idNexus || '').trim();
      const nexusEsito = lead?.nexus_sync?.lastEsito || lead?.nexus_lead?.esito || 'N/D';
      const baseDebugRow = {
        leadId: String(lead._id || ''),
        idNexus,
        nome: lead.nome || '',
        email: lead.email || '',
        numeroTelefono: lead.numeroTelefono || '',
        nexusEsito,
      };
      if (!idNexus) {
        console.warn(`[Deasoft sync] Skip lead ${lead._id}: missing idNexus`);
        debugRows.push({
          ...baseDebugRow,
          syncOk: false,
          deasoftResult: 'SKIPPED: missing idNexus',
        });
        return;
      }
      try {
        console.log(
          `[Deasoft sync] Fetch Deasoft lead ${lead._id} | idNexus=${idNexus} | nexusEsito="${nexusEsito}"`
        );
        const deasoftLead = await getDeasoftLeadOutcome(idNexus, token);
        const history = Array.isArray(lead.deasoft_sync?.syncHistory)
          ? [...lead.deasoft_sync.syncHistory]
          : [];
        history.push({
          at: new Date(),
          ok: true,
          error: null,
          payload: deasoftLead,
        });
        if (history.length > DEASOFT_HISTORY_LIMIT) {
          history.splice(0, history.length - DEASOFT_HISTORY_LIMIT);
        }

        // Oltre al payload grezzo si salvano gli esiti gia' normalizzati: senza, ogni
        // lettura a valle - dashboard compresa - dovrebbe rifare il parsing a mano.
        lead.deasoft_lead = deasoftLead;
        lead.deasoft_sync = {
          ...(lead.deasoft_sync || {}),
          lastSyncAt: new Date(),
          lastError: null,
          lastLeadSystemId: idNexus,
          ...mappaEsiti(deasoftLead),
          syncHistory: history,
        };
        if (!DRY_RUN) await lead.save();
        debugRows.push({
          ...baseDebugRow,
          syncOk: true,
          deasoftResult: JSON.stringify(deasoftLead),
        });
        console.log(`[Deasoft sync] ${DRY_RUN ? 'DRY-RUN ok' : 'Updated'} lead ${lead._id} | idNexus=${idNexus}`);
      } catch (error) {
        const errorMessage = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
        const history = Array.isArray(lead.deasoft_sync?.syncHistory)
          ? [...lead.deasoft_sync.syncHistory]
          : [];
        history.push({
          at: new Date(),
          ok: false,
          error: errorMessage,
          payload: null,
        });
        if (history.length > DEASOFT_HISTORY_LIMIT) {
          history.splice(0, history.length - DEASOFT_HISTORY_LIMIT);
        }

        lead.deasoft_sync = {
          ...(lead.deasoft_sync || {}),
          lastSyncAt: new Date(),
          lastError: errorMessage,
          lastLeadSystemId: idNexus,
          syncHistory: history,
        };
        if (!DRY_RUN) await lead.save();
        debugRows.push({
          ...baseDebugRow,
          syncOk: false,
          deasoftResult: errorMessage,
        });
        console.error(`[Deasoft sync] Failed lead ${lead._id} | idNexus=${idNexus}:`, error?.response?.data || error.message);
      }
    };

    // Pool di lavoratori: CONCORRENZA lead alla volta, ognuno pesca la successiva appena
    // ha finito. Cosi' una lead lenta non blocca le altre.
    let prossima = 0;
    const lavoratore = async () => {
      while (prossima < leads.length) {
        const lead = leads[prossima++];
        await processaLead(lead);
        fatte++;
        if (fatte % 250 === 0) {
          console.log(`[Deasoft sync] Progress | ${fatte}/${leads.length}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, CONCORRENZA) }, () => lavoratore()));
    console.log(`[Deasoft sync] Elaborate ${fatte} lead con concorrenza ${CONCORRENZA}`);

    if (DEBUG_CSV) {
      await fs.promises.mkdir(DEBUG_CSV_DIR, { recursive: true });
      const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileSuffix = DRY_RUN ? 'dryrun-' : '';
      const csvPath = path.join(DEBUG_CSV_DIR, `deasoft-sync-debug-${fileSuffix}${fileTimestamp}.csv`);
      await fs.promises.writeFile(csvPath, buildDebugCsv(debugRows), 'utf8');
      console.log(`[Deasoft sync] Debug CSV generated | path=${csvPath} | rows=${debugRows.length}`);
    }
    console.log('[Deasoft sync] Done');
  } catch (err) {
    console.error('[Deasoft sync] FAILED:', err?.response?.data || err.message);
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
  console.log(`[Deasoft sync] cron enabled: ${CRON_EXPR}`);
  // Fuso esplicito: il server gira in UTC, senza questo '0 5 * * *' scatterebbe alle
  // 07:00 italiane (verificato il 04/09/2026, il giro e' partito alle 07:00:21).
  cron.schedule(CRON_EXPR, () => {
    syncOnce().catch((e) => console.error('[Deasoft sync] schedule error:', e?.message || e));
  }, { timezone: 'Europe/Rome' });
}

module.exports = { syncOnce };
