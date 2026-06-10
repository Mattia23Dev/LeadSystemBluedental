require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');

function createdAt(l) {
  const d = l.dataTimestamp ? new Date(l.dataTimestamp) : (l.data ? new Date(l.data) : null);
  return d && !isNaN(d) ? d : null;
}
function pct(n, tot) { return tot ? ((n / tot) * 100).toFixed(1) + '%' : '0%'; }
function isPreMeta(l) { return !!(l.nexus_lead && /pre.?meta/i.test(l.nexus_lead.micro_fonte || '')); }
function isWhatsapp(l) { return /whats?app/i.test(l.campagna || ''); }
function isVoice(l) { return l.appVoiceBot === true || (l.recallAgent && l.recallAgent.recallType > 0); }

// Classifica la FONTE della prequalifica
function fonte(l) {
  const wa = isWhatsapp(l);
  const voice = isVoice(l);
  if (voice && !wa) return 'deepagent (vocale)';
  if (wa && !voice) return 'whatsapp';
  if (wa && voice) return 'entrambi (wa+vocale)';
  return 'altro/non determinata';
}

(async () => {
  await mongoose.connect(process.env.DATABASE);
  console.log('DB:', mongoose.connection.name, '\n');

  // Una "prequalifica" = lead con punteggio assegnato (qualificata da un agente, vocale o chat)
  function report(label, year, month) {
    return (async () => {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      const pre = await Lead.find({
        dataTimestamp: { $gte: start, $lt: end },
        punteggio: { $ne: null },
      }).select('dataTimestamp data appVoiceBot punteggio recallAgent campagna idLeadChatic nexus_lead.micro_fonte').lean();

      console.log('\n======== ' + label + ' ========');
      console.log('Prequalifiche (lead con punteggio) create: ' + pre.length);
      if (!pre.length) return;

      const byFonte = {};
      pre.forEach((l) => { const f = fonte(l); byFonte[f] = (byFonte[f] || 0) + 1; });
      console.log('  --- per FONTE ---');
      Object.keys(byFonte).sort((a, b) => byFonte[b] - byFonte[a])
        .forEach((f) => console.log('    ' + f + ': ' + byFonte[f] + ' (' + pct(byFonte[f], pre.length) + ')'));

      // segnali grezzi (possono sovrapporsi)
      const voice = pre.filter(isVoice).length;
      const wa = pre.filter(isWhatsapp).length;
      const pm = pre.filter(isPreMeta).length;
      const chatic = pre.filter((l) => l.idLeadChatic).length;
      console.log('  --- segnali grezzi (sovrapponibili) ---');
      console.log('    appVoiceBot/recallAgent (vocale): ' + voice + ' (' + pct(voice, pre.length) + ')');
      console.log('    campagna ~ Whatsapp:              ' + wa + ' (' + pct(wa, pre.length) + ')');
      console.log('    idLeadChatic presente:            ' + chatic + ' (' + pct(chatic, pre.length) + ')');
      console.log('    taggata PRE-META su Nexus:        ' + pm + ' (' + pct(pm, pre.length) + ')');
    })();
  }

  await report('APRILE 2026', 2026, 4);
  await report('MAGGIO 2026', 2026, 5);
  await report('GIUGNO 2026', 2026, 6);

  // valori distinti di campagna per le prequalifiche recenti (per capire le etichette reali)
  const recent = await Lead.find({
    dataTimestamp: { $gte: new Date(Date.UTC(2026, 3, 1)) },
    punteggio: { $ne: null },
  }).select('campagna').lean();
  const camp = {};
  recent.forEach((l) => { const c = l.campagna || '(vuoto)'; camp[c] = (camp[c] || 0) + 1; });
  console.log('\n=== campagna delle prequalifiche (apr-giu 2026) ===');
  Object.keys(camp).sort((a, b) => camp[b] - camp[a]).forEach((c) => console.log('  ' + c + ': ' + camp[c]));

  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('ERRORE:', e && e.message || e); process.exit(1); });
