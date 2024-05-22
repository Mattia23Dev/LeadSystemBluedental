const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadChatbotSchema = new Schema({
    idLead: {
        type: String,
    },
    channel: {
        type: String,
    },
    data: {
      type: String,
      required: true
    },
    fullName: {
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
    last_interaction: {
        type: String,
    },
    appointment_date: {
        type: String
    },
    conversation_summary: {
        type: String
    },
    assigned: {
      type: Boolean,
      default: false
    },
    tag: String,
  });

const LeadChatbot = mongoose.model('LeadChatbot', LeadChatbotSchema);


module.exports = LeadChatbot;