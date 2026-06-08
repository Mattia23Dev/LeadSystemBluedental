require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const byEp = await DeepagentLog.aggregate([
    { $match: { receivedAt: { $gte: since } } },
    { $group: { _id: { ep: '$endpoint', outcome: '$outcome' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  console.log('--- Log ultime 3h per endpoint+outcome ---');
  byEp.forEach(o => console.log('  ' + o._id.ep + ' | ' + o._id.outcome + ' : ' + o.n));

  console.log('\n--- Log per tel 3407701686 (Domenico Piccolo) ---');
  const logs = await DeepagentLog.find({ userPhone: { $regex: '3407701686' } })
    .sort({ receivedAt: -1 }).limit(5).lean();
  logs.forEach(r => console.log('  ' + new Date(r.receivedAt).toISOString()
    + ' | ep=' + r.endpoint + ' | outcome=' + r.outcome
    + ' | punteggio=' + r.punteggio + ' | idNexus=' + (r.matchedIdNexus || '-')));
  if (!logs.length) console.log('  NESSUN log deepagent per questo numero.');

  console.log('\n--- Log per tel 3455045818 (Sara Desimone, inviata ok) ---');
  const logs2 = await DeepagentLog.find({ userPhone: { $regex: '3455045818' } })
    .sort({ receivedAt: -1 }).limit(5).lean();
  logs2.forEach(r => console.log('  ' + new Date(r.receivedAt).toISOString()
    + ' | ep=' + r.endpoint + ' | outcome=' + r.outcome
    + ' | punteggio=' + r.punteggio + ' | idNexus=' + (r.matchedIdNexus || '-')));
  if (!logs2.length) console.log('  NESSUN log deepagent per questo numero.');

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('ERR', (e && e.message) || e); process.exit(1); });
