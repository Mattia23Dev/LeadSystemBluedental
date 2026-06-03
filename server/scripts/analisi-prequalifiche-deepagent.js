require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');

function createdAt(l) {
  const d = l.dataTimestamp ? new Date(l.dataTimestamp) : (l.data ? new Date(l.data) : null);
  return d && !isNaN(d) ? d : null;
}
function inMonth(d, year, month) {
  return d && d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
}
function pct(n, tot) { return tot ? ((n / tot) * 100).toFixed(1) + '%' : '0%'; }

(async () => {
  await mongoose.connect(process.env.DATABASE);
  console.log('DB:', mongoose.connection.name, '\n');

  const microFonti = await Lead.distinct('nexus_lead.micro_fonte');
  console.log('Valori distinti nexus_lead.micro_fonte:', JSON.stringify(microFonti));

  const preMeta = await Lead.find({ 'nexus_lead.micro_fonte': /pre.?meta/i })
    .select('data dataTimestamp appVoiceBot punteggio recallAgent campagna esito status idNexus nexus_lead.lead_status nexus_lead.esito')
    .lean();
  console.log('Totale lead PRE-META (storico):', preMeta.length);

  const byMonth = {};
  for (const l of preMeta) {
    const d = createdAt(l);
    const k = d ? d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') : 'no-date';
    byMonth[k] = (byMonth[k] || 0) + 1;
  }
  console.log('\n=== PRE-META per mese di creazione ===');
  Object.keys(byMonth).sort().forEach((k) => console.log('  ' + k + ': ' + byMonth[k]));

  function report(label, year, month) {
    const set = preMeta.filter((l) => inMonth(createdAt(l), year, month));
    const tot = set.length;
    console.log('\n======== ' + label + ' ========');
    console.log('Prequalifiche deepagent (PRE-META) create: ' + tot);
    if (!tot) return;
    const voice = set.filter((l) => l.appVoiceBot).length;
    console.log('  - con appVoiceBot=true:        ' + voice + ' (' + pct(voice, tot) + ')');
    const withScore = set.filter((l) => l.punteggio != null);
    console.log('  - con punteggio assegnato:     ' + withScore.length + ' (' + pct(withScore.length, tot) + ')');
    const scoreDist = {};
    withScore.forEach((l) => { scoreDist[l.punteggio] = (scoreDist[l.punteggio] || 0) + 1; });
    console.log('    distribuzione punteggio:', JSON.stringify(scoreDist));
    const esiti = {};
    set.forEach((l) => { const e = l.esito || '(vuoto)'; esiti[e] = (esiti[e] || 0) + 1; });
    console.log('  - esito (locale):', JSON.stringify(esiti));
    const nexusEsiti = {};
    set.forEach((l) => { const e = (l.nexus_lead && l.nexus_lead.esito) || '(vuoto)'; nexusEsiti[e] = (nexusEsiti[e] || 0) + 1; });
    console.log('  - esito (Nexus): ', JSON.stringify(nexusEsiti));
    const recalls = set.map((l) => (l.recallAgent && l.recallAgent.recallType) || 0);
    const avg = recalls.reduce((a, b) => a + b, 0) / tot;
    console.log('  - tentativi chiamata agente (media): ' + avg.toFixed(2));
  }

  async function broad(label, year, month) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const all = await Lead.find({ dataTimestamp: { $gte: start, $lt: end } })
      .select('appVoiceBot punteggio recallAgent nexus_lead.micro_fonte').lean();
    const voice = all.filter((l) => l.appVoiceBot).length;
    const score = all.filter((l) => l.punteggio != null).length;
    const premeta = all.filter((l) => l.nexus_lead && /pre.?meta/i.test(l.nexus_lead.micro_fonte || '')).length;
    console.log('[' + label + '] lead totali create=' + all.length + ' | appVoiceBot=' + voice + ' | punteggio=' + score + ' | PRE-META=' + premeta);
  }

  console.log('\n\n############ ANALISI PRINCIPALE (PRE-META) ############');
  report('APRILE 2025', 2025, 4);
  report('MAGGIO 2025', 2025, 5);
  report('APRILE 2026', 2026, 4);
  report('MAGGIO 2026', 2026, 5);

  console.log('\n\n############ CONTESTO: insiemi ampi per mese ############');
  await broad('APRILE 2025', 2025, 4);
  await broad('MAGGIO 2025', 2025, 5);
  await broad('APRILE 2026', 2026, 4);
  await broad('MAGGIO 2026', 2026, 5);

  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('ERRORE:', e && e.message || e); process.exit(1); });
