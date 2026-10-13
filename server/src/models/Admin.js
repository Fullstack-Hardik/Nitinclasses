const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: 'Admin Nitin Sir'
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Check password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if currently locked out (10 attempts -> 30 min lock)
adminSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

adminSchema.methods.handleFailedLogin = async function() {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 10) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
  }
  await this.save();
};

adminSchema.methods.handleSuccessfulLogin = async function() {
  if (this.failedLoginAttempts !== 0 || this.lockUntil !== null) {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }
};

module.exports = mongoose.model('Admin', adminSchema);
