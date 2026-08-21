/**
 * Copertura di data_ora_appuntamento per canale di lavorazione (sent_easycall).
 * Conferma che il buco del §1.3 dipende dal call center esterno e non dalla data
 * di creazione della lead. Riferimento: mail Robert Timofte 21/08/2026.
 *
 * Uso: node server/scripts/diag-copertura-easycall.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { listLeads } = require('../helpers/nexus');
function q(select, conditions, order='', limit='', group='') { return listLeads({ select, conditions, group, having:'', order, limit, offset:'', page:'', pageSize:'' }); }
async function rows(select, conditions, order, limit, group) {
  try { const r = await q(select, conditions, order, limit, group); return Array.isArray(r)?r:[]; }
  catch(e){ console.log('ERR', JSON.stringify(e?.response?.data)||e.message); return []; }
}
const SEL = "COUNT(*) AS fissate, SUM(CASE WHEN t.data_ora_appuntamento IS NOT NULL THEN 1 ELSE 0 END) AS con_data";
(async () => {
  for (const [label, cond] of [
    ['TUTTO LO STORICO', "t.esito='fissato'"],
    ['create dal 06/08', "t.esito='fissato' AND t.data_creazione >= '2026-08-06'"],
    ['lun 3 - mer 5 ago', "t.esito='fissato' AND t.data_creazione >= '2026-08-03' AND t.data_creazione < '2026-08-06'"],
    ['gio 30 lug - dom 2 ago', "t.esito='fissato' AND t.data_creazione >= '2026-07-30' AND t.data_creazione < '2026-08-03'"],
  ]) {
    const r = await rows(`t.sent_easycall AS ec, ${SEL}`, cond, 'fissate DESC', '10', 't.sent_easycall');
    console.log(`\n### ${label}`);
    for (const x of r) {
      const pct = x.fissate > 0 ? Math.round((x.con_data / x.fissate) * 100) : 0;
      console.log(`  sent_easycall=${String(x.ec === null ? 'NULL' : x.ec).padEnd(6)} fissate=${String(x.fissate).padEnd(7)} con_data=${String(x.con_data).padEnd(7)} ${pct}%`);
    }
  }
  console.log('\n### nuovi campi centro: gia popolati? ###');
  for (const [l, c] of [
    ['centro_bludental', "t.centro_bludental IS NOT NULL AND t.centro_bludental <> ''"],
    ['id_centro_bludental', "t.id_centro_bludental IS NOT NULL AND t.id_centro_bludental <> ''"],
    ['indirizzo_completo_centro_bludental', "t.indirizzo_completo_centro_bludental IS NOT NULL AND t.indirizzo_completo_centro_bludental <> ''"],
    ['data_ora_mancato_appuntamento', 't.data_ora_mancato_appuntamento IS NOT NULL'],
  ]) {
    const r = await rows('COUNT(*) AS n', c, '', '1');
    console.log(`  ${l.padEnd(40)} ${Number(r[0]?.n || 0)}`);
  }
})();
