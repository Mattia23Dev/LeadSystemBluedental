require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const statuses = await DeepagentLog.distinct('status');
  const successes = await DeepagentLog.distinct('success');
  const punteggi = await DeepagentLog.distinct('punteggio');
  console.log('Valori distinti STATUS:', JSON.stringify(statuses));
  console.log('Valori distinti SUCCESS:', JSON.stringify(successes));
  console.log('Valori distinti PUNTEGGIO:', JSON.stringify(punteggi));
  console.log('\n--- Combinazioni (outcome / success / status / punteggio) ---');
  const combos = await DeepagentLog.aggregate([
    { $group: { _id: { outcome:'$outcome', success:'$success', status:'$status', punteggio:'$punteggio' }, n:{$sum:1} } },
    { $sort: { n:-1 } }
  ]);
  combos.forEach(c=>console.log('  n='+c.n+'  outcome='+c._id.outcome+' | success='+JSON.stringify(c._id.success)+' | status='+JSON.stringify(c._id.status)+' | punteggio='+c._id.punteggio));
  // esempio payload grezzo completo di un scored e di un no_punteggio
  const ok = await DeepagentLog.findOne({outcome:'scored_nexus_ok'}).lean();
  const np = await DeepagentLog.findOne({outcome:'no_punteggio'}).lean();
  console.log('\n--- payload grezzo scored_nexus_ok ---'); console.log(JSON.stringify(ok&&ok.payload));
  console.log('--- payload grezzo no_punteggio ---'); console.log(JSON.stringify(np&&np.payload));
  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
