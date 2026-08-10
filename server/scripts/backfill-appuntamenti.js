/**
 * Backfill del blocco `appuntamento` (fissato / no show / data-ora) sulle lead gia' esistenti.
 *
 * Due passate:
 *  1) LOCALE: rilegge il payload nexus_lead gia' salvato in Mongo e popola il blocco
 *     appuntamento. Nessuna chiamata API.
 *  2) NEXUS:  interroga Nexus per TUTTE le lead con data_ora_appuntamento valorizzata
 *     oppure no_show='1' e allinea anche le lead FUORI dalla finestra di 2 mesi del
 *     cron notturno (verificato il 06/08: ~75 appuntamenti futuri appartengono a lead
 *     piu' vecchie di 2 mesi, che il cron non rilegge mai).
 *
 * Uso:
 *   node server/scripts/backfill-appuntamenti.js            # esegue
 *   node server/scripts/backfill-appuntamenti.js --dry-run  # simula
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { listLeads } = require('../helpers/nexus');
const { buildAppuntamento } = require('../helpers/appuntamento');

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH = 500;

function q(select, conditions, order = '', limit = '') {
  return listLeads({ select, conditions, group: '', having: '', order, limit, offset: '', page: '', pageSize: '' });
}

async function passataLocale() {
  console.log(`\n=== Passata 1: da nexus_lead gia' salvato (dryRun=${DRY_RUN}) ===`);
  const filtro = { 'nexus_lead.id': { $exists: true } };
  const totale = await Lead.countDocuments(filtro);
  console.log(`lead da esaminare: ${totale}`);

  let lastId = null;
  let letti = 0;
  let scritti = 0;
  const conteggi = { fissato: 0, no_show: 0, data_ora_prima: 0, spostamento: 0 };

  while (true) {
    const query = { ...filtro };
    if (lastId) query._id = { $gt: lastId };

    const leads = await Lead.find(query)
      .sort({ _id: 1 })
      .limit(BATCH)
      .select({ appuntamento: 1, nexus_lead: 1 })
      .lean();

    if (!leads.length) break;

    const ops = [];
    for (const l of leads) {
      lastId = l._id;
      letti++;
      const { appuntamento, changes } = buildAppuntamento(l.appuntamento, l.nexus_lead);
      if (!changes.length) continue;
      for (const c of changes) if (c in conteggi) conteggi[c]++;
      ops.push({ updateOne: { filter: { _id: l._id }, update: { $set: { appuntamento } } } });
    }

    if (ops.length && !DRY_RUN) await Lead.bulkWrite(ops, { ordered: false });
    scritti += ops.length;
    console.log(`  ...letti=${letti}/${totale} | aggiornati=${scritti}`);
  }

  console.log(`Passata 1 fine | letti=${letti} | aggiornati=${scritti} | fissato=${conteggi.fissato} no_show=${conteggi.no_show} dataOra=${conteggi.data_ora_prima} spostamenti=${conteggi.spostamento}`);
}

async function passataNexus() {
  console.log(`\n=== Passata 2: da Nexus (anche lead fuori finestra sync) ===`);
  const select = 't.id, t.id_lead_leadsystem, t.telefono, t.esito, t.lead_status, t.no_show, t.data_ora_appuntamento, t.stato_conferma';
  const conditions = "t.data_ora_appuntamento IS NOT NULL OR t.no_show = '1'";

  let righe = [];
  try {
    const res = await q(select, conditions, 't.data_ora_appuntamento ASC', '5000');
    righe = Array.isArray(res) ? res : [];
  } catch (e) {
    console.log('ERRORE list Nexus:', JSON.stringify(e?.response?.data) || e.message);
    return;
  }
  console.log(`righe Nexus con no_show o data_ora: ${righe.length}`);

  let aggiornate = 0;
  let senzaLead = 0;
  const ops = [];

  for (const r of righe) {
    const id = r.id_lead_leadsystem;
    if (!id || !/^[a-f0-9]{24}$/i.test(String(id))) { senzaLead++; continue; }

    const l = await Lead.findById(id).select({ appuntamento: 1 }).lean();
    if (!l) { senzaLead++; continue; }

    const { appuntamento, changes } = buildAppuntamento(l.appuntamento, {
      esito: r.esito,
      lead_status: r.lead_status,
      no_show: r.no_show,
      data_ora_appuntamento: r.data_ora_appuntamento,
      stato_conferma: r.stato_conferma,
    });
    if (!changes.length) continue;

    ops.push({ updateOne: { filter: { _id: id }, update: { $set: { appuntamento, idNexus: r.id } } } });
    aggiornate++;
    if (ops.length >= BATCH) {
      if (!DRY_RUN) await Lead.bulkWrite(ops, { ordered: false });
      ops.length = 0;
      console.log(`  ...aggiornate=${aggiornate}`);
    }
  }

  if (ops.length && !DRY_RUN) await Lead.bulkWrite(ops, { ordered: false });
  console.log(`Passata 2 fine | aggiornate=${aggiornate} | senza lead locale=${senzaLead}`);
}

async function riepilogo() {
  const [fissati, noShow, conDataOra, futuri] = await Promise.all([
    Lead.countDocuments({ 'appuntamento.fissato': true }),
    Lead.countDocuments({ 'appuntamento.noShow': true }),
    Lead.countDocuments({ 'appuntamento.dataOra': { $nin: [null, ''] } }),
    Lead.countDocuments({ 'appuntamento.dataOraTs': { $gte: new Date() } }),
  ]);
  console.log(`\n=== Stato finale Mongo ===`);
  console.log(`appuntamento.fissato = true : ${fissati}`);
  console.log(`appuntamento.noShow  = true : ${noShow}`);
  console.log(`con data/ora appuntamento   : ${conDataOra}`);
  console.log(`appuntamenti futuri         : ${futuri}`);
}

async function main() {
  await mongoose.connect(process.env.DATABASE);
  await passataLocale();
  await passataNexus();
  await riepilogo();
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('FAILED:', e?.response?.data || e.message || e);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
