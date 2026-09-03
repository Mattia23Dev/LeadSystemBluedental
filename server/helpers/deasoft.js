const axios = require('axios');

function extractToken(payload) {
  if (payload == null) return null;
  if (typeof payload === 'object') {
    return payload.access_token || payload.token || payload.jwt || payload.data?.access_token || payload.data?.token || null;
  }
  if (typeof payload === 'string') {
    const s = payload.trim();
    if (!s) return null;
    try {
      const o = JSON.parse(s);
      return extractToken(o);
    } catch {
      // Deasoft a volte risponde con JSON "quasi" valido: "token": VALORE senza virgolette
      const m = s.match(/"token"\s*:\s*"?([A-Za-z0-9\-_=+/]+)"?/i);
      if (m) return m[1].trim();
      if (/^[A-Za-z0-9\-_=+/]+$/.test(s)) return s;
    }
  }
  return null;
}

const DEFAULT_TOKEN_URL = 'https://funnel-1032112960130.europe-west1.run.app/?Type=Token';
const DEFAULT_RESULT_URL = 'https://funnel-1032112960130.europe-west1.run.app/?Type=Result';
// Endpoint per gli esiti post-visita: GET ?Type=EventResult&id_deasoft=...
// Distinto dal vecchio ?Type=Result (che usa id_leadsystem). Vedi mail Marica Ferri (Deasoft)
// 2 lug 2026. Deasoft ha due ambienti sullo stesso schema di URL:
//   beta        https://funnelbeta-1032112960130.europe-west1.run.app
//   produzione  https://funnel-1032112960130.europe-west1.run.app
// Per passare in produzione basta DEASOFT_EVENT_AMBIENTE=prod: il token segue da solo,
// perche' viene chiesto sempre allo stesso host dell'endpoint (vedi tokenUrlDi).
const HOST_BETA = 'https://funnelbeta-1032112960130.europe-west1.run.app';
const HOST_PROD = 'https://funnel-1032112960130.europe-west1.run.app';
const EVENT_AMBIENTE = String(process.env.DEASOFT_EVENT_AMBIENTE || 'beta').toLowerCase();
const DEFAULT_EVENT_RESULT_URL = `${EVENT_AMBIENTE === 'prod' ? HOST_PROD : HOST_BETA}/?Type=EventResult`;

/**
 * L'endpoint del token sullo stesso host dell'endpoint che si sta chiamando.
 *
 * Serve perche' il token di produzione NON vale sul beta e viceversa: l'endpoint
 * risponde `{"status":401,"message":"Not Authorized"}` dentro un HTTP 200, quindi
 * l'errore non salta all'occhio e sembra una risposta vuota. Verificato il 03/09/2026.
 */
function tokenUrlDi(endpointUrl) {
  try {
    return `${new URL(endpointUrl).origin}/?Type=Token`;
  } catch (_) {
    return DEFAULT_TOKEN_URL;
  }
}
exports.tokenUrlDi = tokenUrlDi;

/** "true"/"false" come stringhe, 0/1, booleani veri: si normalizza tutto. */
function boolDi(v) {
  if (v === undefined || v === null || v === '') return null;
  const t = String(v).trim().toLowerCase();
  if (['true', '1', 'si', 'sì', 'yes'].includes(t)) return true;
  if (['false', '0', 'no'].includes(t)) return false;
  return null;
}

function numeroDi(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Gli esiti post-visita, normalizzati. Stesso tracciato per ?Type=Result e
 * ?Type=EventResult: cambia solo la chiave con cui si interroga.
 * Campi verificati il 03/09/2026 sulle risposte reali. I booleani arrivano come
 * stringhe "true"/"false", gli importi come numeri, le date come AAAA-MM-GG.
 *
 * ATTENZIONE su `data_presentato`: su alcuni contatti riporta una data FUTURA anche
 * quando presentato e' false. Da chiarire con Deasoft prima di usarla come "data della
 * visita svolta": sembra contenere il prossimo appuntamento.
 */
function mappaEsiti(payload) {
  const r = Array.isArray(payload) ? (payload[0] || {}) : (payload?.data || payload || {});
  return {
    presentato: boolDi(r.presentato),
    nonPresentato: boolDi(r.non_presentato),
    dataPresentato: r.data_presentato || null,
    preventivato: boolDi(r.preventivato),
    importoPreventivato: numeroDi(r.importo_preventivato),
    preventivoAccettato: boolDi(r.preventivo_accettato),
    preventivoNonAccettato: boolDi(r.preventivo_non_accettato),
    fatturato: boolDi(r.fatturato),
    importoFatturato: numeroDi(r.importo_fatturato),
    dataFissato: r.data_fissato || null,
    rischedulato: numeroDi(r.rischedulato),
    dataRischedulato: r.data_rischedulato || null,
    ultimaModificaEsito: r.data_ultima_modifica_esito || null,
    valore: numeroDi(r.importo_fatturato),
  };
}
exports.mappaEsiti = mappaEsiti;
exports.EVENT_RESULT_URL = process.env.DEASOFT_EVENT_RESULT_URL || DEFAULT_EVENT_RESULT_URL;
exports.EVENT_TOKEN_URL = process.env.DEASOFT_EVENT_TOKEN_URL || tokenUrlDi(exports.EVENT_RESULT_URL);
exports.EVENT_AMBIENTE = EVENT_AMBIENTE;

/** Default credenziali Deasoft prod (sovrascrivibili con DEASOFT_USERNAME / DEASOFT_PASSWORD). */
const DEFAULT_DEASOFT_USERNAME = 'fun.dea';
const DEFAULT_DEASOFT_PASSWORD = 'RGVhc29mdC1mdW5uZWwyMDI2IQ==';

/**
 * Token Deasoft. L'host conta: il token rilasciato da produzione NON vale sul beta e
 * viceversa - l'endpoint risponde 401 "Not Authorized" con HTTP 200, quindi l'errore non
 * salta all'occhio. Verificato il 03/09/2026 su ?Type=EventResult.
 * @param {string} [urlOverride] endpoint del token; default quello di produzione.
 */
exports.getDeasoftToken = async (urlOverride) => {
  const tokenUrl = urlOverride || process.env.DEASOFT_TOKEN_URL || DEFAULT_TOKEN_URL;
  const username = process.env.DEASOFT_USERNAME || DEFAULT_DEASOFT_USERNAME;
  const password = process.env.DEASOFT_PASSWORD || DEFAULT_DEASOFT_PASSWORD;

  // Prova prima Basic Auth (RFC 7617): molti gateway accettano solo questo e non i query param.
  const response = await axios.get(tokenUrl, {
    auth: {
      username,
      password,
    },
  });

  const token = extractToken(response.data);
  if (!token) {
    throw new Error(`Token not found in response: ${JSON.stringify(response.data)}`);
  }
  return token;
};

/** @param {string} idLeadSystem — id lead su LeadSystem (parametro id_leadsystem verso Deasoft). */
exports.getDeasoftLeadOutcome = async (idLeadSystem, token) => {
  const leadUrl = process.env.DEASOFT_RESULT_URL || DEFAULT_RESULT_URL;
  const tokenUsato = token || await exports.getDeasoftToken(tokenUrlDi(leadUrl));

  const authMode = 'bearer';
  const tokenQueryName = 'token';
  const idLeadParamName = 'id_leadsystem';

  const config = {
    params: {
      [idLeadParamName]: idLeadSystem,
    },
    headers: {},
  };

  if (authMode === 'query') {
    config.params[tokenQueryName] = tokenUsato;
  } else {
    config.headers.Authorization = `Bearer ${tokenUsato}`;
  }

  const response = await axios.get(leadUrl, config);
  return response.data;
};

/**
 * Esiti dell'agendazione diretta su Deasoft (presentato/non presentato, preventivato,
 * fatturato, valore) tramite il nuovo endpoint EventResult, chiave id_deasoft.
 * @param {string|number} idDeasoft — id paziente Deasoft (parametro id_deasoft).
 * @param {string} token — bearer token Deasoft (da getDeasoftToken()).
 */
exports.getDeasoftEventResult = async (idDeasoft, token) => {
  const eventUrl = exports.EVENT_RESULT_URL;
  // Rete di sicurezza: se il token non arriva dal chiamante se lo prende dall'host
  // giusto, cosi' un uso distratto non finisce in un 401 travestito da risposta vuota.
  const tokenUsato = token || await exports.getDeasoftToken(tokenUrlDi(eventUrl));

  const config = {
    params: {
      id_deasoft: idDeasoft,
    },
    headers: {},
  };

  // Auth Bearer come per il vecchio endpoint Result (scelta confermata).
  // Override opzionale: DEASOFT_EVENT_AUTH_MODE=query mette il token come query param.
  if ((process.env.DEASOFT_EVENT_AUTH_MODE || 'bearer').toLowerCase() === 'query') {
    config.params.token = tokenUsato;
  } else if (tokenUsato) {
    config.headers.Authorization = `Bearer ${tokenUsato}`;
  }

  const response = await axios.get(eventUrl, config);
  return response.data;
};
