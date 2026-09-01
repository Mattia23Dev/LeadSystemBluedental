/**
 * Adapter verso il servizio esterno "qualificatore" (prequalifica-ai-workflow) che
 * invia il template WhatsApp di reminder appuntamento e ci restituisce la risposta
 * del paziente.
 *
 * CONTRATTO (Samuel, 11/08/2026; rivisto il 24/08/2026 con il terzo flusso e le
 * variabili dentro `dynamicVariables`):
 *
 *   POST https://prequalifica-ai-workflow-production.up.railway.app/connector/webhook
 *   Content-Type: application/json
 *   X-API-Key: whk_...
 *   {
 *     "project_id": "a819e732-32ba-421f-aa8d-45c28de199d1",
 *     "name": "Mario", "surname": "Rossi",
 *     "phone": "+393331234567", "email": "mario.rossi@example.com",
 *     "source": "facebook_ad",
 *     "flow_id": "<flusso 4 giorni | 2 giorni | 1 giorno>",
 *     "dynamicVariables": {
 *       "orario_visita": "10:00", "data_visita": "24/08/2026",
 *       "lead_id": "<_id LeadSystem>",
 *       "citta_visita": "BOLOGNA", "indirizzo_visita": "VIA EMILIA PONENTE 100"
 *     }
 *   }
 *
 * Cos'e' cambiato il 24/08/2026: le variabili del template non stanno piu' in cima al
 * payload ma dentro `dynamicVariables`; citta' e indirizzo si chiamano `citta_visita` e
 * `indirizzo_visita` (prima `citta_centro` / `indirizzo_centro`) e il nome del centro non
 * serve piu'. La chiave webhook e' stata ruotata: quella vecchia non funziona.
 *
 * Tre flussi distinti, scelti in base a quanto manca all'appuntamento (Rev. 2.0 §3.4):
 *   FLOW_4G -> "flusso 4 giorni"  primo promemoria con richiesta di conferma, a tutti
 *   FLOW_2G -> "flusso 2 giorni"  sollecito, solo a chi non ha ancora risposto
 *   FLOW_1G -> "flusso 1 giorno"  promemoria finale, solo a chi ha confermato
 *
 * La risposta del paziente NON arriva qui: il qualificatore la manda al nostro
 * endpoint POST /api/webhook-conferma-appuntamento (vedi routes/leads.js), che
 * scrive `stato_conferma` su Nexus.
 *
 * Env (i default sono i valori del contratto: in .env va messa solo la chiave):
 *   REMINDER_API_URL      endpoint del qualificatore
 *   REMINDER_API_KEY      chiave webhook (obbligatoria: senza, l'invio e' disattivato)
 *   REMINDER_API_HEADER   header della chiave (default X-API-Key)
 *   REMINDER_PROJECT_ID   project_id del progetto Bludental
 *   REMINDER_FLOW_4G      flow_id del flusso "4 giorni"
 *   REMINDER_FLOW_2G      flow_id del flusso "2 giorni" (sollecito)
 *   REMINDER_FLOW_1G      flow_id del flusso "1 giorno"
 *   REMINDER_SOURCE       valore del campo source (default facebook_ad)
 *   REMINDER_TIMEOUT_MS   timeout richiesta (default 15000)
 *
 * FASE DI TEST: l'invio passa dalla whitelist di config/test-whitelist.js. Finche' e'
 * attiva si scrive solo ai numeri del gruppo di collaudo, qualunque sia il chiamante
 * (cron, CLI manuale, script di test). Vedi REMINDER_WHITELIST_ATTIVA.
 */

const axios = require('axios');
const whitelist = require('../config/test-whitelist');

const URL = process.env.REMINDER_API_URL || 'https://prequalifica-ai-workflow-production.up.railway.app/connector/webhook';
const API_KEY = process.env.REMINDER_API_KEY || '';
const API_HEADER = process.env.REMINDER_API_HEADER || 'X-API-Key';
const PROJECT_ID = process.env.REMINDER_PROJECT_ID || 'a819e732-32ba-421f-aa8d-45c28de199d1';
const FLOW_4G = process.env.REMINDER_FLOW_4G || 'c4e58437-dbe3-4e11-8af0-98de2e9d6710';
const FLOW_2G = process.env.REMINDER_FLOW_2G || 'cade2965-4ad2-4de1-9114-ede44223b786';
const FLOW_1G = process.env.REMINDER_FLOW_1G || '89164730-2545-4615-9d51-b0c3f47a5329';
const SOURCE = process.env.REMINDER_SOURCE || 'facebook_ad';
const TIMEOUT_MS = Number(process.env.REMINDER_TIMEOUT_MS || 15000);

/** Stage -> flow_id. '4g' primo promemoria, '2g' sollecito, '1g' promemoria finale. */
const FLOWS = { '4g': FLOW_4G, '2g': FLOW_2G, '1g': FLOW_1G };

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

/** Telefono in formato internazionale +39XXXXXXXXXX (best effort). */
/** L'email e' valida? Il connector rifiuta il payload se il campo c'e' ma non lo e'. */
function emailValida(email) {
  const e = String(email || '').trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e);
}

/**
 * Il numero e' spedibile? Un numero mutilo fa fallire l'invio con un errore di schema
 * generico, che nei log non dice quale sia il problema. Meglio riconoscerlo prima.
 */
function telefonoValido(e164) {
  const d = String(e164 || '').replace(/\D/g, '');
  if (d.startsWith('39')) return d.length === 12;   // 39 + 10 cifre
  return d.length >= 11 && d.length <= 15;          // E.164, numeri esteri
}

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

/**
 * L'anagrafica arriva quasi sempre in un unico campo `nome` ("Mario Rossi"):
 * il connector vuole name/surname separati, quindi si splitta sul primo spazio.
 */
function splitNome(nomeCompleto, cognomeEsplicito) {
  const intero = String(nomeCompleto || '').trim().replace(/\s+/g, ' ');
  if (cognomeEsplicito) return { name: intero, surname: String(cognomeEsplicito).trim() };
  if (!intero) return { name: '', surname: '' };
  const parti = intero.split(' ');
  if (parti.length === 1) return { name: parti[0], surname: '' };
  return { name: parti[0], surname: parti.slice(1).join(' ') };
}

/**
 * Payload del connector. `stage` sceglie il flusso ('4g' | '2g' | '1g').
 * `centro` e' l'oggetto restituito da config/centri-bludental.variabiliMessaggio():
 * citta' e indirizzo viaggiano come due variabili distinte, perche' i testi Bludental
 * li usano separati ("presso BluDental a [Citta] in [Indirizzo]").
 *
 * Le variabili del template stanno dentro `dynamicVariables`: e' il formato del
 * contratto aggiornato il 24/08/2026, i campi in cima al payload non vengono piu' letti.
 */
function buildPayload({ lead, dataOra, nome, cognome, telefono, email, stage = '4g', source, centro }) {
  const f = formattaItaliano(dataOra);
  const { name, surname } = splitNome(nome ?? lead?.nome, cognome ?? lead?.cognome);
  return {
    project_id: PROJECT_ID,
    name,
    surname,
    phone: toE164(telefono || lead?.numeroTelefono),
    // L'email si manda solo se e' un'email: sui dati veri capita che contenga la citta'
    // ("bari") o sia vuota, e il connector rifiuta l'intero payload.
    ...(emailValida(email || lead?.email) ? { email: String(email || lead.email).trim() } : {}),
    source: source || SOURCE,
    flow_id: FLOWS[stage] || FLOW_4G,
    dynamicVariables: {
      orario_visita: f.ora,
      data_visita: f.data,
      lead_id: String(lead?._id || ''),
      citta_visita: centro?.citta || '',
      indirizzo_visita: centro?.indirizzo || '',
    },
  };
}

/** true se l'adapter e' configurato e puo' inviare davvero. */
function isConfigurato() {
  return !!(URL && API_KEY);
}

/**
 * Invia la richiesta di reminder al qualificatore.
 * @returns {Promise<{ok:boolean, skipped?:boolean, data?:any, error?:any, status?:number, payload:object, stage:string}>}
 */
async function inviaReminder(args = {}) {
  const stage = args.stage || '4g';
  const payload = buildPayload(args);

  // Ultimo cancello prima del paziente: in fase di test si scrive solo al gruppo di
  // collaudo. Sta qui, e non solo nel cron, perche' cosi' nessun chiamante lo aggira.
  if (!telefonoValido(payload.phone)) {
    return {
      ok: false,
      skipped: true,
      stage,
      error: `telefono non spedibile (${payload.phone || 'mancante'})`,
      payload,
    };
  }

  if (!whitelist.isConsentito(payload.phone)) {
    return {
      ok: false,
      skipped: true,
      blocked: true,
      stage,
      error: `numero fuori dalla whitelist di test (${payload.phone || 'telefono mancante'})`,
      payload,
    };
  }

  if (!URL) {
    return { ok: false, skipped: true, stage, error: 'REMINDER_API_URL non configurato', payload };
  }
  if (!API_KEY) {
    return { ok: false, skipped: true, stage, error: 'REMINDER_API_KEY non configurata', payload };
  }

  const headers = { 'Content-Type': 'application/json', [API_HEADER]: API_KEY };

  try {
    const res = await axios.post(URL, payload, { headers, timeout: TIMEOUT_MS });
    return { ok: true, status: res.status, data: res.data, payload, stage };
  } catch (error) {
    return {
      ok: false,
      error: error?.response?.data || error?.message || String(error),
      status: error?.response?.status || null,
      payload,
      stage,
    };
  }
}

module.exports = {
  inviaReminder,
  buildPayload,
  isConfigurato,
  toE164,
  formattaItaliano,
  splitNome,
  FLOWS,
  URL,
  PROJECT_ID,
};
