require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const DeepagentLog = require('../models/deepagentLog');

// stessa normalizzazione usata per Nexus
function normalize(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (s.startsWith('+39')) s = s.slice(3);
  else if (s.startsWith('0039')) s = s.slice(4);
  else if (s.startsWith('39') && s.length > 10) s = s.slice(2);
  return s;
}

(async () => {
  await mongoose.connect(process.env.DATABASE);

  const nf = await DeepagentLog.find({ outcome: 'lead_not_found' }).sort({ receivedAt: 1 }).lean();
  console.log('Totale lead_not_found:', nf.length);

  let recuperabili = 0, davveroAssenti = 0;
  const dettaglio = [];
  const formatiTrovati = {};

  for (const g of nf) {
    const phone = g.userPhone || (g.payload && g.payload.user_phone) || '';
    const norm = normalize(phone);
    // cerca QUALSIASI lead il cui numero normalizzato combaci
    const candidates = await Lead.find({
      numeroTelefono: { $regex: norm + '$' }
    }).select('numeroTelefono nome esito idNexus nexusDeferred dataTimestamp utmCampaign').lean();
    const match = candidates.find(c => normalize(c.numeroTelefono) === norm);
    if (match) {
      recuperabili++;
      formatiTrovati[match.numeroTelefono.startsWith('+39') ? '+39...' : (match.numeroTelefono.startsWith('39') ? '39...' : 'nudo')] =
        (formatiTrovati[match.numeroTelefono.startsWith('+39') ? '+39...' : (match.numeroTelefono.startsWith('39') ? '39...' : 'nudo')] || 0) + 1;
      if (dettaglio.length < 20) dettaglio.push({ phone, dbPhone: match.numeroTelefono, nome: match.nome, esito: match.esito, idNexus: match.idNexus || '-', score: g.punteggio });
    } else {
      davveroAssenti++;
      if (dettaglio.length < 20) dettaglio.push({ phone, dbPhone: 'NESSUNA', nome: '-', esito: '-', idNexus: '-', score: g.punteggio });
    }
  }

  console.log('\n=== Esito ===');
  console.log('  Recuperabili (esiste lead con numero normalizzato uguale):', recuperabili);
  console.log('  Davvero assenti (nessuna lead):', davveroAssenti);
  console.log('\n=== Formato del numero in DB per le recuperabili ===');
  Object.keys(formatiTrovati).forEach(k => console.log('  ' + k + ': ' + formatiTrovati[k]));

  console.log('\n=== Quante avevano un punteggio reale (lead persa con score!) ===');
  const conScore = nf.filter(g => g.punteggio != null && g.punteggio !== '' && String(g.punteggio) !== 'null');
  console.log('  lead_not_found CON punteggio:', conScore.length);
  conScore.slice(0, 15).forEach(g => console.log('    ' + new Date(g.receivedAt).toISOString() + ' | tel=' + g.userPhone + ' | punteggio=' + JSON.stringify(g.punteggio)));

  console.log('\n=== Dettaglio (max 20) ===');
  dettaglio.forEach(d => console.log('  bot=' + d.phone + ' | DB=' + d.dbPhone + ' | ' + d.nome + ' | esito=' + d.esito + ' | idNexus=' + d.idNexus + ' | score=' + JSON.stringify(d.score)));

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
