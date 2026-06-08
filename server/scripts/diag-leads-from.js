require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
const Lead = require('../models/lead');

// Utente Meta Web bludental usato dal flusso deepagent
const META_USER = '65d3110eccfb1c0ce51f7492';
// Cutoff: arg ISO opzionale, default 2026-06-08 12:00 ora di Roma (CEST = 10:00 UTC)
const CUTOFF = new Date(process.argv[2] || '2026-06-08T10:00:00.000Z');

(async () => {
  await mongoose.connect(process.env.DATABASE);

  console.log('=== LEAD entrate da ' + CUTOFF.toISOString() + ' (>= 12:00 ora Roma) ===\n');

  const all = await Lead.find({
    utente: META_USER,
    dataTimestamp: { $gte: CUTOFF },
  }).sort({ dataTimestamp: 1 })
    .select('nome numeroTelefono idNexus punteggio esito status nexusDeferred dataTimestamp utmCampaign').lean();

  // Classifica per tipologia campagna (utmCampaign = nome campagna Meta)
  const tipo = (l) => {
    const n = (l.utmCampaign || '').toLowerCase();
    if (n.includes('gold')) return 'GOLD';
    if (n.includes('ambra')) return 'AMBRA';
    if (n.includes('meta web')) return 'META WEB';
    if (n.includes('allineatori')) return 'ALLINEATORI';
    if (n.includes('grandi riabilitazioni')) return 'GRANDI RIAB.';
    return 'ALTRO';
  };

  const counts = {};
  all.forEach(l => { const t = tipo(l); counts[t] = (counts[t] || 0) + 1; });
  console.log('Tutte le lead da cutoff (utente Meta): ' + all.length);
  console.log('Per tipologia campagna: ' + JSON.stringify(counts) + '\n');

  // SOLO Meta Web: il flusso differito riguarda esclusivamente queste.
  const leads = all.filter(l => tipo(l) === 'META WEB');
  console.log('=> Analizzo SOLO META WEB: ' + leads.length + ' lead\n');

  let inviate = 0, attesaQual = 0, qualSenzaNexus = 0;
  for (const l of leads) {
    const ts = l.dataTimestamp ? new Date(l.dataTimestamp).toISOString() : '(no ts)';
    // ultimo log v2/v1 per la lead
    const last = await DeepagentLog.findOne({ matchedLeadId: l._id })
      .sort({ receivedAt: -1 }).lean();
    const logInfo = last
      ? ('ep=' + (last.endpoint || '-').replace('/webhook-n8n-bludental', 'v1').replace('v1-v2', 'v2')
         + ' outcome=' + last.outcome)
      : 'nessun log';

    let stato;
    if (l.idNexus && !l.nexusDeferred) { stato = 'INVIATA a Nexus'; inviate++; }
    else if (l.nexusDeferred && l.punteggio != null) { stato = 'QUALIF. ma NON su Nexus (!)'; qualSenzaNexus++; }
    else if (l.nexusDeferred) { stato = 'in attesa (no punteggio)'; attesaQual++; }
    else { stato = 'altro'; }

    console.log('  ' + ts
      + ' | ' + (l.nome || '-')
      + ' | tel=' + l.numeroTelefono
      + '\n      campagna=' + (l.utmCampaign || '-')
      + '\n      stato=' + stato
      + ' | idNexus=' + (l.idNexus || '-')
      + ' | deferred=' + l.nexusDeferred
      + ' | punt=' + (l.punteggio != null ? l.punteggio : '-')
      + ' | esito=' + (l.esito || '-')
      + '\n      ultimoLog: ' + logInfo);
  }

  console.log('\n--- RIEPILOGO ---');
  console.log('  INVIATE a Nexus (idNexus + deferred=false): ' + inviate);
  console.log('  In attesa qualifica (deferred, no punteggio): ' + attesaQual);
  console.log('  QUALIFICATE ma NON ancora su Nexus (da indagare): ' + qualSenzaNexus);

  // Log v2 dal cutoff per outcome
  const v2 = await DeepagentLog.aggregate([
    { $match: { endpoint: '/webhook-n8n-bludental-v2', receivedAt: { $gte: CUTOFF } } },
    { $group: { _id: '$outcome', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  console.log('\n--- Log endpoint v2 dal cutoff per outcome ---');
  if (!v2.length) console.log('  (nessun log v2)');
  v2.forEach(o => console.log('  ' + (o._id || '(null)') + ': ' + o.n));

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('ERR', (e && e.message) || e); process.exit(1); });
