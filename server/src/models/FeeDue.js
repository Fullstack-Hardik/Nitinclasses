const mongoose = require('mongoose');

const feeDueSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    enum: ['coaching', 'library'],
    required: true
  },
  billingPeriod: {
    // Format: 'YYYY-MM' or '12 Mar 2026 - 11 Apr 2026'
    type: String,
    required: true
  },
  periodStartDate: {
    type: Date,
    required: true
  },
  periodEndDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'due', 'overdue', 'partially_paid', 'paid', 'cancelled'],
    default: 'due',
    index: true
  }
}, { timestamps: true });

// Prevent duplicate billing periods for the same student and service
feeDueSchema.index({ student: 1, serviceType: 1, billingPeriod: 1 });
feeDueSchema.index({ student: 1, serviceType: 1, remainingAmount: 1 });
feeDueSchema.index({ remainingAmount: 1, periodStartDate: 1 });
feeDueSchema.index({ remainingAmount: 1, periodEndDate: 1 });
feeDueSchema.index({ remainingAmount: 1, dueDate: 1 });

module.exports = mongoose.model('FeeDue', feeDueSchema);
