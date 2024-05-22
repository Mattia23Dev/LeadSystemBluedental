const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    min: 6,
    max: 64,
  },
  role: {
    type: String,
    enum: ["admin", "user"]
  },
  nameECP: {
    type: String,
    trim: true,
  },
  pIva: {
    type: String,
    trim: true,
    minlength: 11,
    maxlength: 11,
  },
  isChecked: {
    type: Boolean,
    required: true,
  },
  passwordResetCode: {
    type: String,
  },
  codeVerifyEmail: {
    type: String,
  },
  monthlyLeadCounter: {
    type: Number,
    default: 0,
  },
  dailyCap: {
    type: Number,
    default: 10,
  },
  dailyLead: {
    type: Number,
    default: 0,
  },
  monthlyLeadFix: {
    type: Number,
    required: true,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
  emailNotification: {
    type: String,
  },
  notificationsEnabled: { type: Boolean, default: false },
  notificationSubscriptions: [{ 
    type: Object,
    default: null,
  }],
  note: String,
  tag: String,
});

module.exports = mongoose.model("User", userSchema);
