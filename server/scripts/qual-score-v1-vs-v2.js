require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

// Confronto quality_score (v1) vs quality_score_v2 sulle chiamate recenti.
// Obiettivo: capire se il qualificatore e' migrato a quality_score_v2 e quante
// lead realmente scorate finiscono con v1 vuoto (quindi perse da noi che leggiamo v1).
const HOURS = parseInt(process.argv[2], 10) || 48;

(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const since = `NOW() - INTERVAL '${HOURS} hours'`;

  // Solo chiamate "completed" (quelle che possono avere uno score)
  const rows = await client.query(`
    SELECT
      (custom_data_collection->>'quality_score')    AS v1,
      (custom_data_collection->>'quality_score_v2') AS v2,
      status, call_result, success
    FROM voice_calls
    WHERE created_at >= ${since}
      AND status = 'completed'`);

  const norm = (x) => (x === null ? '(null)' : x === '' ? '(empty)' : x);
  const isVal = (x) => x !== null && x !== '' && x !== undefined;

  let bothNull = 0, onlyV1 = 0, onlyV2 = 0, both = 0;
  const v1dist = {}, v2dist = {};
  const onlyV2samples = [];

  rows.rows.forEach(r => {
    v1dist[norm(r.v1)] = (v1dist[norm(r.v1)] || 0) + 1;
    v2dist[norm(r.v2)] = (v2dist[norm(r.v2)] || 0) + 1;
    const a = isVal(r.v1), b = isVal(r.v2);
    if (a && b) both++;
    else if (a) onlyV1++;
    else if (b) { onlyV2++; if (onlyV2samples.length < 12) onlyV2samples.push(r); }
    else bothNull++;
  });

  console.log('Chiamate completed ultime ' + HOURS + 'h:', rows.rows.length);
  console.log('\n=== Presenza score ===');
  console.log('  solo v1 valorizzato :', onlyV1);
  console.log('  solo v2 valorizzato :', onlyV2, '  <-- lead scorate che noi PERDIAMO se leggiamo v1');
  console.log('  entrambi            :', both);
  console.log('  nessuno dei due     :', bothNull);

  console.log('\n=== Distribuzione quality_score (v1) ===');
  Object.entries(v1dist).sort((a,b)=>b[1]-a[1]).forEach(([k,n]) => console.log('  ' + n + '\t' + k));
  console.log('\n=== Distribuzione quality_score_v2 ===');
  Object.entries(v2dist).sort((a,b)=>b[1]-a[1]).forEach(([k,n]) => console.log('  ' + n + '\t' + k));

  console.log('\n=== Esempi "solo v2" (v1 vuoto, v2 pieno) ===');
  onlyV2samples.forEach(r => console.log('  v1=' + norm(r.v1) + ' | v2=' + r.v2 + ' | success=' + r.success + ' | result=' + r.call_result));

  await client.end();
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
