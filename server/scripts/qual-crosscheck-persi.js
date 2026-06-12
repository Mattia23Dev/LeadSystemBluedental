require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

// Cross-check: per ogni numero "perso" (arrivato a noi come no_punteggio ""),
// cosa aveva DAVVERO il qualificatore in voice_calls.custom_data_collection.quality_score?
const PHONES = process.argv.slice(2);
if (!PHONES.length) {
  // default: i numeri persi del 12/06 visti nei log nostri
  PHONES.push('+393319970857','+393391902150','+393315774662','+393533351880',
    '+393240438156','+393283117546','+393357282505','+393398482571','+393291597442');
}

(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const phone of PHONES) {
    // ultime chiamate per quel numero (join su contacts.phone)
    const q = await client.query(`
      SELECT vc.created_at, vc.status, vc.call_result, vc.success, vc.goal_met,
             vc.call_number, vc.recall_number,
             vc.custom_data_collection->>'quality_score'    AS quality_score,
             vc.custom_data_collection->>'quality_score_v2' AS quality_score_v2,
             vc.custom_data_collection->>'centro_scelto'    AS centro
      FROM voice_calls vc
      JOIN contacts c ON c.id = vc.contact_id
      WHERE c.phone = $1
      ORDER BY vc.created_at DESC
      LIMIT 3`, [phone]);
    console.log('\n=== ' + phone + ' ===');
    if (!q.rows.length) { console.log('  (nessuna voice_call trovata)'); continue; }
    q.rows.forEach(r => {
      console.log('  ' + new Date(r.created_at).toISOString()
        + ' | status=' + r.status
        + ' | result=' + r.call_result
        + ' | success=' + r.success
        + ' | goal_met=' + r.goal_met
        + ' | call#' + r.call_number + '/recall' + r.recall_number
        + ' | quality_score=' + r.quality_score
        + ' | v2=' + r.quality_score_v2
        + ' | centro=' + JSON.stringify(r.centro));
    });
  }

  await client.end();
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
