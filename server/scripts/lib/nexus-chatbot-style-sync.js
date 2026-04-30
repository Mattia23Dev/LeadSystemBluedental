/**
 * Stessa logica di sync Nexus usata in serverCP/controllers/chatbot.js (syncMessengerLeadToNexus).
 */
const { saveLead } = require('../../helpers/nexus');

function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  const cleanPhone = String(phoneNumber).replace(/\s/g, '');
  const patterns = [
    /^\+39\d{10}$/,
    /^\+\d{10}$/,
    /^39\d{10}$/,
    /^\d{10}$/,
  ];
  return patterns.some((pattern) => pattern.test(cleanPhone));
}

function normalizePhoneForNexus(phone) {
  if (!phone) return '';
  const normalized = String(phone).replace(/\s+/g, '').replace(/-/g, '');
  if (normalized.startsWith('+')) return normalized;
  if (normalized.startsWith('39')) return `+${normalized}`;
  return `+39${normalized}`;
}

/**
 * @param {import('mongoose').Document} lead — documento Lead mongoose
 * @returns {Promise<boolean>} true se inviato e salvato con idNexus
 */
async function syncMessengerLeadToNexus(lead) {
  try {
    if (!lead || !isValidPhoneNumber(lead.numeroTelefono || '')) return false;
    const isSomaLead =
      String(lead.campagna || '')
        .trim()
        .toUpperCase() === 'SOMA' ||
      String(lead.utmCampaign || '')
        .trim()
        .toUpperCase() === 'SOMA';

    const leadPayload = {
      nome: lead.nome,
      ragione_sociale: lead.nome,
      email: lead.email || '',
      telefono: normalizePhoneForNexus(lead.numeroTelefono),
      punteggio: null,
      riassunto_chiamata: lead.summary || null,
      id_lead_leadsystem: lead._id,
      note: lead.note || null,
      data_appuntamento: lead.appDate || null,
      citta: lead.città || '',
      trattamento: lead.trattamento || '',
      lead_status: lead.esito || 'Da contattare',
      dettaglio_status_negativo: null,
      numero_tentativi: null,
      macro_fonte: 'Online',
      micro_fonte: isSomaLead ? 'GOLD' : 'META WEB',
      campagna: isSomaLead ? 'Gold' : 'Meta Web',
      adset: isSomaLead ? 'Gold' : 'Meta Web',
      ad: isSomaLead ? 'Gold' : 'Meta Web',
      sorgente: 'Funnel',
    };

    const leadNexus = await saveLead(leadPayload);
    if (leadNexus && leadNexus.id) {
      lead.idNexus = leadNexus.id;
      await lead.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error(
      'Errore sync Nexus (stile chatbot):',
      error?.response?.data || error.message,
    );
    return false;
  }
}

module.exports = {
  isValidPhoneNumber,
  normalizePhoneForNexus,
  syncMessengerLeadToNexus,
};
