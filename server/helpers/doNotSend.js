// === Gestione lead SENZA CAMPAGNA -> collection lead_donot_send (fix 01/07/2026) ===
// I lead privi di attribuzione campagna (name/adset vuoti), tipicamente dai form Meta
// "02_BS_*" (Volume/Intent) ingeriti via Zapier senza campaign/adset/ad, NON devono essere
// assegnati ne' inviati a Nexus. Vengono convertiti in un record Lead-shaped e salvati nella
// collection separata `lead_donot_send`, e marcati assigned=true in LeadFacebook (restano lì
// per audit ma fuori dalla coda di assegnazione — NON vengono rimossi).
const LeadFacebook = require('../models/leadFacebook');
const LeadDoNotSend = require('../models/leadDoNotSend');
const nodemailer = require('nodemailer');

const BLUDENTAL = '65d3110eccfb1c0ce51f7492';

// True se il grezzo non ha campagna valorizzata (name vuoto/null/solo-spazi).
const isSenzaCampagna = (lead) => !lead || !lead.name || String(lead.name).trim() === '';

// Estrae i campi utente dal fieldData del grezzo (stessa logica dell'assegnazione).
function estraiUserData(fieldData) {
  const u = { first_name: '', email: '', phone_number: '', trattamento: '', città: '', quando: '', consent_marketing: '' };
  for (const field of (fieldData || [])) {
    const v = field && field.values && field.values[0];
    if (field.name === 'full_name') u.first_name = v || '';
    else if (field.name === 'email' || field.name === 'e-mail') u.email = v || '';
    else if (field.name === 'phone_number') u.phone_number = v || '';
    else if (field.name === 'seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni' || field.name === 'tipo_di_trattamento_' || field.name === 'quanti_denti_desideri_sostituire?') u.trattamento = (v || '').replace(/_/g, ' ');
    else if (field.name === 'seleziona_il_centro_più_vicino_a_te') u.città = (v || '').replace(/_/g, ' ');
    else if (field.name === 'quando_preferiresti_essere_contattata?_' || field.name === 'in_che_tempistiche?') u.quando = v || '';
    else if (field.name === 'acconsenti_al_trattamento_dei_tuoi_dati_personali_per_essere_contattato?') u.consent_marketing = v;
  }
  return u;
}

// Costruisce il documento Lead-shaped da salvare in lead_donot_send.
function buildDoNotSendDoc(raw, reason) {
  const ud = estraiUserData(raw.fieldData);
  const now = new Date();
  return {
    data: now.toString(),
    dataTimestamp: now,
    nome: ud.first_name,
    email: ud.email,
    numeroTelefono: ud.phone_number,
    campagna: 'Social',
    città: ud.città || '',
    trattamento: ud.trattamento || 'Implantologia a carico immediato',
    esito: 'Da contattare',
    orientatori: null,
    utente: BLUDENTAL,
    note: '',
    fatturato: '',
    quando: ud.quando || '',
    consent_marketing: ud.consent_marketing,
    tentativiChiamata: '0',
    giàSpostato: false,
    utmContent: raw.annunci || '',
    utmAdset: raw.adsets || '',
    utmCampaign: raw.name || '',
    // metadati
    metaLeadId: raw.id,
    reason: reason || 'no_campaign_attribution',
    movedAt: now,
    fieldDataRaw: raw.fieldData,
  };
}

// Copia UN grezzo in lead_donot_send (idempotente su metaLeadId) e lo marca assigned=true in
// LeadFacebook (resta lì per audit, ma fuori dalla coda di assegnazione — NON viene rimosso).
async function spostaInDoNotSend(raw, reason) {
  try {
    const doc = raw.toObject ? raw.toObject() : raw;
    await LeadDoNotSend.updateOne(
      { metaLeadId: doc.id },
      { $setOnInsert: buildDoNotSendDoc(doc, reason) },
      { upsert: true }
    );
    if (doc._id) await LeadFacebook.updateOne({ _id: doc._id }, { $set: { assigned: true } });
    return true;
  } catch (e) {
    console.error('[lead_donot_send] errore spostamento', raw && raw.id, ':', (e && e.message) || e);
    return false;
  }
}

// Sweep: sposta in blocco i grezzi non assegnati e senza campagna. Usato dal cron e dal one-shot.
async function spostaLeadSenzaCampagna(limit = 500) {
  try {
    const q = {
      $or: [{ assigned: false }, { assigned: { $exists: false } }],
      name: { $not: { $regex: /\S/ } }, // name vuoto/null/solo-spazi
    };
    const candidati = await LeadFacebook.find(q).limit(limit);
    if (!candidati.length) return 0;
    let mossi = 0;
    const esempi = [];
    for (const l of candidati) {
      const getv = (n) => { const f = (l.fieldData || []).find(x => x && x.name === n); return f && f.values && f.values[0]; };
      if (esempi.length < 15) esempi.push({ id: l.id, phone: getv('phone_number'), email: getv('email') });
      if (await spostaInDoNotSend(l, 'no_campaign_attribution')) mossi++;
    }
    console.log(`[lead_donot_send] spostati ${mossi} lead senza campagna`);
    if (mossi > 0) await avvisaDoNotSend(mossi, esempi);
    return mossi;
  } catch (e) {
    console.error('[lead_donot_send] errore sweep:', (e && e.message) || e);
    return 0;
  }
}

// === ALERT email (batch + throttle: max 1 ogni 6h) ===
const ALERT_TO = 'mattia.noris@funnelconsulting.it';
const ALERT_INTERVALLO_MS = 6 * 60 * 60 * 1000;
let alertUltimoInvio = 0;

async function avvisaDoNotSend(totale, esempi) {
  try {
    const ora = Date.now();
    if (ora - alertUltimoInvio < ALERT_INTERVALLO_MS) return; // throttle
    if (!process.env.EMAIL_GMAIL || !process.env.PASS_GMAIL) {
      console.error('[ALERT do_not_send] credenziali email mancanti, salto invio'); return;
    }
    alertUltimoInvio = ora;
    const transporter = nodemailer.createTransport({
      service: 'gmail', auth: { user: process.env.EMAIL_GMAIL, pass: process.env.PASS_GMAIL },
    });
    const righe = (esempi || []).slice(0, 15)
      .map(s => `metaLeadId ${s.id || '(n/d)'} — tel ${s.phone || '(n/d)'} — ${s.email || '(n/d)'}`).join('<br/>');
    await transporter.sendMail({
      from: process.env.EMAIL_GMAIL,
      to: ALERT_TO,
      subject: `[Lead System] ${totale} lead senza campagna spostati in lead_donot_send`,
      html: `
        <p>Ciao Mattia,</p>
        <p>Sono stati spostati <strong>${totale}</strong> lead in <strong>lead_donot_send</strong> perche' privi di
        attribuzione campagna (name/adset vuoti). NON vengono assegnati ne' inviati a Nexus.</p>
        <p><strong>Origine nota:</strong> form Meta <strong>02_BS_*</strong> (Volume/Intent) ingeriti via Zapier senza campaign/adset/ad.</p>
        <p>Esempi (max 15):<br/>${righe}</p>
        <p style="color:#888;font-size:12px">Avviso automatico, max 1 ogni 6 ore.</p>
      `,
    });
    console.log(`[ALERT do_not_send] email inviata a ${ALERT_TO} (${totale})`);
  } catch (e) {
    console.error('[ALERT do_not_send] errore invio email:', (e && e.message) || e);
  }
}

module.exports = {
  isSenzaCampagna,
  estraiUserData,
  buildDoNotSendDoc,
  spostaInDoNotSend,
  spostaLeadSenzaCampagna,
  avvisaDoNotSend,
};
