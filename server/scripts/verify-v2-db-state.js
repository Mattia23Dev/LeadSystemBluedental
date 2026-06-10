require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
const Lead = require('../models/lead');

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const v2 = await DeepagentLog.find({ outcome: 'scored_nexus_created' }).lean();
  console.log('Log v2 create riuscite:', v2.length);

  let ok = 0, missingLead = 0, noIdNexus = 0, stillDeferred = 0, esitoNonQualif = 0, notVoiceBot = 0;
  const problems = [];

  for (const l of v2) {
    if (!l.matchedLeadId) { missingLead++; continue; }
    const lead = await Lead.findById(l.matchedLeadId).lean();
    if (!lead) { missingLead++; problems.push('lead inesistente ' + l.matchedLeadId); continue; }

    const idMatch = lead.idNexus && String(lead.idNexus) === String(l.matchedIdNexus);
    if (!lead.idNexus) noIdNexus++;
    if (lead.nexusDeferred === true) stillDeferred++;
    if (lead.esito !== 'Lead qualificata') esitoNonQualif++;
    if (lead.appVoiceBot !== true) notVoiceBot++;

    if (lead.idNexus && lead.nexusDeferred !== true && lead.esito === 'Lead qualificata') ok++;
    else problems.push('lead ' + l.matchedLeadId + ' idNexus=' + lead.idNexus + ' deferred=' + lead.nexusDeferred + ' esito=' + lead.esito + ' punteggio=' + lead.punteggio + ' idMatch=' + idMatch);
  }

  console.log('\n=== Stato DB delle 158 lead create dal v2 ===');
  console.log('  OK (idNexus set + nexusDeferred=false + Lead qualificata):', ok);
  console.log('  Senza idNexus:', noIdNexus);
  console.log('  Ancora nexusDeferred=true:', stillDeferred);
  console.log('  esito != "Lead qualificata":', esitoNonQualif);
  console.log('  appVoiceBot != true:', notVoiceBot);
  console.log('  Lead mancanti nel DB:', missingLead);

  if (problems.length) {
    console.log('\n=== Anomalie (' + problems.length + ') ===');
    problems.slice(0, 30).forEach(p => console.log('  ' + p));
  }

  // Quante lead Meta Web sono ancora differite e in attesa (nexusDeferred=true, senza idNexus)
  const pendingDeferred = await Lead.countDocuments({ nexusDeferred: true, idNexus: { $in: [null, ''] } });
  const deferredTotal = await Lead.countDocuments({ nexusDeferred: true });
  console.log('\n=== Lead ancora differite (per contesto dashboard) ===');
  console.log('  nexusDeferred=true totali:', deferredTotal);
  console.log('  nexusDeferred=true SENZA idNexus (in attesa):', pendingDeferred);

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
