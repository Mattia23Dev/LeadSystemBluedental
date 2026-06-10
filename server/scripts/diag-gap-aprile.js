require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const isPreMeta = l => l.nexus_lead && /pre.?meta/i.test(l.nexus_lead.micro_fonte||'');
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const start=new Date(Date.UTC(2026,3,1)), end=new Date(Date.UTC(2026,4,1));
  const all=await Lead.find({dataTimestamp:{$gte:start,$lt:end}})
    .select('punteggio idNexus esito nexus_lead.micro_fonte').lean();
  const scored=all.filter(l=>l.punteggio!=null);
  console.log('=== APRILE 2026 (create) ===');
  console.log('Qualificate (punteggio):', scored.length);
  console.log('PRE-META:', all.filter(isPreMeta).length);
  console.log('PUNTO 4 - qualificate SENZA idNexus:', scored.filter(l=>!l.idNexus).length);
  console.log('PUSH FALLITO - con idNexus ma senza tag:', scored.filter(l=>l.idNexus && !isPreMeta(l)).length);
  console.log('PUNTO 3 - in stato finale:', all.filter(l=>['Venduto','Lead persa','Non interessato'].includes(l.esito)).length);
  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
