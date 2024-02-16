const mongoose = require('mongoose');
const { Schema } = mongoose;

// Definisci lo schema per gli orientatori
const OrientatoreSchema = new Schema({
  nome: {
    type: String,
    required: true
  },
  cognome: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  telefono: {
    type: String,
    required: true
  },
  utente: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  password: {
    type: String,
  },
  role: {
    type: String,
  },
  new: {
    type: Boolean,
    default: true,
  }
});

const Orientatore = mongoose.model('Orientatore', OrientatoreSchema);


module.exports =  Orientatore ;