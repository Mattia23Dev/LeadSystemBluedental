require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
(async () => {
  await mongoose.connect(process.env.DATABASE);
  const since = new Date(Date.now() - 24*60*60*1000);
  const scoredOutcomes = ['scored_nexus_created','scored_nexus_ok','scored_nexus_create_failed','scored_nexus_failed','scored_no_idnexus'];
  const rows = await DeepagentLog.find({ endpoint:'/webhook-n8n-bludental-v2', receivedAt:{$gte:since}, outcome:{$in:scoredOutcomes} }).lean();
  console.log('Eventi "scored" v2 ultime 24h:', rows.length);
  const byPhone = {};
  rows.forEach(r => { const p=r.userPhone||'?'; (byPhone[p]=byPhone[p]||[]).push(r); });
  const phones = Object.keys(byPhone);
  console.log('Numeri distinti scorati:', phones.length);
  const dups = phones.filter(p => byPhone[p].length > 1).sort((a,b)=>byPhone[b].length-byPhone[a].length);
  console.log('Numeri con PIU di 1 evento scored:', dups.length);
  let extra = 0; dups.forEach(p => extra += byPhone[p].length-1);
  console.log('Eventi scored "in eccesso" (duplicati):', extra);
  console.log('\n=== Top numeri ripetuti ===');
  dups.slice(0,12).forEach(p => {
    const ev = byPhone[p].sort((a,b)=>new Date(a.receivedAt)-new Date(b.receivedAt));
    console.log('  ' + p + '  x' + ev.length + '  -> ' + ev.map(e=>new Date(e.receivedAt).toLocaleTimeString('it-IT',{timeZone:'Europe/Rome'})+'/p'+e.punteggio+'/'+e.outcome+(e.matchedIdNexus?'/nex:'+String(e.matchedIdNexus).slice(0,8):'')).join('  '));
  });
  await mongoose.disconnect(); process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
