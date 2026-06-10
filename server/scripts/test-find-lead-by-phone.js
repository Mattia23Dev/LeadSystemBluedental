require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/lead');
const DeepagentLog = require('../models/deepagentLog');

// --- replica ESATTA della logica messa in routes/leads.js ---
function generatePhoneVariants(phoneNumber) {
  let variants = [];
  phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
  const isItalianNumber = (number) => {
    if (number.startsWith('+39')) return true;
    if (number.startsWith('39') && number.length == 12) return true;
    return false;
  };
  if (isItalianNumber(phoneNumber)) {
    variants.push(phoneNumber.slice(phoneNumber.startsWith('+39') ? 3 : 2));
    variants.push(phoneNumber.startsWith('+39') ? '39' + phoneNumber.slice(3) : phoneNumber);
    variants.push(phoneNumber.startsWith('+39') ? phoneNumber : '+39' + phoneNumber);
  } else {
    variants.push(phoneNumber);
    variants.push('39' + phoneNumber);
    variants.push('+39' + phoneNumber);
  }
  variants = [...new Set(variants)];
  return variants;
}
async function findLeadByPhone(userId, rawPhone) {
  if (!rawPhone) return null;
  const variants = generatePhoneVariants(String(rawPhone));
  let lead = await Lead.findOne({ utente: userId, numeroTelefono: { $in: variants } }).sort({ dataTimestamp: -1 });
  if (lead) return { lead, via: 'variants' };
  const digits = String(rawPhone).replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (last10.length >= 8) {
    lead = await Lead.findOne({ utente: userId, numeroTelefono: { $regex: last10 + '$' } }).sort({ dataTimestamp: -1 });
    if (lead) return { lead, via: 'fallback' };
  }
  return null;
}

(async () => {
  await mongoose.connect(process.env.DATABASE);
  const UID = '65d3110eccfb1c0ce51f7492';

  const nf = await DeepagentLog.find({ outcome: 'lead_not_found' }).lean();
  console.log('lead_not_found da ritestare:', nf.length);

  let trovate = 0, viaVariants = 0, viaFallback = 0, ancoraNo = 0;
  const ancora = [];
  for (const g of nf) {
    const phone = g.userPhone || (g.payload && g.payload.user_phone) || '';
    const r = await findLeadByPhone(UID, phone);
    if (r) { trovate++; if (r.via === 'variants') viaVariants++; else viaFallback++; }
    else { ancoraNo++; ancora.push(phone); }
  }

  console.log('\n=== Con la NUOVA ricerca ===');
  console.log('  Ora TROVATE:', trovate, '(via varianti=' + viaVariants + ', via fallback=' + viaFallback + ')');
  console.log('  Ancora non trovate:', ancoraNo);
  console.log('  Numeri ancora non trovati:', [...new Set(ancora)].join(', '));

  await mongoose.disconnect(); process.exit(0);
})().catch(e => { console.error('ERRORE:', (e && e.message) || e); process.exit(1); });
