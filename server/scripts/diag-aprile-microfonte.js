require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const isPreMeta = v => /pre.?meta/i.test(v||'');
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const start=new Date(Date.UTC(2026,3,1)), end=new Date(Date.UTC(2026,4,1));
  const all=await Lead.find({dataTimestamp:{$gte:start,$lt:end}, punteggio:{$ne:null,$exists:true}, idNexus:{$ne:null}})
    .select('idNexus nexus_lead.micro_fonte nexus_sync.lastSyncAt').lean();
  const noTag = all.filter(l=>!(l.nexus_lead && isPreMeta(l.nexus_lead.micro_fonte)));
  console.log('Aprile: qualificate con idNexus =', all.length, '| di cui SENZA tag PRE-META =', noTag.length);
  const dist={}; let mai=0, senzaNexusLead=0;
  noTag.forEach(l=>{
    if(!l.nexus_lead){senzaNexusLead++; return;}
    const v=l.nexus_lead.micro_fonte;
    if(v==null||v===''){mai++; const k='(micro_fonte vuoto)'; dist[k]=(dist[k]||0)+1;}
    else {dist[v]=(dist[v]||0)+1;}
  });
  console.log('Senza nexus_lead sincronizzato affatto:', senzaNexusLead);
  console.log('micro_fonte ATTUALE su Nexus delle "senza PRE-META":');
  Object.entries(dist).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('   '+k+': '+v));
  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
