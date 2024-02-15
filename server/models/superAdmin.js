const mongoose = require('mongoose');
const { Schema } = mongoose;

const superAdminSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true,
      },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
  }
});

const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema);

module.exports = SuperAdmin;