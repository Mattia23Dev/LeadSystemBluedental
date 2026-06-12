require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

// Quanti eventi deepagent hanno punteggio 0 e che fine fanno?
(async () => {
  await mongoose.connect(process.env.DATABASE);

  const all = await DeepagentLog.find().sort({ receivedAt: 1 }).lean();
  console.log('Totale log:', all.length);

  const classify = (p) => {
    if (p === undefined || p === null) return '(missing)';
    if (p === '') return '(empty-string)';
    return JSON.stringify(p) + ' [' + typeof p + ']';
  };

  // Distribuzione punteggio grezzo nel log
  const dist = {};
  all.forEach(l => { const k = classify(l.punteggio); dist[k] = (dist[k]||0)+1; });
  console.log('\n=== Distribuzione campo punteggio (log) ===');
  Object.keys(dist).sort().forEach(k => console.log('  ' + k + ': ' + dist[k]));

  // Eventi che SONO 0 (numero 0 o stringa "0")
  const zeros = all.filter(l => l.punteggio === 0 || l.punteggio === '0');
  console.log('\n=== Eventi con punteggio 0 ===', zeros.length);
  const zByOutcome = {};
  zeros.forEach(l => { zByOutcome[l.outcome] = (zByOutcome[l.outcome]||0)+1; });
  Object.keys(zByOutcome).sort().forEach(k => console.log('  ' + k + ': ' + zByOutcome[k]));

  console.log('\n  --- dettaglio (max 20) ---');
  zeros.slice(0,20).forEach(l => {
    console.log('  ' + new Date(l.receivedAt).toISOString()
      + ' | ' + l.endpoint
      + ' | outcome=' + l.outcome
      + ' | tel=' + l.userPhone
      + ' | idNexus=' + (l.matchedIdNexus||'-')
      + ' | pushOk=' + l.nexusPushOk
      + ' | nexusPayload.punteggio=' + (l.nexusPayload ? JSON.stringify(l.nexusPayload.punteggio) : 'n/a')
      + (l.nexusError ? ' | ERR=' + JSON.stringify(l.nexusError).slice(0,150) : ''));
  });

  // Eventi "no_punteggio" — sospetti: il qualificatore potrebbe mandare 0 come vuoto
  const noScore = all.filter(l => l.outcome === 'no_punteggio');
  console.log('\n=== Eventi outcome=no_punteggio ===', noScore.length);
  console.log('  (questi potrebbero essere 0-score mandati come vuoto/missing dal qualificatore)');
  noScore.slice(0,15).forEach(l => {
    console.log('  ' + new Date(l.receivedAt).toISOString()
      + ' | tel=' + l.userPhone
      + ' | punteggio=' + classify(l.punteggio)
      + ' | status=' + l.status
      + ' | success=' + l.success
      + ' | payload=' + JSON.stringify(l.payload).slice(0,200));
  });

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
