require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const FINALI = ['Venduto','Lead persa','Non interessato'];
const isPreMeta = l => l.nexus_lead && /pre.?meta/i.test(l.nexus_lead.micro_fonte||'');
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const start=new Date(Date.UTC(2026,4,1)), end=new Date(Date.UTC(2026,5,1));
  const all=await Lead.find({dataTimestamp:{$gte:start,$lt:end}})
    .select('punteggio idNexus esito appVoiceBot recallAgent recallIds nexus_lead.micro_fonte nexus_lead.esito').lean();
  const scored=all.filter(l=>l.punteggio!=null);
  const premeta=all.filter(isPreMeta);

  console.log('=== MAGGIO 2026 (lead create nel mese) ===');
  console.log('Totale lead create:', all.length);
  console.log('Qualificate (punteggio set):', scored.length);
  console.log('Taggate PRE-META:', premeta.length);

  console.log('\n--- PUNTO 4: senza idNexus ---');
  console.log('Qualificate SENZA idNexus:', scored.filter(l=>!l.idNexus).length);

  console.log('\n--- PUNTO 3: stato finale ---');
  console.log('Lead create a maggio attualmente in stato finale:', all.filter(l=>FINALI.includes(l.esito)).length);
  // distribuzione esiti per validare le stringhe
  const esiti={}; all.forEach(l=>{const e=l.esito||'(vuoto)';esiti[e]=(esiti[e]||0)+1;});
  console.log('Distribuzione esiti (top):', JSON.stringify(Object.entries(esiti).sort((a,b)=>b[1]-a[1]).slice(0,12)));

  console.log('\n--- PUSH NEXUS FALLITO ---');
  console.log('Qualificate CON idNexus ma SENZA tag PRE-META:', scored.filter(l=>l.idNexus && !isPreMeta(l)).length);

  console.log('\n--- SEGNALE DUPLICATI / RICHIAMI (spiega gap senza perdita) ---');
  const withRecallType = scored.filter(l=>l.recallAgent && l.recallAgent.recallType>0).length;
  const recallIdsDist={};
  scored.forEach(l=>{const n=(l.recallIds||[]).length; recallIdsDist[n]=(recallIdsDist[n]||0)+1;});
  const totRecallIds = scored.reduce((s,l)=>s+((l.recallIds||[]).length),0);
  console.log('Qualificate con recallAgent.recallType>0:', withRecallType);
  console.log('Distribuzione n. recallIds per lead qualificata:', JSON.stringify(recallIdsDist));
  console.log('Somma totale recallIds (richiami schedulati):', totRecallIds);
  console.log('=> Se deepagent conta ogni chiamata/richiamo come 1 quality_score, eventi >> lead uniche.');

  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
