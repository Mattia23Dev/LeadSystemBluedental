require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

// Chiamate "completed" SENZA score in nessuno dei due campi: sono segreterie/riagganci
// (durata breve) o conversazioni vere che l'agente avrebbe dovuto scorare?
const HOURS = parseInt(process.argv[2], 10) || 48;

(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const rows = await client.query(`
    SELECT created_at, success, call_duration, sentiment_label,
           LEFT(COALESCE(call_summary,''), 160) AS summary
    FROM voice_calls
    WHERE created_at >= NOW() - INTERVAL '${HOURS} hours'
      AND status = 'completed'
      AND COALESCE(custom_data_collection->>'quality_score','')    = ''
      AND COALESCE(custom_data_collection->>'quality_score_v2','') = ''
    ORDER BY call_duration DESC`);

  console.log('Completed senza score (v1 e v2 vuoti) ultime ' + HOURS + 'h:', rows.rows.length);

  // Bucket per durata
  const buckets = { '0-15s': 0, '16-45s': 0, '46-90s': 0, '>90s': 0 };
  rows.rows.forEach(r => {
    const d = r.call_duration || 0;
    if (d <= 15) buckets['0-15s']++;
    else if (d <= 45) buckets['16-45s']++;
    else if (d <= 90) buckets['46-90s']++;
    else buckets['>90s']++;
  });
  console.log('\n=== Per durata ===');
  Object.entries(buckets).forEach(([k, n]) => console.log('  ' + k + ': ' + n));

  console.log('\n=== Le 15 piu LUNGHE (sospette: conversazioni vere non scorate) ===');
  rows.rows.slice(0, 15).forEach(r => {
    console.log('\n  ' + new Date(r.created_at).toISOString() + ' | dur=' + r.call_duration + 's | success=' + r.success + ' | sent=' + r.sentiment_label);
    console.log('    ' + (r.summary || '(no summary)').replace(/\s+/g, ' '));
  });

  await client.end();
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
