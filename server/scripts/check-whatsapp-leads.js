require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');

(async () => {
  await mongoose.connect(process.env.DATABASE);
  console.log('DB:', mongoose.connection.name, '\n');

  // 1) lead con campagna whatsapp (qualsiasi periodo)
  const waCount = await Lead.countDocuments({ campagna: /whats?app/i });
  console.log('Lead totali con campagna ~ Whatsapp:', waCount);

  // 2) per anno-mese + quanti qualificati / con punteggio / appVoiceBot
  const wa = await Lead.find({ campagna: /whats?app/i })
    .select('dataTimestamp data esito punteggio appVoiceBot summary idLeadChatic last_interaction nexus_lead.micro_fonte').lean();
  const byMonth = {}, esiti = {};
  let withScore = 0, voice = 0, withSummary = 0, qualif = 0;
  for (const l of wa) {
    const d = l.dataTimestamp ? new Date(l.dataTimestamp) : (l.data ? new Date(l.data) : null);
    const k = d && !isNaN(d) ? d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') : 'no-date';
    byMonth[k] = (byMonth[k] || 0) + 1;
    const e = l.esito || '(vuoto)'; esiti[e] = (esiti[e] || 0) + 1;
    if (l.punteggio != null) withScore++;
    if (l.appVoiceBot) voice++;
    if (l.summary) withSummary++;
    if (/qualif/i.test(l.esito || '')) qualif++;
  }
  console.log('\n=== Whatsapp per mese ===');
  Object.keys(byMonth).sort().forEach((k) => console.log('  ' + k + ': ' + byMonth[k]));
  console.log('\n=== Whatsapp: segnali qualifica ===');
  console.log('  con punteggio:', withScore, '| appVoiceBot:', voice, '| con summary:', withSummary, '| esito ~qualif:', qualif);
  console.log('\n=== Whatsapp: distribuzione esito ===');
  Object.keys(esiti).sort((a, b) => esiti[b] - esiti[a]).forEach((e) => console.log('  ' + e + ': ' + esiti[e]));

  // 3) esiste un canale WhatsApp che assegna punteggio? incrocio punteggio vs appVoiceBot
  const score = await Lead.countDocuments({ punteggio: { $ne: null } });
  const scoreNoVoice = await Lead.countDocuments({ punteggio: { $ne: null }, appVoiceBot: { $ne: true } });
  console.log('\n=== Globale ===');
  console.log('Lead con punteggio (tutte):', score, '| di cui NON appVoiceBot:', scoreNoVoice);

  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('ERRORE:', e && e.message || e); process.exit(1); });
