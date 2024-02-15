const mongoose = require('mongoose');
const { Schema } = mongoose;

const leadSchemaFacebook = new Schema({
    data: {
      type: String,
    },
    formId: String,
    fieldData: [{
      name: String,
      values: [String],
    }],
    id: String,
    assigned: {
      type: Boolean,
      default: false,
    },
    utente: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    annunci: {
      type: String,
    },
    adsets: {
      type: String,
    },
    name: {
      type: String,
    }, 
  });
  
const LeadFacebook = mongoose.model('LeadFacebook', leadSchemaFacebook);

module.exports = LeadFacebook ;