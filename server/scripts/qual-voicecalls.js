require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const tbl of ['voice_calls', 'leads']) {
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [tbl]);
    console.log('\n================ ' + tbl + ' ================');
    console.log('Colonne:');
    cols.rows.forEach(c => console.log('  ' + c.column_name + ' : ' + c.data_type));

    // 3 righe recenti (se c'e' created_at)
    const hasCreated = cols.rows.some(c => c.column_name === 'created_at');
    const order = hasCreated ? 'ORDER BY created_at DESC' : '';
    try {
      const sample = await client.query(`SELECT * FROM "${tbl}" ${order} LIMIT 3`);
      console.log('\nEsempi (' + sample.rows.length + '):');
      sample.rows.forEach((r, i) => {
        console.log('\n  [' + (i+1) + ']');
        Object.entries(r).forEach(([k, v]) => {
          let s = (v === null) ? 'null' : (typeof v === 'object') ? JSON.stringify(v) : String(v);
          if (s.length > 200) s = s.slice(0, 200) + '…';
          console.log('    ' + k + ' = ' + s);
        });
      });
    } catch (e) { console.log('  (errore lettura righe: ' + e.message + ')'); }
  }

  await client.end();
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
