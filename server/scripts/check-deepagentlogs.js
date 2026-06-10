require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const tot = await DeepagentLog.countDocuments();
  console.log('Totale documenti in deepagentlogs:', tot);
  if(!tot){ console.log('Ancora NESSUN log registrato.'); await mongoose.disconnect(); process.exit(0); }

  // Conteggio per outcome
  const byOutcome = await DeepagentLog.aggregate([{ $group: { _id: '$outcome', n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
  console.log('\n--- Per outcome ---');
  byOutcome.forEach(o => console.log('  ' + (o._id||'(null)') + ': ' + o.n));

  // Primo e ultimo
  const first = await DeepagentLog.findOne().sort({ receivedAt: 1 }).lean();
  const last  = await DeepagentLog.findOne().sort({ receivedAt: -1 }).lean();
  console.log('\nPrimo log:', first.receivedAt);
  console.log('Ultimo log:', last.receivedAt);

  // Ultimi 8 in dettaglio
  const recents = await DeepagentLog.find().sort({ receivedAt: -1 }).limit(8).lean();
  console.log('\n--- Ultimi ' + recents.length + ' log ---');
  recents.forEach(r => {
    console.log('  ' + new Date(r.receivedAt).toISOString()
      + ' | outcome=' + r.outcome
      + ' | tel=' + r.userPhone
      + ' | punteggio=' + r.punteggio
      + ' | lead=' + (r.matchedLeadId||'-')
      + ' | idNexus=' + (r.matchedIdNexus||'-')
      + ' | nexusPushOk=' + r.nexusPushOk
      + (r.nexusError ? ' | nexusError=' + JSON.stringify(r.nexusError).slice(0,120) : '')
      + (r.handlerError ? ' | handlerError=' + r.handlerError : '')
      + ' | ' + r.processingMs + 'ms');
  });

  // Eventuali problemi
  const failed = await DeepagentLog.countDocuments({ outcome: 'scored_nexus_failed' });
  const notFound = await DeepagentLog.countDocuments({ outcome: 'lead_not_found' });
  const handlerErr = await DeepagentLog.countDocuments({ outcome: 'handler_error' });
  const noIdNexus = await DeepagentLog.countDocuments({ outcome: 'scored_no_idnexus' });
  console.log('\n--- Possibili perdite ---');
  console.log('  scored_nexus_failed:', failed, '| lead_not_found:', notFound, '| scored_no_idnexus:', noIdNexus, '| handler_error:', handlerErr);

  await mongoose.disconnect(); process.exit(0);
})().catch(e=>{console.error('ERRORE:', e&&e.message||e);process.exit(1);});
