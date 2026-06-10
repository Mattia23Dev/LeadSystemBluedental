require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const DeepagentLog = require('../models/deepagentLog');

const PHONE = '3491945718';

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const leads = await Lead.find({
    $or: [ { numeroTelefono: PHONE }, { numeroTelefono: `+39${PHONE}` } ]
  }).sort({ dataTimestamp: -1 }).lean();

  console.log('Lead trovate per ' + PHONE + ':', leads.length);
  leads.forEach(l => {
    console.log('\n--- Lead ' + l._id + ' ---');
    console.log('  nome:', l.nome);
    console.log('  numeroTelefono:', l.numeroTelefono);
    console.log('  punteggio:', JSON.stringify(l.punteggio), '(typeof ' + typeof l.punteggio + ')');
    console.log('  esito:', l.esito, '| status:', l.status);
    console.log('  appVoiceBot:', l.appVoiceBot);
    console.log('  idNexus:', l.idNexus);
    console.log('  nexusDeferred:', l.nexusDeferred);
    console.log('  utmCampaign:', l.utmCampaign);
    console.log('  città:', l.città);
    console.log('  dataTimestamp:', l.dataTimestamp);
  });

  const logs = await DeepagentLog.find({ userPhone: { $in: [PHONE, `+39${PHONE}`] } }).sort({ receivedAt: 1 }).lean();
  console.log('\n=== Log deepagent: ' + logs.length + ' ===');
  logs.forEach(g => {
    console.log('  ' + new Date(g.receivedAt).toISOString()
      + ' | endpoint=' + g.endpoint
      + ' | outcome=' + g.outcome
      + ' | punteggio=' + JSON.stringify(g.punteggio)
      + ' | idNexus=' + (g.matchedIdNexus||'-')
      + ' | pushOk=' + g.nexusPushOk);
    console.log('    payload ricevuto:', JSON.stringify(g.payload));
    if (g.nexusPayload) console.log('    nexusPayload:', JSON.stringify(g.nexusPayload));
  });

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
