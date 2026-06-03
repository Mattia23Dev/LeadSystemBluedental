require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
function createdAt(l){const d=l.dataTimestamp?new Date(l.dataTimestamp):(l.data?new Date(l.data):null);return d&&!isNaN(d)?d:null;}
function inMonth(d,y,m){return d&&d.getUTCFullYear()===y&&d.getUTCMonth()+1===m;}
const FISSATO = (e)=> e==='fissato' || e==='già fissato';
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  const preMeta = await Lead.find({'nexus_lead.micro_fonte':/pre.?meta/i})
    .select('data dataTimestamp punteggio nexus_lead.esito').lean();
  function cross(label,y,m){
    const set=preMeta.filter(l=>inMonth(createdAt(l),y,m));
    const tot=set.length; if(!tot){console.log(label+': 0');return;}
    const fissati=set.filter(l=>FISSATO(l.nexus_lead&&l.nexus_lead.esito)).length;
    console.log('\n=== '+label+' (tot '+tot+') ===');
    console.log('  Appuntamenti fissati (Nexus): '+fissati+' ('+((fissati/tot)*100).toFixed(1)+'%)');
    [0,1,2].forEach(p=>{
      const sub=set.filter(l=>l.punteggio===p);
      const f=sub.filter(l=>FISSATO(l.nexus_lead&&l.nexus_lead.esito)).length;
      console.log('  punteggio '+p+': '+sub.length+' lead, di cui fissati '+f+' ('+(sub.length?((f/sub.length)*100).toFixed(1):0)+'%)');
    });
  }
  cross('APRILE 2026',2026,4);
  cross('MAGGIO 2026',2026,5);
  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
