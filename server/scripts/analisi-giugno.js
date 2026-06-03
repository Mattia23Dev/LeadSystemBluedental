require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
function createdAt(l){const d=l.dataTimestamp?new Date(l.dataTimestamp):(l.data?new Date(l.data):null);return d&&!isNaN(d)?d:null;}
const FISSATO=(e)=>e==='fissato'||e==='già fissato';
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const start=new Date(Date.UTC(2026,5,1)); const end=new Date(Date.UTC(2026,5,4)); // 1-3 giugno incluso
  const all=await Lead.find({dataTimestamp:{$gte:start,$lt:end}})
    .select('dataTimestamp data appVoiceBot punteggio nexus_lead.micro_fonte nexus_lead.esito esito').lean();
  const voice=all.filter(l=>l.appVoiceBot).length;
  const score=all.filter(l=>l.punteggio!=null).length;
  const pm=all.filter(l=>l.nexus_lead&&/pre.?meta/i.test(l.nexus_lead.micro_fonte||''));
  console.log('=== GIUGNO 2026 (1-3 giu) ===');
  console.log('Lead totali create: '+all.length);
  console.log('Toccate dal bot (appVoiceBot): '+voice);
  console.log('Qualificate con punteggio: '+score);
  console.log('Prequalifiche PRE-META: '+pm.length);
  const fissati=pm.filter(l=>FISSATO(l.nexus_lead&&l.nexus_lead.esito)).length;
  console.log('  Appuntamenti fissati (Nexus): '+fissati+' ('+(pm.length?((fissati/pm.length)*100).toFixed(1):0)+'%)');
  const sd={};pm.forEach(l=>{sd[l.punteggio]=(sd[l.punteggio]||0)+1;});
  console.log('  Distribuzione punteggio:',JSON.stringify(sd));
  [0,1,2].forEach(p=>{const sub=pm.filter(l=>l.punteggio===p);const f=sub.filter(l=>FISSATO(l.nexus_lead&&l.nexus_lead.esito)).length;console.log('   punteggio '+p+': '+sub.length+' lead, fissati '+f+' ('+(sub.length?((f/sub.length)*100).toFixed(1):0)+'%)');});
  // distribuzione per giorno
  const byDay={};pm.forEach(l=>{const d=createdAt(l);const k=d?d.getUTCDate():'?';byDay[k]=(byDay[k]||0)+1;});
  console.log('  PRE-META per giorno:',JSON.stringify(byDay));
  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
