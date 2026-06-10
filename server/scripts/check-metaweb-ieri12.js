require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');
const Lead = require('../models/lead');

// Utente Meta Web bludental usato dal flusso deepagent
const META_USER = '65d3110eccfb1c0ce51f7492';
// Cutoff: arg ISO opzionale, default 2026-06-08 12:00 ora di Roma (CEST = 10:00 UTC)
const CUTOFF = new Date(process.argv[2] || '2026-06-08T10:00:00.000Z');
const NOW = new Date();
const H24 = 24 * 60 * 60 * 1000;

const tipo = (l) => {
  const n = (l.utmCampaign || '').toLowerCase();
  if (n.includes('gold')) return 'GOLD';
  if (n.includes('ambra')) return 'AMBRA';
  if (n.includes('meta web')) return 'META WEB';
  if (n.includes('allineatori')) return 'ALLINEATORI';
  if (n.includes('grandi riabilitazioni')) return 'GRANDI RIAB.';
  return 'ALTRO';
};

const fmt = (d) => d ? new Date(d).toISOString() : '(no ts)';
const ageH = (d) => d ? ((NOW - new Date(d)) / 3600000) : null;

(async () => {
  await mongoose.connect(process.env.DATABASE);

  console.log('=== CHECK META WEB da ' + CUTOFF.toISOString() + ' (>= 12:00 ora Roma del giorno prima) ===');
  console.log('    Ora attuale: ' + NOW.toISOString() + ' (cutoff 24h cron = create prima di ' + new Date(NOW - H24).toISOString() + ')\n');

  const all = await Lead.find({
    utente: META_USER,
    dataTimestamp: { $gte: CUTOFF },
  }).sort({ dataTimestamp: 1 })
    .select('nome numeroTelefono idNexus punteggio esito status nexusDeferred dataTimestamp utmCampaign').lean();

  const counts = {};
  all.forEach(l => { const t = tipo(l); counts[t] = (counts[t] || 0) + 1; });
  console.log('Tutte le lead da cutoff (utente Meta): ' + all.length);
  console.log('Per tipologia campagna: ' + JSON.stringify(counts) + '\n');

  const leads = all.filter(l => tipo(l) === 'META WEB');
  console.log('=> Analizzo SOLO META WEB: ' + leads.length + ' lead\n');

  const buckets = {
    qualPreMeta: [],   // qualificata -> PRE-META (idNexus + punteggio)
    cronMetaWeb: [],   // NON qualificata -> inviata dal cron come META WEB (idNexus + punteggio null)
    attesaSotto24: [], // deferred, no punteggio, eta < 24h: ancora nella finestra, normale
    scaduteNonInviate: [], // deferred, no idNexus, eta >= 24h: il cron NON le ha (ancora) smaltite (!)
    qualSenzaNexus: [],    // deferred ma con punteggio: v2 create fallita, in attesa recupero cron
    altro: [],
  };

  for (const l of leads) {
    const haPunteggio = l.punteggio != null;
    const inviata = l.idNexus && !l.nexusDeferred;
    const eta = ageH(l.dataTimestamp);
    if (inviata && haPunteggio) buckets.qualPreMeta.push(l);
    else if (inviata && !haPunteggio) buckets.cronMetaWeb.push(l);
    else if (l.nexusDeferred && haPunteggio) buckets.qualSenzaNexus.push(l);
    else if (l.nexusDeferred && eta != null && eta >= 24) buckets.scaduteNonInviate.push(l);
    else if (l.nexusDeferred) buckets.attesaSotto24.push(l);
    else buckets.altro.push(l);
  }

  const dump = (label, arr, showPunt) => {
    console.log('\n--- ' + label + ': ' + arr.length + ' ---');
    arr.forEach(l => {
      const eta = ageH(l.dataTimestamp);
      console.log('  ' + fmt(l.dataTimestamp) + ' (' + (eta != null ? eta.toFixed(1) + 'h' : '?') + ')'
        + ' | ' + (l.nome || '-')
        + ' | tel=' + l.numeroTelefono
        + ' | idNexus=' + (l.idNexus || '-')
        + (showPunt ? ' | punt=' + (l.punteggio != null ? l.punteggio : '-') : '')
        + ' | esito=' + (l.esito || '-'));
    });
  };

  // Verifica incrociata: per le presunte "cron META WEB" controllo che non esista un log v2 con punteggio
  // (se esistesse, sarebbe stata qualificata e il punteggio dovrebbe esserci sulla lead).
  for (const l of buckets.cronMetaWeb) {
    const scoredLog = await DeepagentLog.findOne({
      matchedLeadId: l._id, punteggio: { $ne: null },
    }).lean();
    l._hadScoredLog = !!scoredLog;
  }

  console.log('\n================ RIEPILOGO ================');
  console.log('  [A] QUALIFICATE -> PRE-META (idNexus + punteggio):        ' + buckets.qualPreMeta.length);
  console.log('  [B] NON qualificate -> CRON META WEB dopo 24h (no punt.): ' + buckets.cronMetaWeb.length);
  console.log('  [C] In attesa qualifica, <24h (normale):                  ' + buckets.attesaSotto24.length);
  console.log('  [D] SCADUTE >24h ancora NON inviate dal cron (!):         ' + buckets.scaduteNonInviate.length);
  console.log('  [E] Qualificate ma deferred (v2 create fallita) (!):      ' + buckets.qualSenzaNexus.length);
  console.log('  [.] altro:                                                ' + buckets.altro.length);

  dump('[A] QUALIFICATE -> PRE-META', buckets.qualPreMeta, true);
  dump('[B] NON qualificate -> inviate dal CRON come META WEB', buckets.cronMetaWeb, true);
  const anom = buckets.cronMetaWeb.filter(l => l._hadScoredLog);
  if (anom.length) {
    console.log('   ! ATTENZIONE: ' + anom.length + ' delle [B] avevano un log con punteggio ma punteggio non sulla lead — verificare:');
    anom.forEach(l => console.log('     - ' + (l.nome||'-') + ' tel=' + l.numeroTelefono + ' idNexus=' + l.idNexus));
  }
  dump('[C] In attesa qualifica (<24h, normale)', buckets.attesaSotto24, false);
  if (buckets.scaduteNonInviate.length) dump('[D] SCADUTE >24h NON inviate (CRON DA INDAGARE)', buckets.scaduteNonInviate, true);
  if (buckets.qualSenzaNexus.length) dump('[E] Qualificate ma deferred (v2 create fallita)', buckets.qualSenzaNexus, true);

  // Log endpoint v2 dal cutoff per outcome (controllo lato webhook qualifiche)
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
