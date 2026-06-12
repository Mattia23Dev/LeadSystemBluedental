require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const PHONES = process.argv.slice(2);
if(!PHONES.length) PHONES.push('+393319970857','+393391902150','+393315774662','+393533351880','+393240438156','+393283117546','+393357282505','+393398482571','+393291597442');
(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const c = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await c.connect();
  for (const phone of PHONES) {
    const q = await c.query(`
      SELECT conv.updated_at, conv.channel, conv.state,
             conv.vars->>'score' AS score,
             LEFT(COALESCE(conv.vars->>'nota_sistema',''),120) AS nota
      FROM conversations conv JOIN contacts ct ON ct.id = conv.contact_id
      WHERE ct.phone = $1 ORDER BY conv.updated_at DESC LIMIT 2`, [phone]);
    console.log('\n=== '+phone+' ===');
    if(!q.rows.length){ console.log('  (nessuna conversazione)'); continue; }
    q.rows.forEach(r=>console.log('  '+new Date(r.updated_at).toISOString()+' | ch='+r.channel+' | state='+r.state+' | SCORE='+r.score+' | '+(r.nota||'').replace(/\s+/g,' ')));
  }
  await c.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
