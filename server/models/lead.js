const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadSchema = new Schema({
    data: {
      type: String,
      required: true
    },
    lastModify: {
      type: String,
    },
    dataLastContatto: {
      type: String,
    },
    nome: {
      type: String,
      required: true
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
    città: {
        type: String,
      },
    note: {
        type: String,
    },
    fatturato: {
      type: String,
    },
    tentativiChiamata: {
      type: String,
    },
    giàSpostato: {
      type: Boolean,
      default: false,
    },
    dataCambiamentoEsito: {
      type: Date,
      default: null,
    },
    trattamento: {
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
    tipo: String, 
    trattPrenotato: String, 
    luogo: String,
  });


const Lead = mongoose.model('Lead', LeadSchema);


module.exports = Lead ;