require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DeepagentLog = require('../models/deepagentLog');

// Tassonomia completa: che valori di punteggio/success/status arrivano da n8n,
// e con che outcome finiscono. Serve a capire come distinguere uno "0 vero"
// da una chiamata completata senza qualifica.
(async () => {
  await mongoose.connect(process.env.DATABASE);

  const norm = (v) => {
    if (v === undefined) return '(missing)';
    if (v === null) return '(null)';
    if (v === '') return '(empty)';
    return JSON.stringify(v);
  };

  const all = await DeepagentLog.find({ source: 'deepagent-v2' }).lean();
  const allV1 = await DeepagentLog.find({ source: 'deepagent' }).lean();
  console.log('Totale log v2:', all.length, '| v1:', allV1.length);

  // 1) Tutti i valori distinti di punteggio_qualifica nel payload n8n (v2)
  const pv = {};
  all.forEach(l => {
    const p = l.payload ? l.payload.punteggio_qualifica : undefined;
    const k = norm(p) + '  [' + typeof p + ']';
    pv[k] = (pv[k] || 0) + 1;
  });
  console.log('\n=== [v2] valori distinti di payload.punteggio_qualifica ===');
  Object.entries(pv).sort((a,b)=>b[1]-a[1]).forEach(([k,n]) => console.log('  ' + n + '\t' + k));

  // 2) Combinazione punteggio x success x status -> conteggio + outcome tipico
  const combo = {};
  all.forEach(l => {
    const p = l.payload ? l.payload.punteggio_qualifica : undefined;
    const key = 'punt=' + norm(p) + ' | success=' + norm(l.success) + ' | status=' + norm(l.status);
    if (!combo[key]) combo[key] = { n: 0, outcomes: {} };
    combo[key].n++;
    combo[key].outcomes[l.outcome] = (combo[key].outcomes[l.outcome] || 0) + 1;
  });
  console.log('\n=== [v2] combinazioni punteggio x success x status ===');
  Object.entries(combo).sort((a,b)=>b[1].n-a[1].n).forEach(([k,v]) => {
    console.log('  ' + v.n + '\t' + k + '  -> ' + JSON.stringify(v.outcomes));
  });

  // 3) Quando il punteggio NON e' vuoto, che valori ha e con che success/status?
  console.log('\n=== [v2] eventi con punteggio_qualifica VALORIZZATO (esempi) ===');
  const scored = all.filter(l => { const p = l.payload && l.payload.punteggio_qualifica; return p !== '' && p !== null && p !== undefined; });
  console.log('  totale valorizzati:', scored.length);
  scored.slice(0, 12).forEach(l => {
    console.log('  punt=' + norm(l.payload.punteggio_qualifica)
      + ' | success=' + norm(l.success) + ' | status=' + norm(l.status)
      + ' | centro=' + norm(l.payload.centro_scelto)
      + ' | outcome=' + l.outcome);
  });

  // 4) Esiste MAI uno 0 esplicito (numero 0 o "0") nel payload?
  const explicitZero = all.filter(l => { const p = l.payload && l.payload.punteggio_qualifica; return p === 0 || p === '0'; });
  console.log('\n=== [v2] eventi con punteggio_qualifica == 0 o "0" (esplicito) ===', explicitZero.length);

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
