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

  // Extract year, month, day in IST (Indian Standard Time) to prevent any 5.5hr UTC drift
  const istFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [jYearStr, jMonthStr, jDayStr] = istFormatter.format(new Date(service.joiningDate)).split('-');
  const joiningYear = Number(jYearStr);
  const joiningMonth = Number(jMonthStr) - 1; // 0-indexed month
  const anniversaryDay = Number(jDayStr);

  const now = new Date();
  const [nYearStr, nMonthStr, nDayStr] = istFormatter.format(now).split('-');
  const nowYear = Number(nYearStr);
  const nowMonth = Number(nMonthStr) - 1;
  const nowDay = Number(nDayStr);

  // Today in UTC representing midnight IST date
  const todayMidnight = new Date(Date.UTC(nowYear, nowMonth, nowDay, 23, 59, 59, 999));

  const feeAmount = service.monthlyFee;
  const generatedDues = [];

  // Start from joining month/year up to current month/year
  let currentYear = joiningYear;
  let currentMonth = joiningMonth;

  while (true) {
    const periodStart = getAnniversaryDate(currentYear, currentMonth, anniversaryDay);

    // Period end is 1 day before the next anniversary date
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const nextAnniversary = getAnniversaryDate(nextYear, nextMonth, anniversaryDay);

    // If this cycle's anniversary date has not arrived yet, do NOT generate or show it yet!
    // ("jo aane wali hai wo mat dikha, jis din hai us din dikha")
    if (periodStart > todayMidnight) {
      break;
    }

    const periodEnd = new Date(nextAnniversary.getTime() - 24 * 60 * 60 * 1000);

    // Format billing period string: e.g. "10 Oct 2026 - 09 Nov 2026"
    const startStr = periodStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const endStr = periodEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const billingPeriod = `${startStr} - ${endStr}`;

    // Due date represents the period end date when the month completes
    const dueDate = new Date(periodEnd);

    // Check if this fee due already exists
    const existing = await FeeDue.findOne({
      student: student._id,
      serviceType,
      billingPeriod
    });

    // Check if cycle period has completed in the past
    const endOfPeriodMidnight = new Date(periodEnd);
    endOfPeriodMidnight.setHours(23, 59, 59, 999);
    const isPeriodCompleted = now > endOfPeriodMidnight;

    if (!existing) {
      let initialStatus = isPeriodCompleted ? 'overdue' : 'due';
      let paidAmount = 0;
      let remainingAmount = feeAmount;

      // Auto-settlement from student's advanceFeeBalance if available
      if (student.advanceFeeBalance && student.advanceFeeBalance > 0) {
        const Student = require('../models/Student');
        const Payment = require('../models/Payment');
        const { generateReceiptNumber } = require('./codeService');

        const advanceToUse = Math.min(student.advanceFeeBalance, feeAmount);
        paidAmount = advanceToUse;
        remainingAmount = feeAmount - advanceToUse;
        initialStatus = remainingAmount === 0 ? 'paid' : (isPeriodCompleted ? 'overdue' : 'due');

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

        const receiptNumber = await generateReceiptNumber(student);

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
        const { generateReceiptNumber } = require('./codeService');

        const advanceToUse = Math.min(student.advanceFeeBalance, existing.remainingAmount);
        const prevPaid = existing.paidAmount;
        existing.paidAmount += advanceToUse;
        existing.remainingAmount -= advanceToUse;
        existing.status = existing.remainingAmount === 0 ? 'paid' : (isPeriodCompleted ? 'overdue' : 'due');
        await existing.save();

        student.advanceFeeBalance -= advanceToUse;
        await Student.findByIdAndUpdate(student._id, { advanceFeeBalance: student.advanceFeeBalance });

        const receiptNumber = await generateReceiptNumber(student);

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
      } else if (existing.remainingAmount > 0) {
        const targetStatus = isPeriodCompleted ? 'overdue' : 'due';
        if (existing.status !== targetStatus && existing.status !== 'partially_paid') {
          existing.status = targetStatus;
          await existing.save();
        }
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
 * Syncs dues for all active students and enforces due vs overdue status.
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

  // Enforce running months are 'due' and expired past months are 'overdue'
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  await FeeDue.updateMany(
    { remainingAmount: { $gt: 0 }, periodEndDate: { $gte: todayStart }, status: 'overdue' },
    { $set: { status: 'due' } }
  );
  await FeeDue.updateMany(
    { remainingAmount: { $gt: 0 }, periodEndDate: { $lt: todayStart }, status: { $in: ['due', 'upcoming'] } },
    { $set: { status: 'overdue' } }
  );
}

module.exports = {
  generateDuesForStudent,
  syncAllStudentsDues
};
