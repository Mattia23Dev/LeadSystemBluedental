require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

// Outcome che rappresentano un TENTATIVO di invio PRE-META a Nexus
const SEND_OUTCOMES = [
  'scored_nexus_ok',           // v1: UPDATE PRE-META riuscito
  'scored_nexus_failed',       // v1: UPDATE PRE-META fallito
  'scored_nexus_created',      // v2: CREATE PRE-META riuscito
  'scored_nexus_create_failed' // v2: CREATE PRE-META fallito
];
const OK_OUTCOMES   = ['scored_nexus_ok', 'scored_nexus_created'];
const FAIL_OUTCOMES = ['scored_nexus_failed', 'scored_nexus_create_failed'];

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const tot = await DeepagentLog.countDocuments();
  console.log('Totale documenti in deepagentlogs:', tot);
  if (!tot) { console.log('Ancora NESSUN log registrato (il server potrebbe non essere aggiornato).'); await mongoose.disconnect(); process.exit(0); }

  // Quadro completo per outcome
  const byOutcome = await DeepagentLog.aggregate([
    { $group: { _id: '$outcome', n: { $sum: 1 } } }, { $sort: { n: -1 } }
  ]);
  console.log('\n=== TUTTI gli outcome registrati ===');
  byOutcome.forEach(o => console.log('  ' + (o._id || '(null)') + ': ' + o.n));

  // Solo gli invii PRE-META a Nexus
  const sends = await DeepagentLog.find({ outcome: { $in: SEND_OUTCOMES } })
    .sort({ receivedAt: 1 }).lean();

  const okN     = sends.filter(s => OK_OUTCOMES.includes(s.outcome)).length;
  const failN   = sends.filter(s => FAIL_OUTCOMES.includes(s.outcome)).length;
  const updN    = sends.filter(s => s.outcome === 'scored_nexus_ok').length;
  const createN = sends.filter(s => s.outcome === 'scored_nexus_created').length;

  console.log('\n=== INVII PRE-META A NEXUS ===');
  console.log('  Tentativi totali:', sends.length);
  console.log('  Riusciti:', okN, '(update v1=' + updN + ', create v2=' + createN + ')');
  console.log('  Falliti :', failN);
  if (sends.length) {
    const rate = ((okN / sends.length) * 100).toFixed(1);
    console.log('  Tasso di successo:', rate + '%');
    console.log('  Periodo:', new Date(sends[0].receivedAt).toISOString(), '→', new Date(sends[sends.length - 1].receivedAt).toISOString());
  }

  // Per giorno
  const byDay = {};
  sends.forEach(s => {
    const d = new Date(s.receivedAt).toISOString().slice(0, 10);
    byDay[d] = byDay[d] || { ok: 0, fail: 0 };
    if (OK_OUTCOMES.includes(s.outcome)) byDay[d].ok++; else byDay[d].fail++;
  });
  console.log('\n=== Per giorno (ok / fail) ===');
  Object.keys(byDay).sort().forEach(d => console.log('  ' + d + ': ok=' + byDay[d].ok + '  fail=' + byDay[d].fail));

  // Dettaglio fallimenti
  const fails = sends.filter(s => FAIL_OUTCOMES.includes(s.outcome));
  console.log('\n=== Dettaglio FALLIMENTI (' + fails.length + ') ===');
  fails.forEach(f => {
    console.log('  ' + new Date(f.receivedAt).toISOString()
      + ' | ' + f.outcome
      + ' | tel=' + f.userPhone
      + ' | punteggio=' + f.punteggio
      + ' | lead=' + (f.matchedLeadId || '-')
      + ' | idNexus=' + (f.matchedIdNexus || '-')
      + (f.nexusError ? ' | err=' + JSON.stringify(f.nexusError).slice(0, 200) : ''));
  });

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
