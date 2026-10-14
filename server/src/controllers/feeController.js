const FeeDue = require('../models/FeeDue');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Settings = require('../models/Settings');
const cache = require('../services/cacheService');
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

    const now = new Date();

    if (status === 'due_today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.dueDate = { $gte: today, $lt: tomorrow };
      query.remainingAmount = { $gt: 0 };
    } else if (status === 'due_this_week') {
      // Current calendar week (Monday to Sunday)
      const dayOfWeek = today.getDay(); // 0 is Sunday
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      query.dueDate = { $gte: monday, $lt: sunday };
      query.remainingAmount = { $gt: 0 };
    } else if (status === 'upcoming') {
      // Due in the next 7 days from tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 8);
      query.dueDate = { $gte: tomorrow, $lt: nextWeek };
      query.remainingAmount = { $gt: 0 };
    } else if (status === 'pending') {
      query.remainingAmount = { $gt: 0 };
      query.status = { $in: ['due', 'partially_paid'] };
    } else if (status === 'overdue') {
      query.remainingAmount = { $gt: 0 };
      query.dueDate = { $lt: today };
    } else if (status === 'paid') {
      query.remainingAmount = 0;
    } else if (status === 'current_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthFirstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      query.dueDate = { $gte: firstDay, $lt: nextMonthFirstDay };
    }

    // Month & Year Filter (e.g. month=9, year=2026)
    const { month, year, startDate, endDate } = req.query;
    if (year) {
      const y = Number(year);
      if (!isNaN(y)) {
        if (month !== undefined && month !== 'all' && month !== '') {
          const m = Number(month); // 0-indexed or 1-indexed
          const validMonth = m >= 1 && m <= 12 ? m - 1 : m;
          const startM = new Date(y, validMonth, 1);
          const endM = new Date(y, validMonth + 1, 1);
          query.dueDate = { ...query.dueDate, $gte: startM, $lt: endM };
        } else {
          const startY = new Date(y, 0, 1);
          const endY = new Date(y + 1, 0, 1);
          query.dueDate = { ...query.dueDate, $gte: startY, $lt: endY };
        }
      }
    }

    // Custom Date Range Filter
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query.dueDate = { ...query.dueDate, $gte: s, $lte: e };
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

    // If amount paid exceeds remaining amount, the excess goes to student's advanceFeeBalance
    let amountAppliedToDue = paidNum;
    let excessToAdvance = 0;

    if (paidNum > feeDue.remainingAmount) {
      amountAppliedToDue = feeDue.remainingAmount;
      excessToAdvance = paidNum - feeDue.remainingAmount;
    }

    const previousPaid = feeDue.paidAmount;
    const newPaidAmount = previousPaid + amountAppliedToDue;
    const newRemainingBalance = feeDue.amount - newPaidAmount;

    // Update FeeDue status
    feeDue.paidAmount = newPaidAmount;
    feeDue.remainingAmount = newRemainingBalance;
    feeDue.status = newRemainingBalance === 0 ? 'paid' : 'partially_paid';
    await feeDue.save();

    // If there is excess, credit it to student's advanceFeeBalance
    if (excessToAdvance > 0) {
      await Student.findByIdAndUpdate(feeDue.student._id, {
        $inc: { advanceFeeBalance: excessToAdvance }
      });
    }

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
      amountPaid: paidNum, // Total amount collected from student
      remainingBalance: newRemainingBalance,
      paymentMethod,
      upiTransactionRef: paymentMethod === 'upi' ? (upiTransactionRef || '') : '',
      notes: excessToAdvance > 0
        ? `${notes ? notes + ' | ' : ''}₹${excessToAdvance} added to advance wallet for next months`
        : (notes || ''),
      paymentDate: new Date()
    });

    // Invalidate dashboard cache
    cache.invalidate('dashboard');

    return res.status(201).json({
      success: true,
      message: excessToAdvance > 0
        ? `Payment recorded! Due settled & ₹${excessToAdvance} credited to next months.`
        : 'Payment recorded successfully',
      data: {
        payment,
        feeDue,
        excessAddedToAdvance: excessToAdvance
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/fees/collect-anytime (Collect fee anytime directly for a student)
const collectStudentFeeDirect = async (req, res) => {
  try {
    const {
      studentId,
      serviceType,
      amount,
      paymentMethod,
      upiTransactionRef,
      notes
    } = req.body;

    if (!studentId || !serviceType || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, service type (coaching/library), amount, and payment method are required.'
      });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // 1. First find any unpaid dues for this student and service type (oldest first)
    const pendingDues = await FeeDue.find({
      student: student._id,
      serviceType,
      remainingAmount: { $gt: 0 }
    }).sort({ dueDate: 1 });

    let unallocatedAmount = payAmount;
    let settledPayments = [];
    let lastFeeDue = null;

    for (const due of pendingDues) {
      if (unallocatedAmount <= 0) break;

      const toPay = Math.min(unallocatedAmount, due.remainingAmount);
      const prevPaid = due.paidAmount;
      due.paidAmount += toPay;
      due.remainingAmount -= toPay;
      due.status = due.remainingAmount === 0 ? 'paid' : 'partially_paid';
      await due.save();
      lastFeeDue = due;

      const receiptNumber = await generateReceiptNumber();
      const p = await Payment.create({
        receiptNumber,
        student: student._id,
        feeDue: due._id,
        serviceType,
        billingPeriod: due.billingPeriod,
        originalFeeAmount: due.amount,
        previousPaidAmount: prevPaid,
        amountPaid: toPay,
        remainingBalance: due.remainingAmount,
        paymentMethod,
        upiTransactionRef: paymentMethod === 'upi' ? (upiTransactionRef || '') : '',
        notes: notes || 'Direct fee collection',
        paymentDate: new Date()
      });
      settledPayments.push(p);

      unallocatedAmount -= toPay;
    }

    // 2. If all pending dues are settled (or student had no dues), any remaining unallocated amount
    // goes straight into student.advanceFeeBalance for future months!
    let excessToAdvance = 0;
    let advancePaymentRecord = null;
    if (unallocatedAmount > 0) {
      excessToAdvance = unallocatedAmount;
      student.advanceFeeBalance = (student.advanceFeeBalance || 0) + excessToAdvance;
      await student.save();

      // Create a receipt payment for this advance deposit
      const receiptNumber = await generateReceiptNumber();
      // If student has a lastFeeDue, reference it, else find any feeDue or leave as dummy
      const fallbackFeeDue = lastFeeDue || await FeeDue.findOne({ student: student._id, serviceType });

      advancePaymentRecord = await Payment.create({
        receiptNumber,
        student: student._id,
        feeDue: fallbackFeeDue ? fallbackFeeDue._id : null,
        serviceType,
        billingPeriod: 'Advance Balance (Future Months)',
        originalFeeAmount: excessToAdvance,
        previousPaidAmount: 0,
        amountPaid: excessToAdvance,
        remainingBalance: 0,
        paymentMethod,
        upiTransactionRef: paymentMethod === 'upi' ? (upiTransactionRef || '') : '',
        notes: `${notes ? notes + ' | ' : ''}Advance credit added to wallet (sorts automatically across future months)`,
        paymentDate: new Date()
      });
      settledPayments.push(advancePaymentRecord);
    }

    const primaryPayment = settledPayments[0] || advancePaymentRecord;

    // Invalidate dashboard cache
    cache.invalidate('dashboard');

    return res.status(201).json({
      success: true,
      message: excessToAdvance > 0
        ? `₹${payAmount} collected! (₹${excessToAdvance} saved as advance for upcoming months).`
        : `₹${payAmount} collected and applied to pending dues successfully!`,
      data: {
        payment: primaryPayment,
        settledPayments,
        advanceBalance: student.advanceFeeBalance,
        excessAddedToAdvance: excessToAdvance
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
    cache.invalidate('dashboard');
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

// PUT /api/fees/due/:id/manipulate (Smart Mode Fee Manipulation)
const manipulateFeeDue = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings?.smartModeEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Smart Mode is disabled. Enable it from Settings to adjust or manipulate fee dues.'
      });
    }

    const { amount, paidAmount, remainingAmount, status, notes } = req.body;
    const feeDue = await FeeDue.findById(req.params.id).populate('student');
    if (!feeDue) {
      return res.status(404).json({ success: false, message: 'Fee due record not found.' });
    }

    if (amount !== undefined) feeDue.amount = Math.max(0, Number(amount));
    if (paidAmount !== undefined) feeDue.paidAmount = Math.max(0, Number(paidAmount));
    if (remainingAmount !== undefined) {
      feeDue.remainingAmount = Math.max(0, Number(remainingAmount));
    } else if (amount !== undefined || paidAmount !== undefined) {
      feeDue.remainingAmount = Math.max(0, feeDue.amount - feeDue.paidAmount);
    }

    if (status) {
      feeDue.status = status;
    } else {
      feeDue.status = feeDue.remainingAmount === 0 ? 'paid' : (feeDue.paidAmount > 0 ? 'partially_paid' : 'due');
    }

    await feeDue.save();

    // Invalidate dashboard cache
    cache.invalidate('dashboard');

    return res.json({
      success: true,
      message: 'Fee record updated successfully via Smart Mode.',
      data: feeDue
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFeeDues,
  collectPayment,
  collectStudentFeeDirect,
  downloadReceipt,
  syncDues,
  downloadStudentFullStatement,
  manipulateFeeDue
};
