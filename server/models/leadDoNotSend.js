const mongoose = require('mongoose');
const { Schema } = mongoose;

// Collection "lead_donot_send": lead da NON inviare (assegnazione + Nexus) perche' privi di
// attribuzione campagna (name/adset vuoti) — tipicamente i form Meta "02_BS_*" (Volume/Intent)
// ingeriti via Zapier senza campaign/adset/ad. I grezzi corrispondenti restano in LeadFacebook
// marcati assigned=true (non vengono rimossi).
// RISPECCHIA i campi della collection `Lead` (stessa forma), ma SEPARATA e SENZA i validatori
// `required` (questi lead possono non avere nome), piu' i metadati di spostamento.
const leadDoNotSendSchema = new Schema({
  // --- stessi campi di Lead ---
  data: { type: String },
  dataTimestamp: { type: Date },
  nome: { type: String },
  email: { type: String },
  numeroTelefono: { type: String },
  campagna: { type: String },
  esito: { type: String, default: 'Da contattare' },
  orientatori: { type: Schema.Types.ObjectId, ref: 'Orientatore', default: null },
  quando: { type: String },
  utente: { type: Schema.Types.ObjectId, ref: 'User' },
  città: { type: String },
  note: { type: String },
  fatturato: { type: String },
  tentativiChiamata: { type: String },
  giàSpostato: { type: Boolean, default: false },
  trattamento: { type: String },
  utmSource: { type: String },
  utmCampaign: { type: String },
  utmContent: { type: String },
  utmTerm: { type: String },
  utmAdgroup: String,
  utmAdset: String,
  consent_marketing: String,
  idNexus: String,
  // --- metadati specifici del "do not send" ---
  metaLeadId: { type: String, index: true }, // id lead Meta (per idempotenza/join)
  reason: { type: String, default: 'no_campaign_attribution' },
  movedAt: { type: Date, default: Date.now },
  fieldDataRaw: [{ name: String, values: [String] }], // copia grezza per audit
}, { collection: 'lead_donot_send' });

module.exports = mongoose.model('LeadDoNotSend', leadDoNotSendSchema);
