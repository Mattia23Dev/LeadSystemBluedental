require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

// Punteggi 0 ESPLICITI (number 0 o "0") arrivati nelle ultime N ore, v2.
const HOURS = parseInt(process.argv[2], 10) || 24;
const fmt = (d) => new Date(d).toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);

  const rows = await DeepagentLog.find({
    endpoint: '/webhook-n8n-bludental-v2',
    receivedAt: { $gte: since },
    'payload.punteggio_qualifica': { $in: [0, '0'] },
  }).sort({ receivedAt: -1 }).lean();

  console.log('Punteggi 0 espliciti ultime ' + HOURS + 'h:', rows.length);
  const byOutcome = {};
  rows.forEach(r => { byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1; });
  console.log('Per outcome:', JSON.stringify(byOutcome));
  console.log('='.repeat(80));
  rows.forEach(r => {
    console.log(fmt(r.receivedAt)
      + '  | tel=' + r.userPhone
      + '  | punt=' + JSON.stringify(r.payload.punteggio_qualifica)
      + '  | outcome=' + r.outcome
      + '  | idNexus=' + (r.matchedIdNexus || '-')
      + '  | pushOk=' + r.nexusPushOk);
  });

  // Confronto rapido: nelle stesse ore, quanti 1, 2, vuoti/null
  const all = await DeepagentLog.find({
    endpoint: '/webhook-n8n-bludental-v2',
    receivedAt: { $gte: since },
  }).lean();
  const dist = {};
  all.forEach(l => {
    const p = l.payload ? l.payload.punteggio_qualifica : undefined;
    const k = (p === undefined) ? '(missing)' : (p === null) ? '(null)' : (p === '') ? '(empty)' : JSON.stringify(p);
    dist[k] = (dist[k] || 0) + 1;
  });
  console.log('\n=== Distribuzione punteggio TUTTI gli eventi v2 ultime ' + HOURS + 'h (tot ' + all.length + ') ===');
  Object.entries(dist).sort((a,b)=>b[1]-a[1]).forEach(([k,n]) => console.log('  ' + n + '\t' + k));

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
