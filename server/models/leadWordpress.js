const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadWordpressSchema = new Schema({
  data: {
    type: String,
    required: true
  },
  lastModify: {
    type: String,
  },
  nome: {
    type: String,
    required: true
  },
  cognome: {
    type: String,
  },
  email: {
    type: String,
  },
  numeroTelefono: {
    type: String,
  },
  campagna: {
    type: String,
  },
  esito: {
      type: String,
      default: 'Da contattare',
  },
  orientatori: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Orientatore',
  },
  utente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  provincia: {
      type: String,
    },
  note: {
      type: String,
  },
  fatturato: {
    type: String,
  },
  dataCambiamentoEsito: {
    type: Date,
    default: null,
  },
  oraChiamataRichiesto: {
    type: String,
  },
  manualLead: {
    type : Boolean,
    default: false,
  },
  utmSource: {
    type: String,
  },
  utmCampaign: {
    type: String,
  },
  utmContent: {
    type: String,
  },
  utmTerm: {
    type: String,
  },
  utmAdgroup: String,
  utmAdset: String,
  motivo: String,
  recallDate: Date,
  recallHours: String,
  budget: String,
  });


const LeadWordpress = mongoose.model('LeadWordpress', LeadWordpressSchema);

module.exports = LeadWordpress ;