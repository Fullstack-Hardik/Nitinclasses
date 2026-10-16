const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  // Personal Details
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  fatherName: {
    type: String,
    trim: true,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  mobileNumber: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  studentJoiningDate: {
    type: Date,
    required: [true, 'Student joining date is required'],
    default: Date.now
  },

  // Membership Type: 'coaching_only' | 'library_only' | 'coaching_and_library'
  membershipType: {
    type: String,
    enum: ['coaching_only', 'library_only', 'coaching_and_library'],
    required: true
  },

  // Coaching Details
  coaching: {
    hasMembership: { type: Boolean, default: false },
    monthlyFee: { type: Number, default: 0 }, // In rupees (can store standard or paise)
    joiningDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive', 'paused'], default: 'active' }
  },

  // Library Details
  library: {
    hasMembership: { type: Boolean, default: false },
    libraryType: { type: String, enum: ['boys', 'girls'], default: 'boys' },
    monthlyFee: { type: Number, default: 0 },
    joiningDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive', 'paused'], default: 'active' },
    seatNumber: { type: Number, default: null } // null if allocated later
  },

  // Advance Balance / Credit Wallet (excess fee collected to sort future months)
  advanceFeeBalance: {
    type: Number,
    default: 0
  },

  // Soft deletion or archived flag with audit trail
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Virtual to populate active dues or seats if needed
studentSchema.index({ fullName: 'text', fatherName: 'text', mobileNumber: 'text', studentId: 'text' });

module.exports = mongoose.model('Student', studentSchema);
