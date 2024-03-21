const mongoose = require('mongoose');

const lastLeadUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Orientatore',
  },
});

const LastLeadUser = mongoose.model('LastLeadUser', lastLeadUserSchema);

module.exports = LastLeadUser;