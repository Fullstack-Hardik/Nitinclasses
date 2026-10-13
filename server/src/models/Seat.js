const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  libraryType: {
    type: String,
    enum: ['boys', 'girls'],
    required: true,
    index: true
  },
  seatNumber: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'blocked'],
    default: 'available',
    index: true
  },
  assignedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Ensure unique seatNumber per libraryType
seatSchema.index({ libraryType: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);
