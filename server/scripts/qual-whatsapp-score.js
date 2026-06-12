require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
(async () => {
  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const c = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // leads: enum qualification_channel + status
  const ch = await c.query(`SELECT qualification_channel, COUNT(*)::int n FROM leads GROUP BY 1 ORDER BY n DESC`);
  console.log('=== leads.qualification_channel ===');
  ch.rows.forEach(r=>console.log('  '+r.qualification_channel+': '+r.n));
  const st = await c.query(`SELECT status, COUNT(*)::int n FROM leads GROUP BY 1 ORDER BY n DESC`);
  console.log('\n=== leads.status ===');
  st.rows.forEach(r=>console.log('  '+r.status+': '+r.n));

  // conversations: channel + chiavi piu frequenti dentro vars (dove sta lo score wa?)
  const conv = await c.query(`SELECT channel, COUNT(*)::int n FROM conversations GROUP BY 1 ORDER BY n DESC`);
  console.log('\n=== conversations.channel ===');
  conv.rows.forEach(r=>console.log('  '+r.channel+': '+r.n));

  console.log('\n=== Chiavi piu frequenti in conversations.vars ===');
  const keys = await c.query(`
    SELECT k, COUNT(*)::int n FROM conversations, LATERAL jsonb_object_keys(vars) k
    WHERE vars IS NOT NULL GROUP BY k ORDER BY n DESC LIMIT 40`);
  keys.rows.forEach(r=>console.log('  '+r.k+': '+r.n));

  // Esempi di vars che contengono 'score' o 'qualif' o 'punteggio'
  console.log('\n=== Esempi vars con score/quality/punteggio (3) ===');
  const ex = await c.query(`
    SELECT id, channel, vars FROM conversations
    WHERE vars::text ~* '(score|quality|punteggio|qualif)'
    ORDER BY updated_at DESC LIMIT 3`);
  ex.rows.forEach(r=>{
    console.log('\n  conv '+String(r.id).slice(0,8)+' ch='+r.channel);
    console.log('  vars='+JSON.stringify(r.vars).slice(0,500));
  });

  await c.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
