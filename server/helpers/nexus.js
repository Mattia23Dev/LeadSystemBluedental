const axios = require("axios");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//refresh 8O3sHfo4yI2H6YD0YW4H0cG7oOlNM7k1ng2aI6UEMiVby8rsHDYGvpTpz5JcuNQ2
const nexus = axios.create({
  //baseURL: "https://test-bludental.hisolution.it",
  baseURL: "https://bludental.hisolution.it",
  headers: {
    "Authorization": "Bearer VOXJZAbRz13TJU0YzOZRLv1A94RgQabxdougnKudA2RnCo2SqT8ci0cLQoUiSxoQ",
    "Content-Type": "application/json",
  },
});

exports.listLeads = async (body) => {
  try {
    const response = await nexus.post('/lead/api/list', body);
    return response.data;
  } catch (error) {
    console.error('Error listing leads from Nexus:', error?.response?.data || error.message);
    throw error;
  }
};

exports.fetchLeads = async () => {
  try {
    // Default minimal list (debug)
    return await exports.listLeads({
      select: "t.id, t.numerazione",
      conditions: "",
      group: "",
      having: "",
      order: "",
      limit: "5",
      offset: "",
      page: "",
      pageSize: ""
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
  }
};

exports.saveLead = async (leadData) => {
    try {
      const response = await nexus.post('/lead/api/set', leadData);
      console.log('Lead saved/updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  }

// Variante che NON ingoia l'errore: restituisce esito esplicito per il logging.
exports.saveLeadWithResult = async (leadData) => {
  try {
    const response = await nexus.post('/lead/api/set', leadData);
    return { ok: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error?.response?.data || error?.message || String(error),
      status: error?.response?.status || null,
    };
  }
};

// Normalizza il numero per Nexus: tiene solo le ultime 10 cifre (parte locale italiana).
exports.normalizePhoneForNexus = (phone) => {
  if (!phone) return '';
  const original = String(phone).trim();
  const digitsOnly = original.replace(/\D/g, '');
  if (!digitsOnly) return original;
  if (digitsOnly.length > 10) return digitsOnly.slice(-10) || original;
  return digitsOnly || original;
};

exports.getLeadById = async (idNexus) => {
  try {
    // API: GET /lead/api/get?id=...
    const response = await nexus.get('/lead/api/get', { params: { id: idNexus } });
    return response.data;
  } catch (error) {
    console.error('Error fetching lead from Nexus:', error?.response?.data || error.message);
    throw error;
  }
}

/**
 * id_deasoft (identificativo del paziente sul gestionale) delle lead, letto con il JOIN sulla
 * tabella `contatto` indicato da NextUp il 23/09/2026. Il campo non sta sulla lead: sta sul
 * contatto, e Nexus lo valorizza quando l'appuntamento viene fissato via Trace.
 *
 * Una lead senza contatto associato semplicemente non compare nel risultato.
 *
 * @param {string} [conditions] filtro SQL sulla lead, es. "t.data_creazione >= '2026-06-01'"
 * @returns {Promise<Map<string,string>>} idNexus -> id_deasoft
 */
exports.getIdDeasoftMap = async (conditions = '') => {
  const response = await nexus.get('/lead/api/list', {
    params: {
      select: 't.id,contatto.id_deasoft',
      join: 'JOIN contatto on contatto.id_lead = t.id',
      conditions,
      limit: 'all',
    },
  });
  const rows = (response.data && (response.data.data || response.data)) || [];
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    if (r && r.id && r.id_deasoft) map.set(String(r.id), String(r.id_deasoft));
  });
  return map;
};

/** id_deasoft di una singola lead (null se non c'e' un contatto associato). */
exports.getIdDeasoft = async (idNexus) => {
  const response = await nexus.get('/lead/api/get', {
    params: { id: idNexus, select: 't.id,contatto.id_deasoft', join: 'JOIN contatto on contatto.id_lead = t.id' },
  });
  const d = (response.data && (response.data.data || response.data)) || null;
  return d && d.id_deasoft ? String(d.id_deasoft) : null;
};
