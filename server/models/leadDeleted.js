const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadDeletedSchema = new Schema({
    data: {
      type: String,
      required: true
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
    corsoDiLaurea: {
      type: String,
    },
    frequentiUni: {
      type: Boolean,
    },
    lavoro: {
      type: Boolean,
    },
    facolta: {
      type: String,
    },
    oreStudio: {
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
    università: {
        type: String,
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
  });


const LeadDeleted = mongoose.model('LeadDeleted', LeadDeletedSchema);


module.exports = LeadDeleted ;