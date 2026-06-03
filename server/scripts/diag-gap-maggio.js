require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const start=new Date(Date.UTC(2026,4,1)), end=new Date(Date.UTC(2026,5,1));
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const q={dataTimestamp:{$gte:start,$lt:end}};
  const all=await Lead.find(q).select('punteggio idNexus appVoiceBot esito nexus_lead.micro_fonte').lean();
  const scored=all.filter(l=>l.punteggio!=null);
  const scoredNoNexus=scored.filter(l=>!l.idNexus);
  const scoredWithNexusNoTag=scored.filter(l=>l.idNexus && !(l.nexus_lead&&/pre.?meta/i.test(l.nexus_lead.micro_fonte||'')));
  const premeta=all.filter(l=>l.nexus_lead&&/pre.?meta/i.test(l.nexus_lead.micro_fonte||''));
  console.log('=== MAGGIO 2026 (lead create) ===');
  console.log('Qualificate localmente (punteggio set): '+scored.length);
  console.log('  di cui SENZA idNexus (mai inviabili a Nexus): '+scoredNoNexus.length);
  console.log('  di cui CON idNexus ma SENZA tag PRE-META (push fallito/non avvenuto): '+scoredWithNexusNoTag.length);
  console.log('Taggate PRE-META su Nexus: '+premeta.length);
  // stati finali tra le lead di maggio (possibili early-return)
  const finali=all.filter(l=>['Venduto','Lead persa','Non interessato'].includes(l.esito));
  console.log('Lead in stato finale (Venduto/Lead persa/Non interessato): '+finali.length);
  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
