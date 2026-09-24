/**
 * Ingresso delle lead del comparatore DentistaItalia (landing Lovable), test partito a settembre 2026.
 *
 * La lead non segue un flusso suo: viene messa nella stessa coda delle lead Meta (collection
 * leadfacebooks, dove scrive Zapier) con campagna "GOOGLE WHITE LABEL", e da li' la prende il
 * cron Meta Web (calculateAndAssignLeadsEveryDayMetaWeb). Eredita quindi tutto il percorso:
 *   - cap qualifiche non raggiunto -> qualificatore WhatsApp, invio a Nexus differito:
 *       con punteggio -> micro PRE-META, senza punteggio dopo 24h -> micro META WEB
 *   - cap raggiunto -> diretta a Nexus, micro META WEB
 * In tutti i casi su Nexus: campagna = "GOOGLE WHITE LABEL", adset = canale (META / GOOGLE),
 * ad = landing (LANDING A / LANDING B). PRE-META e' la micro fonte, non la campagna.
 *
 *   POST /api/comparatore/lead
 *   Header: x-api-key: {COMPARATORE_API_KEY}
 *   Body: { nome, telefono, email?, citta, trattamento?, canale: "meta"|"google",
 *           landing: "A"|"B", consenso_privacy: true, assicurazione? }
 *
 * La chiamata va fatta lato server (edge function), non dal browser: la chiave non deve
 * finire nel codice della pagina.
 */
const express = require('express');
const LeadFacebook = require('../models/leadFacebook');
const DeepagentLog = require('../models/deepagentLog');

const router = express.Router();

const CAMPAGNA = process.env.COMPARATORE_CAMPAGNA || 'GOOGLE WHITE LABEL';
const API_KEY = process.env.COMPARATORE_API_KEY || '';
const CANALI = { meta: 'META', google: 'GOOGLE' };

const s = (v) => String(v ?? '').trim();
const vero = (v) => v === true || ['true', '1', 'si', 'sì', 'yes', 'on'].includes(s(v).toLowerCase());

router.post('/comparatore/lead', async (req, res) => {
  const b = req.body || {};
  const log = { receivedAt: new Date(), endpoint: '/comparatore/lead', source: 'comparatore', payload: b, userPhone: s(b.telefono) || null };
  const esci = async (status, outcome, message, extra = {}) => {
    log.outcome = outcome;
    await DeepagentLog.create(log).catch((e) => console.error('[Comparatore] log fallito:', e?.message || e));
    return res.status(status).json({ message, ...extra });
  };

  // Senza chiave configurata l'endpoint resta chiuso: niente ingresso aperto su dati sanitari.
  if (!API_KEY) return esci(503, 'comparatore_non_configurato', 'Endpoint non configurato');
  if (req.get('x-api-key') !== API_KEY) return esci(401, 'comparatore_chiave_errata', 'Chiave non valida');

  const nome = s(b.nome);
  const telefono = s(b.telefono).replace(/\s+/g, '');
  const citta = s(b.citta);
  const canale = CANALI[s(b.canale).toLowerCase()];
  const landing = s(b.landing).toUpperCase().replace(/^LANDING\s*/, '');

  const errori = [];
  if (!nome) errori.push('nome');
  if (telefono.replace(/\D/g, '').length < 9) errori.push('telefono');
  if (!citta) errori.push('citta');
  if (!canale) errori.push('canale (meta | google)');
  if (!/^[A-Z]$/.test(landing)) errori.push('landing (A | B)');
  if (!vero(b.consenso_privacy)) errori.push('consenso_privacy');
  if (errori.length) return esci(400, 'comparatore_dati_mancanti', 'Campi mancanti o non validi', { campi: errori });

  // Doppio invio dalla stessa pagina (doppio click, refresh): stesso telefono negli ultimi 10 minuti.
  const recente = await LeadFacebook.findOne({
    name: CAMPAGNA,
    'fieldData.values': telefono,
    data: { $gte: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
  }).lean();
  if (recente) return esci(200, 'comparatore_duplicata', 'Lead gia\' ricevuta', { id: recente._id });

  const campo = (name, value) => ({ name, values: [s(value)] });
  const doc = await LeadFacebook.create({
    data: new Date().toISOString(),
    formId: 'comparatore',
    name: CAMPAGNA,
    adsets: canale,
    annunci: `LANDING ${landing}`,
    assigned: false,
    // Stessi nomi campo del form Meta: il cron li legge senza sapere da dove arriva la lead.
    fieldData: [
      campo('full_name', nome),
      campo('phone_number', telefono),
      campo('email', b.email),
      campo('seleziona_il_centro_più_vicino_a_te', citta.toLowerCase().replace(/\s+/g, '_')),
      campo('seleziona_il_trattamento_su_cui_vorresti_ricevere_maggiori_informazioni', b.trattamento),
      campo('acconsenti_al_trattamento_dei_tuoi_dati_personali_per_essere_contattato?', 'si'),
      campo('assicurazione', b.assicurazione),
    ],
  });

  return esci(201, 'comparatore_ricevuta', 'Lead ricevuta', { id: doc._id });
});

module.exports = router;
