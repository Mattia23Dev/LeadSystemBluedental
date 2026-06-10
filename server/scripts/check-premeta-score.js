require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

const SEND_OUTCOMES = ['scored_nexus_ok', 'scored_nexus_created'];

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const sends = await DeepagentLog.find({ outcome: { $in: SEND_OUTCOMES } })
    .sort({ receivedAt: 1 }).lean();
  console.log('Invii PRE-META riusciti:', sends.length);

  // Distribuzione del punteggio registrato nel log
  const byScore = {};
  sends.forEach(s => {
    const k = (s.punteggio === undefined || s.punteggio === null || s.punteggio === '') ? '(vuoto)' : String(s.punteggio);
    byScore[k] = (byScore[k] || 0) + 1;
  });
  console.log('\n=== Distribuzione punteggio (campo log) ===');
  Object.keys(byScore).sort().forEach(k => console.log('  ' + k + ': ' + byScore[k]));

  // Quanti hanno il punteggio dentro il nexusPayload (cio' che e' stato realmente spedito)?
  // Cerco la chiave del punteggio nel payload inviato a Nexus, qualunque sia il nome.
  let withScoreInPayload = 0;
  let payloadKeysSeen = {};
  const sample = [];
  sends.forEach(s => {
    const np = s.nexusPayload || {};
    // raccogli le chiavi viste per capire dove sta il punteggio
    Object.keys(np).forEach(k => { payloadKeysSeen[k] = (payloadKeysSeen[k] || 0) + 1; });
    const flat = JSON.stringify(np).toLowerCase();
    const hasScore = flat.includes('punteggio') || flat.includes('score') || flat.includes('quality');
    if (hasScore) withScoreInPayload++;
    if (sample.length < 6) sample.push(s);
  });
  console.log('\n=== Punteggio dentro nexusPayload ===');
  console.log('  Invii con riferimento a punteggio/score nel payload inviato:', withScoreInPayload, '/', sends.length);

  console.log('\n=== Chiavi presenti nei nexusPayload (quante volte) ===');
  Object.keys(payloadKeysSeen).sort().forEach(k => console.log('  ' + k + ': ' + payloadKeysSeen[k]));

  console.log('\n=== Esempi (punteggio log -> nexusPayload) ===');
  sample.forEach(s => {
    console.log('\n  ' + new Date(s.receivedAt).toISOString() + ' | ' + s.outcome + ' | tel=' + s.userPhone + ' | punteggio(log)=' + s.punteggio);
    console.log('    nexusPayload: ' + JSON.stringify(s.nexusPayload));
  });

  // Coerenza: invii dove il punteggio nel log e' vuoto ma outcome e' "scored_*"
  const emptyScore = sends.filter(s => s.punteggio === undefined || s.punteggio === null || s.punteggio === '');
  console.log('\n=== Invii con punteggio VUOTO nel log (anomalia) ===', emptyScore.length);

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
