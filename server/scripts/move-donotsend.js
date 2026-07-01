/*
 * ONE-SHOT: copia lo storico dei grezzi SENZA CAMPAGNA (name vuoto/null — form 02_BS_* via
 * Zapier) in lead_donot_send (record Lead-shaped) e li marca assigned=true in LeadFacebook
 * (NON li rimuove). Sblocca subito l'assegnazione delle lead buone.
 * DRY-RUN di default.  Commit:  node scripts/move-donotsend.js --commit
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const LeadFacebook = require('../models/leadFacebook');
const LeadDoNotSend = require('../models/leadDoNotSend');
const { spostaInDoNotSend, buildDoNotSendDoc } = require('../helpers/doNotSend');

const COMMIT = process.argv.includes('--commit');
const getv = (fd, n) => { const f = (fd || []).find(x => x && x.name === n); return f && f.values && f.values[0]; };

(async () => {
  await mongoose.connect(process.env.DATABASE);
  console.log(COMMIT ? '*** COMMIT: copio in lead_donot_send e marco assigned=true (NO rimozione) ***' : '--- DRY RUN (nessuna scrittura) ---');

  const q = {
    $or: [{ assigned: false }, { assigned: { $exists: false } }],
    name: { $not: { $regex: /\S/ } }, // name vuoto/null/solo-spazi
  };
  const totale = await LeadFacebook.countDocuments(q);
  console.log('Grezzi non assegnati SENZA campagna:', totale);

  const sample = await LeadFacebook.find(q).limit(3).lean();
  console.log('\nEsempio record Lead-shaped che verra\' salvato:');
  if (sample[0]) console.log(JSON.stringify(buildDoNotSendDoc(sample[0], 'no_campaign_attribution'), null, 1));

  if (!COMMIT) { console.log('\n(DRY RUN — rilancia con --commit)'); await mongoose.disconnect(); process.exit(0); }

  let mossi = 0, err = 0;
  const cursor = LeadFacebook.find(q).cursor();
  for (let l = await cursor.next(); l != null; l = await cursor.next()) {
    if (await spostaInDoNotSend(l, 'no_campaign_attribution')) mossi++; else err++;
    if (mossi % 200 === 0 && mossi) console.log('  ...spostati', mossi);
  }

  const restano = await LeadFacebook.countDocuments(q);
  const inTabella = await LeadDoNotSend.countDocuments({});
  console.log('\n=== FATTO ===');
  console.log('Spostati:', mossi, '| errori:', err, '| ancora senza campagna in LeadFacebook:', restano);
  console.log('Totale in lead_donot_send:', inTabella);

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
