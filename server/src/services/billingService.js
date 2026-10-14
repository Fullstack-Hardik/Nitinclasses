const FeeDue = require('../models/FeeDue');

/**
 * Calculates recurring billing date taking care of month-end adjustments.
 * E.g., if anniversary day is 31st, for February it uses 28/29, for April 30.
 */
function getAnniversaryDate(year, monthIndex, targetDay) {
  // Days in monthIndex (0-based) using UTC midnight
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const validDay = Math.min(targetDay, daysInMonth);
  return new Date(Date.UTC(year, monthIndex, validDay, 0, 0, 0, 0));
}

/**
 * Generates monthly dues for a specific student and service type (coaching or library)
 * Idempotent: will not create duplicate periods.
 */
async function generateDuesForStudent(student, serviceType) {
  const service = serviceType === 'coaching' ? student.coaching : student.library;
  if (!service || !service.hasMembership || service.status !== 'active' || !service.joiningDate || !service.monthlyFee) {
    return [];
  }

  const rawJoining = new Date(service.joiningDate);
  const joiningYear = rawJoining.getUTCFullYear();
  const joiningMonth = rawJoining.getUTCMonth();
  const anniversaryDay = rawJoining.getUTCDate();

  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const feeAmount = service.monthlyFee;
  const generatedDues = [];

  // Start from joining month/year up to current month/year
  let currentYear = joiningYear;
  let currentMonth = joiningMonth;

  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth();

  while (
    currentYear < nowYear ||
    (currentYear === nowYear && currentMonth <= nowMonth)
  ) {
    const periodStart = getAnniversaryDate(currentYear, currentMonth, anniversaryDay);

    // CRITICAL: If the period start date is still in the future relative to today midnight, do not generate it yet!
    if (periodStart > todayMidnight) {
      break;
    }
    
    // Period end is 1 day before the next anniversary date
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const nextAnniversary = getAnniversaryDate(nextYear, nextMonth, anniversaryDay);
    const periodEnd = new Date(nextAnniversary.getTime() - 24 * 60 * 60 * 1000);

    // Format billing period string: e.g. "12 Mar 2026 - 11 Apr 2026"
    const startStr = periodStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const endStr = periodEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const billingPeriod = `${startStr} - ${endStr}`;

    // Due date is period start date
    const dueDate = new Date(periodStart);

    // Check if this fee due already exists
    const existing = await FeeDue.findOne({
      student: student._id,
      serviceType,
      billingPeriod
    });

    if (!existing) {
      // Determine initial status based on due date vs today
      const isPastDue = dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let initialStatus = isPastDue ? 'overdue' : 'due';
      let paidAmount = 0;
      let remainingAmount = feeAmount;

      // Auto-settlement from student's advanceFeeBalance if available
      if (student.advanceFeeBalance && student.advanceFeeBalance > 0) {
        const Student = require('../models/Student');
        const Payment = require('../models/Payment');
        const Settings = require('../models/Settings');

        const advanceToUse = Math.min(student.advanceFeeBalance, feeAmount);
        paidAmount = advanceToUse;
        remainingAmount = feeAmount - advanceToUse;
        initialStatus = remainingAmount === 0 ? 'paid' : 'partially_paid';

        // Deduct from student's advance credit
        student.advanceFeeBalance -= advanceToUse;
        await Student.findByIdAndUpdate(student._id, { advanceFeeBalance: student.advanceFeeBalance });

        const newDue = await FeeDue.create({
          student: student._id,
          serviceType,
          billingPeriod,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          dueDate,
          amount: feeAmount,
          paidAmount,
          remainingAmount,
          status: initialStatus
        });

        // Record a Payment record for this auto-settled due
        const settings = await Settings.findOne();
        const prefix = settings?.receiptPrefix || 'NSC-REC';
        const yearStr = new Date().getFullYear().toString().slice(-2);
        const count = await Payment.countDocuments();
        const receiptNumber = `${prefix}-${yearStr}-${(count + 1001).toString()}`;

        await Payment.create({
          receiptNumber,
          student: student._id,
          feeDue: newDue._id,
          serviceType,
          billingPeriod,
          originalFeeAmount: feeAmount,
          previousPaidAmount: 0,
          amountPaid: advanceToUse,
          remainingBalance: remainingAmount,
          paymentMethod: 'cash',
          notes: 'Auto-settled from advance fee balance',
          paymentDate: new Date()
        });

        generatedDues.push(newDue);
      } else {
        const newDue = await FeeDue.create({
          student: student._id,
          serviceType,
          billingPeriod,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          dueDate,
          amount: feeAmount,
          paidAmount: 0,
          remainingAmount: feeAmount,
          status: initialStatus
        });
        generatedDues.push(newDue);
      }
    } else {
      // If existing due has remainingAmount and student has advance balance, attempt settlement
      if (existing.remainingAmount > 0 && student.advanceFeeBalance && student.advanceFeeBalance > 0) {
        const Student = require('../models/Student');
        const Payment = require('../models/Payment');
        const Settings = require('../models/Settings');

        const advanceToUse = Math.min(student.advanceFeeBalance, existing.remainingAmount);
        const prevPaid = existing.paidAmount;
        existing.paidAmount += advanceToUse;
        existing.remainingAmount -= advanceToUse;
        existing.status = existing.remainingAmount === 0 ? 'paid' : 'partially_paid';
        await existing.save();

        student.advanceFeeBalance -= advanceToUse;
        await Student.findByIdAndUpdate(student._id, { advanceFeeBalance: student.advanceFeeBalance });

        const settings = await Settings.findOne();
        const prefix = settings?.receiptPrefix || 'NSC-REC';
        const yearStr = new Date().getFullYear().toString().slice(-2);
        const count = await Payment.countDocuments();
        const receiptNumber = `${prefix}-${yearStr}-${(count + 1001).toString()}`;

        await Payment.create({
          receiptNumber,
          student: student._id,
          feeDue: existing._id,
          serviceType,
          billingPeriod: existing.billingPeriod,
          originalFeeAmount: existing.amount,
          previousPaidAmount: prevPaid,
          amountPaid: advanceToUse,
          remainingBalance: existing.remainingAmount,
          paymentMethod: 'cash',
          notes: 'Auto-settled from advance fee balance',
          paymentDate: new Date()
        });
      } else if (existing.remainingAmount > 0 && existing.dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()) && existing.status === 'due') {
        existing.status = 'overdue';
        await existing.save();
      }
    }

    // Move to next month
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  return generatedDues;
}

/**
 * Syncs dues for all active students.
 */
async function syncAllStudentsDues() {
  const Student = require('../models/Student');
  const students = await Student.find({ isArchived: false });
  for (const student of students) {
    if (student.coaching && student.coaching.hasMembership) {
      await generateDuesForStudent(student, 'coaching');
    }
    if (student.library && student.library.hasMembership) {
      await generateDuesForStudent(student, 'library');
    }
  }
}

module.exports = {
  generateDuesForStudent,
  syncAllStudentsDues
};
