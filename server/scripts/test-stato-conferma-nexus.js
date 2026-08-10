/**
 * Prova di scrittura reale del campo `stato_conferma` su Nexus.
 *
 * Sceglie una lead VECCHIA e CHIUSA (nessun appuntamento, esito negativo, oltre 90
 * giorni fa) per non disturbare le operatrici, scrive SI-CONFERMA, rilegge, verifica
 * che campagna / esito / lead_status / punteggio siano rimasti invariati e infine
 * RIPULISCE il campo.
 *
 * Uso: node server/scripts/test-stato-conferma-nexus.js [idNexus]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getLeadById, listLeads, saveLeadWithResult } = require('../helpers/nexus');

const CAMPI_DA_PRESERVARE = ['campagna', 'esito', 'lead_status', 'punteggio', 'macro_fonte', 'micro_fonte', 'data_ora_appuntamento', 'no_show'];

async function scegliLead() {
  const res = await listLeads({
    select: 't.id, t.esito, t.campagna, t.data_creazione',
    conditions:
      "t.esito = 'non interessato' AND t.data_ora_appuntamento IS NULL AND t.no_show IS NULL " +
      "AND t.stato_conferma IS NULL AND t.data_creazione < DATE_SUB(NOW(), INTERVAL 90 DAY)",
    group: '', having: '', order: 't.data_creazione ASC', limit: '1', offset: '', page: '', pageSize: '',
  });
  const row = Array.isArray(res) ? res[0] : null;
  return row?.id || null;
}

function snapshot(lead) {
  return Object.fromEntries(CAMPI_DA_PRESERVARE.map((k) => [k, lead?.[k] ?? null]));
}

async function main() {
  const idArg = process.argv[2];
  const id = idArg || (await scegliLead());
  if (!id) return console.log('Nessuna lead candidata trovata.');

  console.log(`Lead di test: ${id}\n`);

  const prima = await getLeadById(id);
  console.log('PRIMA :', JSON.stringify({ stato_conferma: prima.stato_conferma, ...snapshot(prima) }));

  console.log('\n>>> POST /lead/api/set { id, stato_conferma: "SI-CONFERMA" }');
  const w = await saveLeadWithResult({ id, stato_conferma: 'SI-CONFERMA' });
  console.log('    esito:', JSON.stringify(w).slice(0, 300));

  const dopo = await getLeadById(id);
  console.log('\nDOPO  :', JSON.stringify({ stato_conferma: dopo.stato_conferma, ...snapshot(dopo) }));

  const alterati = CAMPI_DA_PRESERVARE.filter((k) => (prima?.[k] ?? null) !== (dopo?.[k] ?? null));
  console.log(`\nCampo scritto correttamente : ${dopo.stato_conferma === 'SI-CONFERMA' ? 'SI' : 'NO (' + JSON.stringify(dopo.stato_conferma) + ')'}`);
  console.log(`Altri campi alterati        : ${alterati.length ? alterati.join(', ') : 'nessuno'}`);

  console.log('\n>>> Pulizia: rimetto stato_conferma vuoto');
  const clean = await saveLeadWithResult({ id, stato_conferma: '' });
  console.log('    esito:', JSON.stringify(clean).slice(0, 300));
  const finale = await getLeadById(id);
  console.log('FINALE:', JSON.stringify({ stato_conferma: finale.stato_conferma, ...snapshot(finale) }));
}

main().catch((e) => {
  console.error('FAILED:', e?.response?.data || e.message || e);
  process.exit(1);
});
