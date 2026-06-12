require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Client } = require('pg');
const DeepagentLog = require('../models/deepagentLog');
(async () => {
  await mongoose.connect(process.env.DATABASE);
  const since = new Date(Date.now() - 24*60*60*1000);
  const lost = await DeepagentLog.find({ endpoint:'/webhook-n8n-bludental-v2', outcome:'no_punteggio', receivedAt:{$gte:since} }).lean();
  const phones = [...new Set(lost.map(l=>l.userPhone).filter(Boolean))];
  console.log('Eventi no_punteggio ("") ultime 24h:', lost.length, '| numeri distinti:', phones.length);
  await mongoose.disconnect();

  const conn = (process.env.QUALIFICATORE_DB || '').replace(/[?&]sslmode=[^&]*/i, '');
  const c = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await c.connect();
  // Per ogni numero perso, lo score piu recente nelle conversazioni chat
  const res = await c.query(`
    SELECT ct.phone, (conv.vars->>'score') AS score, conv.updated_at
    FROM conversations conv JOIN contacts ct ON ct.id=conv.contact_id
    WHERE ct.phone = ANY($1)
    AND conv.updated_at >= NOW() - INTERVAL '48 hours'
    ORDER BY ct.phone, conv.updated_at DESC`, [phones]);
  // tieni il piu recente per numero
  const latest = {};
  res.rows.forEach(r => { if(!latest[r.phone]) latest[r.phone]=r.score; });
  let withScore=0, nullScore=0, noConv=0;
  const scoredPhones=[];
  phones.forEach(p => {
    if(!(p in latest)) { noConv++; return; }
    const s = latest[p];
    if(s===null || s===undefined || s==='') nullScore++;
    else { withScore++; scoredPhones.push(p+'=score '+s); }
  });
  console.log('\n=== ESITO: dei numeri persi, cosa aveva davvero il qualificatore ===');
  console.log('  con SCORE valorizzato (PERSI VERI):', withScore);
  console.log('  score null (giustamente non scorati):', nullScore);
  console.log('  nessuna conversazione nelle 48h:', noConv);
  console.log('\n=== Numeri persi che AVEVANO uno score ===');
  scoredPhones.forEach(x=>console.log('  '+x));
  await c.end(); process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
