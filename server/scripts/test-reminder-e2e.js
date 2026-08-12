/**
 * Test END-TO-END del flusso reminder/conferma su una lead di prova reale:
 *
 *   1) crea      -> crea la lead su Mongo e la invia a Nexus (come una lead vera)
 *   2) reminder  -> chiede al qualificatore di mandare il template WhatsApp e
 *                   registra l'invio su Lead.appuntamento.reminder
 *   3) conferma  -> simula la risposta del paziente chiamando il NOSTRO webhook
 *                   (quello che chiamera' il qualificatore), che scrive
 *                   stato_conferma su Nexus
 *   4) stato     -> stampa lead locale, blocco reminder e log delle chiamate ricevute
 *
 * Esempi:
 *   node server/scripts/test-reminder-e2e.js crea --tel 3513257290 --nome Mattia --cognome Test --email mattia@test.com
 *   node server/scripts/test-reminder-e2e.js reminder --stage 4g --data 16/08/2026 --ora 10:30
 *   node server/scripts/test-reminder-e2e.js conferma --risposta si          (--dry per non scrivere su Nexus)
 *   node server/scripts/test-reminder-e2e.js stato
 *
 * Note:
 *   - la lead viene creata DAVVERO su Nexus: usare nome/cognome riconoscibili come test;
 *   - `reminder` funziona anche senza appuntamento in agenda (--data/--ora fittizi),
 *     cosi' si prova il template senza aspettare un'agendazione vera;
 *   - `conferma` per default chiama la produzione (--url per puntare altrove).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const axios = require('axios');
const Lead = require('../models/lead');
const DeepagentLog = require('../models/deepagentLog');
const { saveLeadWithResult, normalizePhoneForNexus, getLeadById } = require('../helpers/nexus');
const { inviaReminder, isConfigurato } = require('../helpers/qualificatore');

const WEBHOOK_BASE = process.env.E2E_WEBHOOK_BASE || 'https://leadsystembluedental-production.up.railway.app';

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') o.dry = true;
    else if (a === '--force') o.force = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
  }
  return o;
}

const DEFAULTS = {
  tel: '3513257290',
  nome: 'Mattia',
  cognome: 'Test',
  email: 'mattia@test.com',
  citta: 'Brescia',
  trattamento: 'Implantologia a carico immediato',
  campagna: 'TEST REMINDER - Meta Web',
};

/** gg/mm/aaaa + hh:mm -> ISO con fuso italiano (lo stesso formato che arriva da Nexus). */
function toIso(data, ora) {
  const m = String(data || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [, d, mo, y] = m;
  const offset = Number(mo) >= 4 && Number(mo) <= 10 ? '+02:00' : '+01:00';
  return `${y}-${mo}-${d}T${ora || '10:00'}:00${offset}`;
}

/** La lead di test: piu' recente con quel numero. */
async function trovaLead(tel) {
  const last10 = String(tel).replace(/\D/g, '').slice(-10);
  return Lead.findOne({ numeroTelefono: { $regex: last10 } }).sort({ dataTimestamp: -1, _id: -1 });
}

// ================================ 1) CREA =================================
async function crea(o) {
  const esistente = await trovaLead(o.tel);
  if (esistente && !o.force) {
    console.log(`Lead di test gia' esistente: ${esistente._id} | idNexus=${esistente.idNexus || '-'} (usa --force per crearne un'altra)`);
    return esistente;
  }

  const lead = new Lead({
    data: new Date(),
    nome: `${o.nome} ${o.cognome}`.trim(),
    cognome: o.cognome,
    email: o.email,
    numeroTelefono: o.tel,
    campagna: 'Social',
    città: o.citta,
    trattamento: o.trattamento,
    esito: 'Da contattare',
    utente: '65d3110eccfb1c0ce51f7492',
    note: 'LEAD DI TEST - flusso reminder appuntamento',
    utmCampaign: o.campagna,
    tentativiChiamata: '0',
    giàSpostato: false,
  });
  await lead.save();
  console.log(`Lead creata su Mongo: ${lead._id}`);

  const payload = {
    nome: lead.nome,
    ragione_sociale: lead.nome,
    email: lead.email,
    telefono: normalizePhoneForNexus(lead.numeroTelefono),
    punteggio: null,
    riassunto_chiamata: null,
    id_lead_leadsystem: String(lead._id),
    note: 'LEAD DI TEST - reminder appuntamento',
    data_appuntamento: null,
    citta: lead.città,
    trattamento: lead.trattamento,
    lead_status: 'Da contattare',
    dettaglio_status_negativo: null,
    numero_tentativi: null,
    macro_fonte: 'Online',
    micro_fonte: 'META WEB',
    campagna: lead.utmCampaign,
    adset: 'TEST',
    ad: 'TEST',
    sorgente: 'Funnel',
  };

  if (o.dry) {
    console.log('DRY: payload Nexus non inviato:', JSON.stringify(payload, null, 2));
    return lead;
  }

  const res = await saveLeadWithResult(payload);
  console.log(`Nexus: ok=${res.ok}`, JSON.stringify(res.data || res.error));
  if (res.ok && res.data?.id) {
    lead.idNexus = res.data.id;
    await lead.save();
    console.log(`idNexus salvato: ${lead.idNexus}`);
  }
  return lead;
}

// ============================== 2) REMINDER ===============================
async function reminder(o) {
  const lead = await trovaLead(o.tel);
  if (!lead) return console.log('Lead di test non trovata: lanciare prima "crea"');

  const app = lead.appuntamento || {};
  // Senza appuntamento in agenda si usa una data fittizia: serve a provare il template.
  const dataOra = app.dataOra || toIso(o.data, o.ora) || toIso(
    (() => { const d = new Date(Date.now() + 4 * 86400000); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })(),
    '10:30'
  );
  const stage = o.stage || '4g';

  console.log(`Lead ${lead._id} | tel=${lead.numeroTelefono} | idNexus=${lead.idNexus || '-'}`);
  console.log(`Appuntamento usato: ${dataOra}${app.dataOra ? ' (da agenda Nexus)' : ' (FITTIZIO: nessun appuntamento in agenda)'} | stage=${stage} | qualificatore=${isConfigurato() ? 'configurato' : 'NON configurato'}`);

  const res = await inviaReminder({
    lead,
    dataOra,
    nome: lead.nome,
    cognome: lead.cognome,
    telefono: lead.numeroTelefono,
    email: lead.email,
    stage,
  });
  console.log('payload:', JSON.stringify(res.payload, null, 2));
  console.log(`ESITO: ok=${res.ok} status=${res.status || '-'}`);
  console.log('risposta:', JSON.stringify(res.data ?? res.error));

  // Si registra l'invio come fa la cron, cosi' il resto del flusso (dedup,
  // chiusura no-risposta, conferma) lavora su dati reali.
  const rem = lead.appuntamento?.reminder || {};
  const esito = res.ok ? 'ok' : (res.skipped ? 'skipped' : 'failed');
  const invii = Array.isArray(rem.invii) ? rem.invii.slice(-9) : [];
  lead.appuntamento = lead.appuntamento || {};
  if (!lead.appuntamento.dataOra) {
    lead.appuntamento.dataOra = dataOra;
    lead.appuntamento.dataOraTs = new Date(dataOra);
  }
  lead.appuntamento.reminder = {
    ...(rem.toObject ? rem.toObject() : rem),
    inviatoAt: new Date(),
    perDataOra: dataOra,
    canale: 'whatsapp',
    stage,
    flowId: res.payload?.flow_id || null,
    connectorLeadId: res.data?.lead_id || null,
    connectorContactId: res.data?.contact_id || null,
    connectorConversationId: res.data?.conversation_id || null,
    esitoInvio: esito,
    errore: res.ok ? null : JSON.stringify(res.error).slice(0, 500),
    tentativi: (rem.tentativi || 0) + 1,
    invii: [...invii, {
      at: new Date(),
      stage,
      flowId: res.payload?.flow_id || null,
      perDataOra: dataOra,
      esito,
      connectorLeadId: res.data?.lead_id || null,
      connectorContactId: res.data?.contact_id || null,
      connectorConversationId: res.data?.conversation_id || null,
    }],
  };
  await lead.save();

  await DeepagentLog.create({
    receivedAt: new Date(),
    endpoint: 'test:reminder-e2e',
    source: 'reminder-appuntamento',
    payload: { stage, dataOra, e2e: true },
    userPhone: lead.numeroTelefono,
    matchedLeadId: lead._id,
    matchedIdNexus: lead.idNexus,
    nexusPayload: res.payload,
    nexusResponse: res.data,
    nexusError: res.error,
    outcome: res.ok ? 'reminder_inviato' : 'reminder_fallito',
  });
  console.log('Invio registrato su Lead.appuntamento.reminder');
}

// ============================== 3) CONFERMA ===============================
async function conferma(o) {
  const lead = await trovaLead(o.tel);
  if (!lead) return console.log('Lead di test non trovata: lanciare prima "crea"');

  const url = `${o.url || WEBHOOK_BASE}/api/webhook-conferma-appuntamento`;
  const body = { lead_id: String(lead._id), risposta: o.risposta || 'si' };
  if (o.dry) body.dry_run = true;

  console.log(`POST ${url}`);
  console.log(JSON.stringify(body, null, 2));
  try {
    const res = await axios.post(url, body, { timeout: 20000 });
    console.log(`HTTP ${res.status}:`, JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log(`HTTP ${e?.response?.status || '-'}:`, JSON.stringify(e?.response?.data || e.message));
  }

  const dopo = await Lead.findById(lead._id).lean();
  console.log('reminder dopo la conferma:', JSON.stringify(dopo?.appuntamento?.reminder, null, 2));
  if (dopo?.idNexus) {
    const nx = await getLeadById(dopo.idNexus).catch((e) => ({ errore: e?.message }));
    const riga = Array.isArray(nx) ? nx[0] : (nx?.data?.[0] || nx?.[0] || nx);
    console.log('su Nexus -> stato_conferma:', riga?.stato_conferma, '| lead_status:', riga?.lead_status, '| campagna:', riga?.campagna);
  }
}

// ================================ 4) STATO ================================
async function stato(o) {
  const lead = await trovaLead(o.tel);
  if (!lead) return console.log('Lead di test non trovata');
  console.log(JSON.stringify({
    _id: String(lead._id), nome: lead.nome, email: lead.email, tel: lead.numeroTelefono,
    idNexus: lead.idNexus, esito: lead.esito, appuntamento: lead.appuntamento,
  }, null, 2));

  const logs = await DeepagentLog.find({ matchedLeadId: lead._id }).sort({ receivedAt: -1 }).limit(10).lean();
  console.log(`\n--- ultimi ${logs.length} log ---`);
  for (const l of logs) {
    console.log(`${l.receivedAt?.toISOString?.() || '-'} | ${l.endpoint} | ${l.outcome} | ${JSON.stringify(l.payload)?.slice(0, 160)}`);
  }
}

// ================================= main ===================================
(async () => {
  const cmd = process.argv[2] || 'stato';
  const o = { ...DEFAULTS, ...parseArgs(process.argv.slice(3)) };
  await mongoose.connect(process.env.DATABASE);
  try {
    if (cmd === 'crea') await crea(o);
    else if (cmd === 'reminder') await reminder(o);
    else if (cmd === 'conferma') await conferma(o);
    else if (cmd === 'stato') await stato(o);
    else console.log('Comandi: crea | reminder | conferma | stato');
  } finally {
    await mongoose.disconnect();
  }
})().catch((e) => { console.error('FAILED:', e?.response?.data || e.message || e); process.exit(1); });
