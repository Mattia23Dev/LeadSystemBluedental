/**
 * Copertura di data_ora_appuntamento per giorno di creazione lead (20/08/2026).
 *
 * Serve a rispondere a NextUp sul §1.3 della Rev. 2.0: il buco non e' casuale ma
 * a blocchi (lun-mer 27-29/07 e 03-05/08 valorizzati all'85-90%, tutto il resto
 * sotto il 10%), quindi non e' spiegabile con "Deasoft non ci manda il dato":
 * Deasoft non conosce la data di creazione della lead su Nexus.
 *
 * Uso: node server/scripts/diag-copertura-appuntamenti-20ago.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const { listLeads } = require('../helpers/nexus');

function q(select, conditions, order = '', limit = '', group = '') {
  return listLeads({ select, conditions, group, having: '', order, limit, offset: '', page: '', pageSize: '' });
}
async function rows(select, conditions, order, limit, group) {
  try { const r = await q(select, conditions, order, limit, group); return Array.isArray(r) ? r : []; }
  catch (e) { console.log('ERRORE:', JSON.stringify(e?.response?.data) || e.message); return []; }
}
async function count(label, conditions) {
  const r = await rows('COUNT(*) AS n', conditions, '', '1');
  const n = Number(r[0]?.n || 0);
  console.log(`${String(label).padEnd(74)} ${n}`);
  return n;
}

async function main() {
  console.log('\n### A) copertura per giorno di creazione lead (fissati) ###');
  const a = await rows(
    "DATE(t.data_creazione) AS g, COUNT(*) AS fissati, " +
      'SUM(CASE WHEN t.data_ora_appuntamento IS NOT NULL THEN 1 ELSE 0 END) AS con_data',
    "t.esito = 'fissato' AND t.data_creazione >= '2026-07-20'", 'g ASC', '45', 'DATE(t.data_creazione)'
  );
  console.log('giorno        fissati  con_data_ora');
  for (const r of a) console.log(`${String(r.g).slice(0, 10).padEnd(14)}${String(r.fissati).padEnd(9)}${r.con_data}`);

  console.log('\n### B) totali ###');
  await count("esito='fissato' create dal 06/08", "t.esito = 'fissato' AND t.data_creazione >= '2026-08-06'");
  await count('  di cui con data_ora_appuntamento', "t.esito = 'fissato' AND t.data_creazione >= '2026-08-06' AND t.data_ora_appuntamento IS NOT NULL");
  await count('data_ora_appuntamento valorizzata (totale)', 't.data_ora_appuntamento IS NOT NULL');
  await count('centro_bludental valorizzato', "t.centro_bludental IS NOT NULL AND t.centro_bludental <> ''");
  await count('lead totali', '1=1');

  console.log('\n### C) mirror nostro: prime date/ora viste per giorno (batch?) ###');
  await mongoose.connect(process.env.DATABASE);
  const pv = await Lead.aggregate([
    { $match: { 'appuntamento.dataOraPrimaAt': { $ne: null } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appuntamento.dataOraPrimaAt' } }, n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  for (const r of pv) console.log(` ${r._id}  ${r.n}`);
  await mongoose.disconnect();
}
main().catch(async (e) => {
  console.error('FAILED:', e?.response?.data || e.message || e);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
