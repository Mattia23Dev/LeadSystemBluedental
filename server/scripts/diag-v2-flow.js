require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
const Lead = require('../models/lead');

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const now = Date.now();
  const since = new Date(now - 3 * 60 * 60 * 1000); // ultime 3h

  console.log('=== DIAGNOSTICA FLUSSO META WEB DIFFERITO (v2) ===');
  console.log('Finestra log: ultime 3h (da ' + since.toISOString() + ')\n');

  // --- 1) Log endpoint v2 ---
  const v2Filter = { endpoint: '/webhook-n8n-bludental-v2' };
  const v2Tot = await DeepagentLog.countDocuments(v2Filter);
  const v2Recent = await DeepagentLog.countDocuments({ ...v2Filter, receivedAt: { $gte: since } });
  console.log('--- [1] DeepagentLog endpoint v2 ---');
  console.log('  Totale v2:', v2Tot, '| ultime 3h:', v2Recent);

  if (v2Tot === 0) {
    console.log('  ATTENZIONE: nessuna chiamata su /webhook-n8n-bludental-v2.');
    console.log('  => Verificare che n8n stia chiamando il nuovo endpoint v2.');
  } else {
    const byOutcome = await DeepagentLog.aggregate([
      { $match: v2Filter },
      { $group: { _id: '$outcome', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]);
    console.log('  Per outcome (totale storico v2):');
    byOutcome.forEach(o => console.log('    ' + (o._id || '(null)') + ': ' + o.n));

    const recents = await DeepagentLog.find(v2Filter).sort({ receivedAt: -1 }).limit(15).lean();
    console.log('\n  Ultimi ' + recents.length + ' log v2:');
    recents.forEach(r => {
      console.log('    ' + new Date(r.receivedAt).toISOString()
        + ' | outcome=' + r.outcome
        + ' | tel=' + r.userPhone
        + ' | punteggio=' + r.punteggio
        + ' | lead=' + (r.matchedLeadId || '-')
        + ' | idNexus=' + (r.matchedIdNexus || '-')
        + ' | nexusPushOk=' + r.nexusPushOk
        + (r.nexusError ? ' | ERR=' + JSON.stringify(r.nexusError).slice(0, 140) : '')
        + (r.handlerError ? ' | handlerErr=' + r.handlerError : ''));
    });

    // Outcome critici del nuovo flusso
    const created = await DeepagentLog.countDocuments({ ...v2Filter, outcome: 'scored_nexus_created' });
    const createFailed = await DeepagentLog.countDocuments({ ...v2Filter, outcome: 'scored_nexus_create_failed' });
    const updOk = await DeepagentLog.countDocuments({ ...v2Filter, outcome: 'scored_nexus_ok' });
    const updFailed = await DeepagentLog.countDocuments({ ...v2Filter, outcome: 'scored_nexus_failed' });
    const noPunt = await DeepagentLog.countDocuments({ ...v2Filter, outcome: 'no_punteggio' });
    const notFound = await DeepagentLog.countDocuments({ ...v2Filter, outcome: 'lead_not_found' });
    const handlerErr = await DeepagentLog.countDocuments({ ...v2Filter, outcome: 'handler_error' });
    console.log('\n  Riepilogo outcome v2:');
    console.log('    CREATE Nexus ok (PRE-META):', created, '| CREATE FALLITA:', createFailed);
    console.log('    UPDATE Nexus ok:', updOk, '| UPDATE FALLITA:', updFailed);
    console.log('    no_punteggio:', noPunt, '| lead_not_found:', notFound, '| handler_error:', handlerErr);
  }

  // --- 2) Stato lead differite ---
  console.log('\n--- [2] Lead Meta Web differite (nexusDeferred) ---');
  const deferredOpen = await Lead.countDocuments({ nexusDeferred: true });
  const deferredNoNexus = await Lead.countDocuments({ nexusDeferred: true, idNexus: { $in: [null, ''] } });
  console.log('  nexusDeferred=true (in attesa):', deferredOpen, '| di cui senza idNexus:', deferredNoNexus);

  const cutoff24 = new Date(now - 24 * 60 * 60 * 1000);
  const scadute = await Lead.countDocuments({
    nexusDeferred: true,
    idNexus: { $in: [null, ''] },
    dataTimestamp: { $lte: cutoff24 },
  });
  console.log('  Differite > 24h ancora senza idNexus (target cron):', scadute);

  const recentDeferred = await Lead.find({ nexusDeferred: true })
    .sort({ dataTimestamp: -1 }).limit(10)
    .select('nome email numeroTelefono idNexus punteggio esito dataTimestamp').lean();
  console.log('\n  Ultime ' + recentDeferred.length + ' lead differite:');
  recentDeferred.forEach(l => {
    console.log('    ' + (l.dataTimestamp ? new Date(l.dataTimestamp).toISOString() : '(no ts)')
      + ' | ' + (l.nome || '-')
      + ' | tel=' + l.numeroTelefono
      + ' | idNexus=' + (l.idNexus || '-')
      + ' | punteggio=' + (l.punteggio != null ? l.punteggio : '-')
      + ' | esito=' + (l.esito || '-'));
  });

  // Lead create v2 -> diventate nexusDeferred=false con idNexus (inviate)
  console.log('\n--- [3] Lead inviate dal flusso v2 (deferred chiuse) ---');
  const inviateRecent = await Lead.find({
    nexusDeferred: false,
    idNexus: { $nin: [null, ''] },
    punteggio: { $ne: null },
    dataTimestamp: { $gte: since },
  }).sort({ dataTimestamp: -1 }).limit(10)
    .select('nome numeroTelefono idNexus punteggio esito dataTimestamp').lean();
  console.log('  Recenti (3h) con punteggio + idNexus:', inviateRecent.length);
  inviateRecent.forEach(l => {
    console.log('    ' + (l.dataTimestamp ? new Date(l.dataTimestamp).toISOString() : '(no ts)')
      + ' | ' + (l.nome || '-')
      + ' | tel=' + l.numeroTelefono
      + ' | idNexus=' + l.idNexus
      + ' | punteggio=' + l.punteggio
      + ' | esito=' + (l.esito || '-'));
  });

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
