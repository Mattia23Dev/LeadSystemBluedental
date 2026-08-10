/**
 * Adapter verso il servizio esterno "qualificatore" che invia il template WhatsApp
 * di reminder appuntamento e ci restituisce la risposta del paziente.
 *
 * STATO: il contratto dell'API in uscita non e' ancora stato consegnato. Tutto e'
 * pilotato da env, cosi' quando arriva la chiamata definitiva si configura senza
 * toccare il codice (o si adatta solo `buildPayload`).
 *
 *   REMINDER_API_URL      endpoint del qualificatore (se assente: invio disattivato)
 *   REMINDER_API_KEY      opzionale, mandato come header Authorization: Bearer ...
 *   REMINDER_API_HEADER   opzionale, nome header alternativo per la chiave (es. x-api-key)
 *   REMINDER_TEMPLATE     nome/ID del template WhatsApp da usare
 *   REMINDER_CALLBACK_URL URL del nostro webhook che il servizio richiama con la risposta
 *   REMINDER_TIMEOUT_MS   timeout richiesta (default 15000)
 *
 * La risposta del paziente NON arriva qui: arriva sul nostro endpoint
 * POST /webhook-conferma-appuntamento (vedi routes/leads.js).
 */

const axios = require('axios');

const URL = process.env.REMINDER_API_URL || '';
const API_KEY = process.env.REMINDER_API_KEY || '';
const API_HEADER = process.env.REMINDER_API_HEADER || '';
const TEMPLATE = process.env.REMINDER_TEMPLATE || 'reminder_appuntamento';
const CALLBACK_URL = process.env.REMINDER_CALLBACK_URL || '';
const TIMEOUT_MS = Number(process.env.REMINDER_TIMEOUT_MS || 15000);

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

/** Telefono in formato internazionale +39XXXXXXXXXX (best effort). */
function toE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('39')) return `+${digits}`;
  if (digits.startsWith('0039')) return `+${digits.slice(2)}`;
  return `+39${digits.slice(-10)}`;
}

/**
 * Formatta l'ISO 8601 con fuso di Nexus in data/ora leggibile italiana.
 * L'orario memorizzato e' gia' ora locale italiana (offset esplicito +01/+02),
 * quindi si legge direttamente dalla stringa senza riconvertire il fuso.
 */
function formattaItaliano(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return { data: '', ora: '', giorno: '', esteso: '' };
  const [, y, mo, d, hh, mm] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return {
    data: `${d}/${mo}/${y}`,
    ora: `${hh}:${mm}`,
    giorno: GIORNI[dt.getDay()],
    esteso: `${GIORNI[dt.getDay()]} ${Number(d)} ${MESI[Number(mo) - 1]} alle ${hh}:${mm}`,
  };
}

/** Payload inviato al qualificatore. Da adeguare quando arriva il contratto definitivo. */
function buildPayload({ lead, dataOra, nome, telefono, centro, citta, idNexus }) {
  const f = formattaItaliano(dataOra);
  return {
    template: TEMPLATE,
    callback_url: CALLBACK_URL || undefined,
    lead_id: String(lead?._id || ''),
    id_nexus: idNexus || lead?.idNexus || null,
    nome: nome || lead?.nome || '',
    user_phone: toE164(telefono || lead?.numeroTelefono),
    telefono_raw: telefono || lead?.numeroTelefono || '',
    data_ora_appuntamento: dataOra,
    data_appuntamento: f.data,
    ora_appuntamento: f.ora,
    giorno_appuntamento: f.giorno,
    appuntamento_esteso: f.esteso,
    centro: centro || lead?.luogo || null,
    citta: citta || lead?.città || null,
  };
}

/** true se l'adapter e' configurato e puo' inviare davvero. */
function isConfigurato() {
  return !!URL;
}

/**
 * Invia la richiesta di reminder al qualificatore.
 * @returns {Promise<{ok:boolean, skipped?:boolean, data?:any, error?:any, payload:object}>}
 */
async function inviaReminder(args) {
  const payload = buildPayload(args);

  if (!URL) {
    return { ok: false, skipped: true, error: 'REMINDER_API_URL non configurato', payload };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) {
    if (API_HEADER) headers[API_HEADER] = API_KEY;
    else headers.Authorization = `Bearer ${API_KEY}`;
  }

  try {
    const res = await axios.post(URL, payload, { headers, timeout: TIMEOUT_MS });
    return { ok: true, data: res.data, payload };
  } catch (error) {
    return {
      ok: false,
      error: error?.response?.data || error?.message || String(error),
      status: error?.response?.status || null,
      payload,
    };
  }
}

module.exports = { inviaReminder, buildPayload, isConfigurato, toE164, formattaItaliano };
