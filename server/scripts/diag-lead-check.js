require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
const Lead = require('../models/lead');

const TARGET = process.argv[2] || '3428505891';

(async () => {
  await mongoose.connect(process.env.DATABASE);

  console.log('=== CHECK LEAD tel ~' + TARGET + ' ===\n');

  console.log('--- LEAD ---');
  const leads = await Lead.find({ numeroTelefono: { $regex: TARGET } })
    .sort({ dataTimestamp: -1 }).limit(5)
    .select('nome email numeroTelefono idNexus punteggio esito status nexusDeferred luogo dataTimestamp recallIds').lean();
  if (!leads.length) console.log('  NESSUNA lead trovata.');
  leads.forEach(l => {
    console.log('  ' + (l.dataTimestamp ? new Date(l.dataTimestamp).toISOString() : '(no ts)')
      + '\n    nome=' + (l.nome || '-')
      + ' | tel=' + l.numeroTelefono
      + '\n    idNexus=' + (l.idNexus || '-')
      + ' | nexusDeferred=' + l.nexusDeferred
      + ' | punteggio=' + (l.punteggio != null ? l.punteggio : '-')
      + '\n    esito=' + (l.esito || '-')
      + ' | status=' + (l.status || '-')
      + ' | luogo=' + (l.luogo || '-')
      + '\n    _id=' + l._id);
  });

  console.log('\n--- LOG DEEPAGENT ---');
  const logs = await DeepagentLog.find({ userPhone: { $regex: TARGET } })
    .sort({ receivedAt: -1 }).limit(10).lean();
  if (!logs.length) console.log('  NESSUN log deepagent.');
  logs.forEach(r => {
    console.log('  ' + new Date(r.receivedAt).toISOString()
      + ' | ep=' + r.endpoint
      + ' | outcome=' + r.outcome
      + ' | punteggio=' + r.punteggio
      + ' | idNexus=' + (r.matchedIdNexus || '-')
      + ' | nexusPushOk=' + r.nexusPushOk
      + (r.nexusError ? '\n      ERR=' + JSON.stringify(r.nexusError).slice(0, 200) : '')
      + (r.nexusResponse ? '\n      RESP=' + JSON.stringify(r.nexusResponse).slice(0, 200) : ''));
  });

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('ERR', (e && e.message) || e); process.exit(1); });
