/**
 * Allineamento dell'AGENDA appuntamenti dal Nexus al mirror locale.
 *
 * Il cron reminder legge esclusivamente da Mongo (blocco Lead.appuntamento). Questo
 * job tiene quel mirror aggiornato e completo, cosa che il sync notturno da solo non
 * garantisce per due motivi:
 *   - copre solo le lead degli ultimi 2 mesi: il 06/08/2026 c'erano 75 appuntamenti
 *     futuri su lead piu' vecchie, che il cron notturno non rilegge mai;
 *   - gira una volta al giorno, quindi spostamenti e disdette della giornata
 *     resterebbero invisibili fino alla notte.
 *
 * Costo: UNA query LIST a Nexus (poche centinaia di righe) + gli update cambiati.
 * Nessuna GET per lead, quindi si puo' far girare a ogni ora.
 *
 * Cosa fa:
 *   1) legge da Nexus tutte le lead con data_ora_appuntamento da ieri in avanti;
 *   2) aggiorna il blocco `appuntamento` locale (data/ora, spostamenti, no show,
 *      stato_conferma) tramite helpers/appuntamento.js;
 *   3) marca come SPARITI gli appuntamenti che in locale risultano futuri ma che
 *      Nexus non espone piu' (disdette): il reminder non li considera.
 *
 * Env:
 *   AGENDA_SYNC_ENABLED   default true
 *   AGENDA_SYNC_CRON      default '0 * * * *' (ogni ora, 5 minuti prima del reminder)
 *   AGENDA_SYNC_DRY_RUN   default false
 *
 * Uso manuale: node server/scripts/nexus-agenda-sync.js
 */
// path esplicito: cosi' l'uso manuale funziona anche lanciato dalla root del repo
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const cron = require('node-cron');
const Lead = require('../models/lead');
const { listLeads } = require('../helpers/nexus');
const { buildAppuntamento } = require('../helpers/appuntamento');

const ENABLED = String(process.env.AGENDA_SYNC_ENABLED || 'true').toLowerCase() === 'true';
const CRON_EXPR = process.env.AGENDA_SYNC_CRON || '0 * * * *';
const DRY_RUN = String(process.env.AGENDA_SYNC_DRY_RUN || 'false').toLowerCase() === 'true';

let running = false;

const SELECT =
  't.id, t.id_lead_leadsystem, t.telefono, t.nominativo, t.data_ora_appuntamento, ' +
  't.esito, t.lead_status, t.no_show, t.stato_conferma, t.citta, t.centro_bludental';

async function connetti() {
  if (mongoose.connection.readyState === 1) return false;
  const uri = process.env.DATABASE;
  if (!uri) throw new Error('Missing env DATABASE');
  await mongoose.connect(uri);
  return true;
}

async function syncOnce() {
  if (running) {
    console.log('[Agenda sync] Skip: gia in esecuzione');
    return;
  }
  running = true;
  let didConnect = false;

  try {
    didConnect = await connetti();

    // 1) agenda viva su Nexus: da ieri in avanti (ieri serve per chiudere la giornata appena passata)
    const res = await listLeads({
      select: SELECT,
      conditions: 't.data_ora_appuntamento >= DATE_SUB(NOW(), INTERVAL 1 DAY)',
      group: '', having: '',
      order: 't.data_ora_appuntamento ASC',
      limit: '5000', offset: '', page: '', pageSize: '',
    });
    const righe = Array.isArray(res) ? res : [];

    const ops = [];
    const visti = new Set();
    let aggiornate = 0;
    let senzaLead = 0;
    const conteggi = { spostamento: 0, no_show: 0, data_ora_prima: 0, stato_conferma_nexus: 0 };

    for (const r of righe) {
      const id = r.id_lead_leadsystem;
      if (!id || !/^[a-f0-9]{24}$/i.test(String(id))) { senzaLead++; continue; }

      const locale = await Lead.findById(id).select({ appuntamento: 1, idNexus: 1 }).lean();
      if (!locale) { senzaLead++; continue; }

      visti.add(String(id));

      const { appuntamento, changes } = buildAppuntamento(locale.appuntamento, {
        esito: r.esito,
        lead_status: r.lead_status,
        no_show: r.no_show,
        data_ora_appuntamento: r.data_ora_appuntamento,
        stato_conferma: r.stato_conferma,
      });
      if (!changes.length && locale.idNexus === r.id) continue;

      for (const c of changes) if (c in conteggi) conteggi[c]++;
      if (changes.includes('spostamento')) {
        console.log(`[Agenda sync] SPOSTATO | lead=${id} | ${locale.appuntamento?.dataOra} -> ${r.data_ora_appuntamento}`);
      }

      ops.push({ updateOne: { filter: { _id: id }, update: { $set: { appuntamento, idNexus: r.id } } } });
      aggiornate++;

      if (ops.length >= 500) {
        if (!DRY_RUN) await Lead.bulkWrite(ops, { ordered: false });
        ops.length = 0;
      }
    }
    if (ops.length && !DRY_RUN) await Lead.bulkWrite(ops, { ordered: false });

    // 2) disdette: in locale l'appuntamento e' futuro ma Nexus non lo espone piu'
    const futuriLocali = await Lead.find({
      'appuntamento.dataOraTs': { $gte: new Date() },
      'appuntamento.dataOraSparitaAt': null,
    }).select({ _id: 1, 'appuntamento.dataOra': 1 }).lean();

    const spariti = futuriLocali.filter((l) => !visti.has(String(l._id)));
    if (spariti.length && !DRY_RUN) {
      await Lead.updateMany(
        { _id: { $in: spariti.map((l) => l._id) } },
        { $set: { 'appuntamento.dataOraSparitaAt': new Date() } }
      );
    }

    console.log(
      `[Agenda sync] Fine | righeNexus=${righe.length} | aggiornate=${aggiornate} | senzaLead=${senzaLead} | ` +
      `spostamenti=${conteggi.spostamento} noShowNuovi=${conteggi.no_show} nuoviOrari=${conteggi.data_ora_prima} | ` +
      `spariti/disdette=${spariti.length} | dryRun=${DRY_RUN}`
    );
  } catch (e) {
    console.error('[Agenda sync] FAILED:', e?.response?.data || e.message || e);
  } finally {
    if (didConnect) await mongoose.disconnect().catch(() => {});
    running = false;
  }
}

if (require.main === module) {
  syncOnce().then(() => process.exit(0));
} else if (ENABLED) {
  console.log(`[Agenda sync] cron attivo: ${CRON_EXPR} (dryRun=${DRY_RUN})`);
  cron.schedule(CRON_EXPR, () => {
    syncOnce().catch((e) => console.error('[Agenda sync] schedule error:', e?.message || e));
  });
} else {
  console.log('[Agenda sync] cron NON attivo (AGENDA_SYNC_ENABLED != true)');
}

module.exports = { syncOnce };
