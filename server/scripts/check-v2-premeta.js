require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const v2 = await DeepagentLog.find({ outcome: 'scored_nexus_created' }).sort({ receivedAt: 1 }).lean();
  console.log('Invii v2 (scored_nexus_created):', v2.length);

  const dist = (label, fn) => {
    const m = {};
    v2.forEach(s => { const k = fn(s); const kk = (k === undefined || k === null || k === '') ? '(vuoto)' : String(k); m[kk] = (m[kk] || 0) + 1; });
    console.log('\n=== ' + label + ' ===');
    Object.keys(m).sort().forEach(k => console.log('  ' + k + ': ' + m[k]));
  };

  // punteggio (dal payload effettivamente inviato)
  dist('Punteggio inviato (nexusPayload.punteggio)', s => (s.nexusPayload || {}).punteggio);
  // possibili campi "divisione"
  dist('lead_status', s => (s.nexusPayload || {}).lead_status);
  dist('macro_fonte', s => (s.nexusPayload || {}).macro_fonte);
  dist('micro_fonte', s => (s.nexusPayload || {}).micro_fonte);
  dist('sorgente', s => (s.nexusPayload || {}).sorgente);
  dist('trattamento', s => (s.nexusPayload || {}).trattamento);
  dist('citta', s => (s.nexusPayload || {}).citta);

  // Incrocio punteggio x lead_status
  console.log('\n=== Punteggio x lead_status ===');
  const cross = {};
  v2.forEach(s => {
    const p = String((s.nexusPayload || {}).punteggio);
    const st = String((s.nexusPayload || {}).lead_status || '(vuoto)');
    const key = p + ' | ' + st;
    cross[key] = (cross[key] || 0) + 1;
  });
  Object.keys(cross).sort().forEach(k => console.log('  ' + k + ': ' + cross[k]));

  // due esempi completi
  console.log('\n=== Esempi payload completi v2 ===');
  [v2[0], v2[v2.length - 1]].filter(Boolean).forEach(s => {
    console.log('\n  ' + new Date(s.receivedAt).toISOString() + ' | punteggio=' + (s.nexusPayload||{}).punteggio);
    console.log('  ' + JSON.stringify(s.nexusPayload, null, 0));
  });

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
