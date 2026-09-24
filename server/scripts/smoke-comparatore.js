// Smoke test dell'ingresso comparatore in produzione con una lead DEMO.
// Manda la lead all'endpoint vero, controlla che sia in coda e che la selezioni il cron Meta Web
// (e non quello delle altre campagne), poi la mette assigned=true: il cron non la prende e non
// arriva ne' al qualificatore ne' a Nexus (a settembre 2026 il cap e' raggiunto: andrebbe dritta).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const LeadFacebook = require('../models/leadFacebook');

const URL = process.env.COMPARATORE_URL || 'https://leadsystembluedental-production.up.railway.app/api/comparatore/lead';
const KEY = process.env.COMPARATORE_API_KEY_TEST;
const CRON_MINUTI = [10, 15, 20, 25, 35, 40, 50, 58];

const post = async (body, key = KEY) => {
  const r = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'x-api-key': key } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};

(async () => {
  if (!KEY) throw new Error('COMPARATORE_API_KEY_TEST mancante');
  // Lontano dai giri dei cron: serve il tempo di neutralizzare la demo prima che la prendano.
  const vicino = () => CRON_MINUTI.some((m) => { const d = (new Date().getMinutes() - m + 60) % 60; return d === 59 || d === 0; });
  while (vicino()) await new Promise((r) => setTimeout(r, 10000));

  await mongoose.connect(process.env.DATABASE);
  const demo = { nome: 'DEMO SMOKE TEST', telefono: '+39 000 0000001', email: 'smoke-test@funnelconsulting.it', citta: 'Milano',
    trattamento: 'Implantologia', canale: 'google', landing: 'A', consenso_privacy: true, assicurazione: 'no' };

  const esiti = [];
  const check = (nome, ok, dett) => { esiti.push([ok ? 'OK ' : 'KO ', nome, dett].join(' | ')); };

  let r = await post(demo, null);            check('senza chiave -> 401', r.status === 401, r.status);
  r = await post(demo, 'sbagliata');         check('chiave errata -> 401', r.status === 401, r.status);
  r = await post({ nome: 'x' });             check('campi mancanti -> 400', r.status === 400, JSON.stringify(r.body?.campi));
  r = await post({ ...demo, consenso_privacy: false }); check('senza consenso -> 400', r.status === 400, JSON.stringify(r.body?.campi));
  const creata = await post(demo);           check('demo valida -> 201', creata.status === 201, JSON.stringify(creata.body));
  const id = creata.body?.id;
  try {
    r = await post(demo);                    check('doppio invio -> 200 stessa id', r.status === 200 && r.body?.id === id, JSON.stringify(r.body));

    const doc = await LeadFacebook.findById(id).lean();
    check('in coda leadfacebooks', !!doc && doc.assigned === false, doc && `${doc.name} | adset ${doc.adsets} | ad ${doc.annunci}`);
    const metaWeb = await LeadFacebook.exists({ _id: id, $or: [{ assigned: false }, { assigned: { $exists: false } }], name: { $regex: /Meta Web|GOOGLE WHITE LABEL/, $options: 'i' } });
    check('la prende il cron Meta Web', !!metaWeb, '');
    const altre = await LeadFacebook.exists({ _id: id, $and: [{ name: { $regex: /\S/ } }, { name: { $not: { $regex: /Meta Web/, $options: 'i' } } },
      { name: { $not: { $regex: /ESTETICA/, $options: 'i' } } }, { name: { $not: { $regex: /GFU/, $options: 'i' } } }, { name: { $not: { $regex: /GOOGLE WHITE LABEL/, $options: 'i' } } }] });
    check('NON la prende il cron altre campagne', !altre, '');
    console.log('fieldData:', JSON.stringify(doc?.fieldData));
  } finally {
    if (id) {
      await LeadFacebook.updateOne({ _id: id }, { $set: { assigned: true, formId: 'comparatore-smoke-test' } });
      const d = await LeadFacebook.findById(id).lean();
      check('demo neutralizzata (assigned=true)', d?.assigned === true, id);
    }
    esiti.forEach((e) => console.log(e));
    await mongoose.disconnect();
  }
})().catch((e) => { console.error(e); process.exit(1); });
