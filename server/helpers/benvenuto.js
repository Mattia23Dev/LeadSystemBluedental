/**
 * Messaggio di benvenuto WhatsApp alle lead Meta Bludental che NON passano dal qualificatore
 * (GOLD, AMBRA, ALLINEATORI): oggi vanno dirette a Nexus e il paziente non riceve nulla finche'
 * il contact center non lo chiama. Con questo flusso riceve subito un template di benvenuto.
 *
 * Stesso connector e stessa chiave dei reminder (Samuel, 21/09/2026): cambia solo il flow_id.
 *
 *   POST {REMINDER_API_URL}
 *   X-API-Key: {REMINDER_API_KEY}
 *   { project_id, name, surname, phone, email, source, flow_id: BENVENUTO_FLOW_ID,
 *     dynamicVariables: { lead_id, citta } }
 *
 * Env:
 *   BENVENUTO_ENABLED   default false: finche' non e' "true" non parte nessun messaggio
 *   BENVENUTO_FLOW_ID   flow del template di benvenuto (default: quello comunicato il 21/09/2026)
 *   BENVENUTO_CAMPAGNE  regex sul nome campagna (default gold|ambra|allineatori)
 * La whitelist di test (REMINDER_WHITELIST_ATTIVA) vale anche qui.
 */
const axios = require('axios');
const whitelist = require('../config/test-whitelist');
const q = require('./qualificatore');

const ENABLED = String(process.env.BENVENUTO_ENABLED || 'false').toLowerCase() === 'true';
const FLOW_ID = process.env.BENVENUTO_FLOW_ID || 'e9449155-e5ae-4d31-8172-44636a35cb4e';
const CAMPAGNE = new RegExp(process.env.BENVENUTO_CAMPAGNE || 'gold|ambra|allineatori', 'i');
const API_KEY = process.env.REMINDER_API_KEY || '';
const API_HEADER = process.env.REMINDER_API_HEADER || 'X-API-Key';
const SOURCE = process.env.REMINDER_SOURCE || 'facebook_ad';
const TIMEOUT_MS = Number(process.env.REMINDER_TIMEOUT_MS || 15000);

/** La campagna e' fra quelle che ricevono il benvenuto? */
function campagnaAmmessa(nomeCampagna) {
  return CAMPAGNE.test(String(nomeCampagna || ''));
}

function buildPayload(lead) {
  const { name, surname } = q.splitNome(lead.nome, lead.cognome);
  const email = String(lead.email || '').trim();
  return {
    project_id: q.PROJECT_ID,
    name,
    surname,
    phone: q.toE164(lead.numeroTelefono),
    ...(/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) ? { email } : {}),
    source: SOURCE,
    flow_id: FLOW_ID,
    dynamicVariables: { lead_id: String(lead._id || ''), citta: String(lead.città || '') },
  };
}

/**
 * Manda il benvenuto. Non salva la lead: ritorna l'esito, chi chiama lo annota.
 * @returns {Promise<{ok:boolean, skipped?:boolean, permanente?:boolean, error?:any, status?:number, payload:object}>}
 */
async function inviaBenvenuto(lead, { force = false } = {}) {
  const payload = buildPayload(lead);
  if (!ENABLED && !force) return { ok: false, skipped: true, error: 'BENVENUTO_ENABLED non attivo', payload };
  if (!/^\+\d{8,15}$/.test(payload.phone || '')) return { ok: false, skipped: true, permanente: true, error: `telefono non spedibile (${payload.phone || 'mancante'})`, payload };
  if (!whitelist.isConsentito(payload.phone)) return { ok: false, skipped: true, blocked: true, error: 'numero fuori dalla whitelist di test', payload };
  if (!API_KEY) return { ok: false, skipped: true, error: 'REMINDER_API_KEY non configurata', payload };
  try {
    const res = await axios.post(q.URL, payload, { headers: { 'Content-Type': 'application/json', [API_HEADER]: API_KEY }, timeout: TIMEOUT_MS });
    return { ok: true, status: res.status, data: res.data, payload };
  } catch (error) {
    return { ok: false, permanente: q.erroreDefinitivo(error), error: error?.response?.data || error?.message || String(error), status: error?.response?.status || null, payload };
  }
}

module.exports = { ENABLED, FLOW_ID, campagnaAmmessa, buildPayload, inviaBenvenuto };
