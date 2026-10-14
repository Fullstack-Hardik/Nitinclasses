const FeeDue = require('../models/FeeDue');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Settings = require('../models/Settings');
const { generateReceiptPDF, generateStudentFeeStatementPDF } = require('../services/receiptService');
const { syncAllStudentsDues } = require('../services/billingService');

// Helper to generate unique receipt number
const generateReceiptNumber = async () => {
  const settings = await Settings.findOne();
  const prefix = settings?.receiptPrefix || 'NSC-REC';
  const today = new Date();
  const yearStr = today.getFullYear().toString().slice(-2);
  const count = await Payment.countDocuments();
  return `${prefix}-${yearStr}-${(count + 1001).toString()}`;
};

// GET /api/fees (Coaching / Library fee dues)
const getFeeDues = async (req, res) => {
  try {
    const { serviceType, status, search } = req.query;

    // Optional background sync check
    let query = {};
    if (serviceType && serviceType !== 'all') {
      query.serviceType = serviceType;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === 'due_today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.dueDate = { $gte: today, $lt: tomorrow };
      query.remainingAmount = { $gt: 0 };
    } else if (status === 'pending') {
      query.remainingAmount = { $gt: 0 };
      query.status = { $in: ['due', 'partially_paid'] };
    } else if (status === 'overdue') {
      query.remainingAmount = { $gt: 0 };
      query.status = 'overdue';
    } else if (status === 'paid') {
      query.remainingAmount = 0;
      query.status = 'paid';
    }

    let dues = await FeeDue.find(query)
      .populate('student', 'fullName studentId mobileNumber coaching library isArchived')
      .sort({ dueDate: -1 });

    // Filter out archived students or filter by search
    dues = dues.filter(d => d.student && !d.student.isArchived);

    if (search) {
      const s = search.toLowerCase();
      dues = dues.filter(d =>
        d.student.fullName.toLowerCase().includes(s) ||
        d.student.studentId.toLowerCase().includes(s) ||
        d.student.mobileNumber.toLowerCase().includes(s)
      );
    }

    return res.json({ success: true, count: dues.length, data: dues });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/fees/collect (Collect manual fee payment)
const collectPayment = async (req, res) => {
  try {
    const {
      feeDueId,
      amountPaid,
      paymentMethod,
      upiTransactionRef,
      notes
    } = req.body;

    if (!feeDueId || !amountPaid || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Fee Due ID, Amount, and Payment Method are required.' });
    }

    const paidNum = Number(amountPaid);
    if (isNaN(paidNum) || paidNum <= 0) {
      return res.status(400).json({ success: false, message: 'Amount paid must be greater than zero.' });
    }

    if (!['cash', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Only Cash or UPI payment methods are supported.' });
    }

    const feeDue = await FeeDue.findById(feeDueId).populate('student');
    if (!feeDue) {
      return res.status(404).json({ success: false, message: 'Fee due record not found.' });
    }

    if (paidNum > feeDue.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount paid (₹${paidNum}) cannot exceed remaining balance (₹${feeDue.remainingAmount}).`
      });
    }

    const previousPaid = feeDue.paidAmount;
    const newPaidAmount = previousPaid + paidNum;
    const newRemainingBalance = feeDue.amount - newPaidAmount;

    // Update FeeDue status
    feeDue.paidAmount = newPaidAmount;
    feeDue.remainingAmount = newRemainingBalance;
    feeDue.status = newRemainingBalance === 0 ? 'paid' : 'partially_paid';
    await feeDue.save();

    // Generate receipt number & save Payment record
    const receiptNumber = await generateReceiptNumber();
    const payment = await Payment.create({
      receiptNumber,
      student: feeDue.student._id,
      feeDue: feeDue._id,
      serviceType: feeDue.serviceType,
      billingPeriod: feeDue.billingPeriod,
      originalFeeAmount: feeDue.amount,
      previousPaidAmount: previousPaid,
      amountPaid: paidNum,
      remainingBalance: newRemainingBalance,
      paymentMethod,
      upiTransactionRef: paymentMethod === 'upi' ? (upiTransactionRef || '') : '',
      notes: notes || '',
      paymentDate: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment,
        feeDue
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/fees/receipt/:paymentId/pdf
const downloadReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('student');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const settings = await Settings.findOne() || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt-${payment.receiptNumber}.pdf`);

    generateReceiptPDF(payment, payment.student, settings, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/fees/sync
const syncDues = async (req, res) => {
  try {
    await syncAllStudentsDues();
    return res.json({ success: true, message: 'Recurring billing dues generated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/fees/student/:studentId/statement/pdf
const downloadStudentFullStatement = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    const dues = await FeeDue.find({ student: student._id }).sort({ dueDate: 1 });
    const payments = await Payment.find({ student: student._id }).sort({ paymentDate: 1 });
    const settings = await Settings.findOne() || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Fee-Statement-${student.studentId}.pdf`);

    generateStudentFeeStatementPDF(student, dues, payments, settings, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFeeDues,
  collectPayment,
  downloadReceipt,
  syncDues,
  downloadStudentFullStatement
};
