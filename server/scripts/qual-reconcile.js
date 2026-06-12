require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const c = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const h of [24,48]) {
    const tot = await c.query(`SELECT COUNT(*)::int n FROM voice_calls WHERE created_at>=NOW()-INTERVAL '${h} hours'`);
    const byStatus = await c.query(`SELECT status, COUNT(*)::int n FROM voice_calls WHERE created_at>=NOW()-INTERVAL '${h} hours' GROUP BY status ORDER BY n DESC`);
    const scored = await c.query(`SELECT COUNT(*)::int n FROM voice_calls WHERE created_at>=NOW()-INTERVAL '${h} hours' AND COALESCE(custom_data_collection->>'quality_score','')<>''`);
    const byCust = await c.query(`SELECT customer_id, COUNT(*)::int n FROM voice_calls WHERE created_at>=NOW()-INTERVAL '${h} hours' GROUP BY customer_id ORDER BY n DESC`);
    console.log(`\n===== ULTIME ${h}h =====`);
    console.log('voice_calls totali:', tot.rows[0].n);
    console.log('con quality_score (v1) valorizzato:', scored.rows[0].n);
    console.log('per status:', byStatus.rows.map(r=>r.status+'='+r.n).join('  '));
    console.log('per customer_id:', byCust.rows.map(r=>r.customer_id.slice(0,8)+'='+r.n).join('  '));
  }
  await c.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
