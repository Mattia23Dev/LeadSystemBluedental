require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { getDeasoftToken, getDeasoftLeadOutcome } = require('../helpers/deasoft');

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

function getTwoMonthsAgoRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  //start.setMonth(start.getMonth() - 2);
  start.setDate(start.getDate() - 4);
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
    const { start, end } = getTwoMonthsAgoRange();
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

    const leads = await Lead.find(query).sort({ dataTimestamp: -1 })//.limit(BATCH_SIZE);
    const debugRows = [];
    console.log(`[Deasoft sync] Start | leads=${leads.length}`, {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      targetNexusEsitoKeyword: TARGET_NEXUS_ESITO_KEYWORD,
      excludeNexusEsitoRegex: EXCLUDE_NEXUS_ESITO_REGEX_SOURCE || null,
      historyLimit: DEASOFT_HISTORY_LIMIT,
      dryRun: DRY_RUN,
    });

    for (const lead of leads) {
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
        continue;
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

        lead.deasoft_lead = deasoftLead;
        lead.deasoft_sync = {
          ...(lead.deasoft_sync || {}),
          lastSyncAt: new Date(),
          lastError: null,
          lastLeadSystemId: idNexus,
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
    }

    await fs.promises.mkdir(DEBUG_CSV_DIR, { recursive: true });
    const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileSuffix = DRY_RUN ? 'dryrun-' : '';
    const csvPath = path.join(DEBUG_CSV_DIR, `deasoft-sync-debug-${fileSuffix}${fileTimestamp}.csv`);
    const csvContent = buildDebugCsv(debugRows);
    await fs.promises.writeFile(csvPath, csvContent, 'utf8');

    console.log(`[Deasoft sync] Debug CSV generated | path=${csvPath} | rows=${debugRows.length}`);
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
  cron.schedule(CRON_EXPR, () => {
    syncOnce().catch((e) => console.error('[Deasoft sync] schedule error:', e?.message || e));
  });
}

module.exports = { syncOnce };
