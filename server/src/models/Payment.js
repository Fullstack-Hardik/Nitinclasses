const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  feeDue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeDue',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['coaching', 'library'],
    required: true,
    index: true
  },
  billingPeriod: {
    type: String,
    required: true
  },
  originalFeeAmount: {
    type: Number,
    required: true
  },
  previousPaidAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    required: true
  },
  remainingBalance: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi'],
    required: true
  },
  upiTransactionRef: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  paymentDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
