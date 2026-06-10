require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const META_USER = '65d3110eccfb1c0ce51f7492';

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const tipo = (l) => ((l.utmCampaign || '').toLowerCase().includes('meta web'));

  // Firma cron META WEB normale: ha campo nexusDeferred (=> flusso nuovo, da 3 giu),
  // deferred=false, idNexus presente, punteggio null. Distinta dal flusso vecchio (no campo deferred).
  const cand = await Lead.find({
    utente: META_USER,
    nexusDeferred: false,
    idNexus: { $nin: [null, ''] },
    punteggio: null,
  }).select('nome numeroTelefono idNexus dataTimestamp utmCampaign nexusDeferred').sort({ dataTimestamp: 1 }).lean();

  const mw = cand.filter(tipo);
  console.log('Lead META WEB con firma "cron normale" (deferred=false, idNexus, punteggio null): ' + mw.length + '\n');
  mw.forEach(l => console.log('  ' + new Date(l.dataTimestamp).toISOString()
    + ' | ' + (l.nome || '-') + ' | tel=' + l.numeroTelefono + ' | idNexus=' + l.idNexus));

  // Inoltre: tutte le differite ancora in sospeso oltre 24h (qualunque data) = arretrato cron
  const cutoff24 = new Date(Date.now() - 24 * 3600 * 1000);
  const pendOld = await Lead.find({
    utente: META_USER,
    nexusDeferred: true,
    idNexus: { $in: [null, ''] },
    dataTimestamp: { $lte: cutoff24 },
  }).select('nome numeroTelefono punteggio dataTimestamp utmCampaign').sort({ dataTimestamp: 1 }).lean();
  const pendMw = pendOld.filter(tipo);
  console.log('\nTOTALE arretrato cron (META WEB deferred >24h senza idNexus, qualunque data): ' + pendMw.length);
  pendMw.forEach(l => console.log('  ' + new Date(l.dataTimestamp).toISOString()
    + ' | ' + (l.nome || '-') + ' | punt=' + (l.punteggio != null ? l.punteggio : '-') + ' | tel=' + l.numeroTelefono));

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('ERR', (e && e.message) || e); process.exit(1); });
