require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
const { getLeadById } = require('../helpers/nexus');

const sleep = ms => new Promise(r=>setTimeout(r,ms));

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const since = new Date(Date.now() - 3*24*60*60*1000);
  // prendi invii riusciti con idNexus, raggruppa per punteggio inviato
  const sends = await DeepagentLog.find({
    outcome: { $in: ['scored_nexus_created','scored_nexus_ok'] },
    matchedIdNexus: { $ne: null },
    receivedAt: { $gte: since },
  }).sort({ receivedAt: -1 }).lean();

  // campione: fino a 5 per ciascun punteggio 0/1/2
  const pick = { '0': [], '1': [], '2': [] };
  for (const s of sends) {
    const p = String(s.payload && s.payload.punteggio_qualifica);
    if (pick[p] && pick[p].length < 5) pick[p].push(s);
  }
  await mongoose.disconnect();

  for (const score of ['0','1','2']) {
    console.log('\n############ PUNTEGGIO INVIATO = ' + score + ' ############');
    for (const s of pick[score]) {
      try {
        const nx = await getLeadById(s.matchedIdNexus);
        const inviato = s.nexusPayload ? s.nexusPayload.punteggio : '(n/a)';
        console.log('  id=' + s.matchedIdNexus.slice(0,8)
          + ' | tel=' + s.userPhone
          + ' | inviato punteggio=' + JSON.stringify(inviato)
          + ' | NEXUS punteggio=' + JSON.stringify(nx.punteggio)
          + ' | micro_fonte=' + JSON.stringify(nx.micro_fonte)
          + (String(nx.punteggio) !== score ? '   <<< NON COMBACIA' : ''));
        await sleep(200);
      } catch (e) {
        console.log('  id=' + s.matchedIdNexus.slice(0,8) + ' | ERRORE GET: ' + (e.response?.data ? JSON.stringify(e.response.data).slice(0,100) : e.message));
      }
    }
  }
  process.exit(0);
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
