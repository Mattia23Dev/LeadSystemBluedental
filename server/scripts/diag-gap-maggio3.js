require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const inMay = d => { if(!d) return false; const x=new Date(d); return !isNaN(x)&&x.getUTCFullYear()===2026&&x.getUTCMonth()===4; };
(async()=>{
  await mongoose.connect(process.env.DATABASE);
  // Tutte le lead qualificate (punteggio set), QUALSIASI data di creazione
  const scored = await Lead.find({punteggio:{$ne:null,$exists:true}})
    .select('punteggio dataTimestamp dataCambiamentoEsito lastModify last_interaction').lean();
  console.log('Totale lead qualificate (storico):', scored.length);

  // Quante hanno i vari campi data popolati
  const hasCambio = scored.filter(l=>l.dataCambiamentoEsito).length;
  console.log('di cui con dataCambiamentoEsito valorizzato:', hasCambio);

  // Qualificate per data di QUALIFICA (dataCambiamentoEsito) a maggio, qualunque creazione
  const scoredInMayByChange = scored.filter(l=>inMay(l.dataCambiamentoEsito));
  console.log('\nQualificate con dataCambiamentoEsito a MAGGIO (per data qualifica):', scoredInMayByChange.length);

  // Confronto creazione vs qualifica
  const createdMay = scored.filter(l=>inMay(l.dataTimestamp));
  console.log('Qualificate CREATE a maggio (per data creazione):', createdMay.length);
  const createdMayChangedMay = createdMay.filter(l=>inMay(l.dataCambiamentoEsito)).length;
  console.log('  di cui anche qualificate a maggio:', createdMayChangedMay);
  const createdMayChangedOther = createdMay.filter(l=>l.dataCambiamentoEsito && !inMay(l.dataCambiamentoEsito)).length;
  console.log('  di cui qualificate in ALTRO mese:', createdMayChangedOther);

  // Esempio: lead create ad aprile ma qualificate a maggio
  const aprCreatedMayScored = scored.filter(l=>{const c=new Date(l.dataTimestamp); return !isNaN(c)&&c.getUTCFullYear()===2026&&c.getUTCMonth()===3 && inMay(l.dataCambiamentoEsito);}).length;
  console.log('\nCreate ad APRILE ma qualificate a MAGGIO (entrano nel conteggio deepagent di maggio, non nel mio):', aprCreatedMayScored);

  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error(e&&e.message||e);process.exit(1);});
