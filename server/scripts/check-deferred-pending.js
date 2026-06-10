require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const now = new Date();
  const pending = await Lead.find({ nexusDeferred: true, idNexus: { $in: [null, ''] } })
    .select('dataTimestamp createdAt esito punteggio utmCampaign appVoiceBot numeroTelefono città').lean();
  console.log('Lead differite in attesa (nexusDeferred=true, no idNexus):', pending.length);

  let under24 = 0, over24 = 0;
  const byEsito = {}, byCampaignType = {};
  let oldest = null;
  pending.forEach(l => {
    const ts = l.dataTimestamp ? new Date(l.dataTimestamp) : (l.createdAt ? new Date(l.createdAt) : null);
    const ageH = ts ? (now - ts) / 36e5 : null;
    if (ageH != null && ageH > 24) over24++; else under24++;
    if (ts && (!oldest || ts < oldest)) oldest = ts;
    const e = l.esito || '(vuoto)';
    byEsito[e] = (byEsito[e] || 0) + 1;
    const c = (l.utmCampaign || '').toLowerCase();
    const t = c.includes('meta web') ? 'META WEB' : c.includes('gold') ? 'GOLD' : c.includes('ambra') ? 'AMBRA' : c.includes('allineatori') ? 'ALLINEATORI' : c.includes('grandi riab') ? 'GRANDI RIAB' : '(altro/vuoto)';
    byCampaignType[t] = (byCampaignType[t] || 0) + 1;
  });

  console.log('\n=== Eta ===');
  console.log('  < 24h (normale, in attesa):', under24);
  console.log('  > 24h (il cron 24h dovrebbe averle gia inviate!):', over24);
  console.log('  Lead piu vecchia in attesa:', oldest ? oldest.toISOString() : '-');

  console.log('\n=== Per esito ===');
  Object.keys(byEsito).sort().forEach(k => console.log('  ' + k + ': ' + byEsito[k]));

  console.log('\n=== Per tipologia campagna ===');
  Object.keys(byCampaignType).sort().forEach(k => console.log('  ' + k + ': ' + byCampaignType[k]));

  // campione delle piu vecchie
  const sorted = pending.filter(l => l.dataTimestamp || l.createdAt)
    .sort((a, b) => new Date(a.dataTimestamp || a.createdAt) - new Date(b.dataTimestamp || b.createdAt));
  console.log('\n=== 10 piu vecchie ===');
  sorted.slice(0, 10).forEach(l => {
    const ts = new Date(l.dataTimestamp || l.createdAt);
    console.log('  ' + ts.toISOString() + ' | esito=' + l.esito + ' | punteggio=' + l.punteggio + ' | voiceBot=' + l.appVoiceBot + ' | ' + (l.utmCampaign||'').slice(0,40));
  });

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
