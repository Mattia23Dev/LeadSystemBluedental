require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1) Tabelle
  const tables = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name`);
  console.log('=== TABELLE ===');
  tables.rows.forEach(t => console.log('  ' + t.table_schema + '.' + t.table_name));

  // 2) Colonne per ogni tabella + conteggio righe
  for (const t of tables.rows) {
    const cols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema=$1 AND table_name=$2
      ORDER BY ordinal_position`, [t.table_schema, t.table_name]);
    let cnt = '?';
    try {
      const c = await client.query(`SELECT COUNT(*)::int AS n FROM "${t.table_schema}"."${t.table_name}"`);
      cnt = c.rows[0].n;
    } catch (e) { cnt = 'err'; }
    console.log('\n--- ' + t.table_schema + '.' + t.table_name + '  (righe: ' + cnt + ') ---');
    cols.rows.forEach(c => console.log('    ' + c.column_name + ' : ' + c.data_type));
  }

  await client.end();
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
