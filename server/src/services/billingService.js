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
 * Clean up duplicate / overlapping monthly cycles for a student and service.
 * If user edited dates multiple times, duplicate records might exist for the same month.
 * This ensures strictly ONE fee cycle per month per service.
 */
async function cleanupDuplicateDues(studentId, serviceType) {
  const query = { student: studentId };
  if (serviceType) query.serviceType = serviceType;
  const dues = await FeeDue.find(query).sort({ periodStartDate: 1, createdAt: 1 });
  if (!dues || dues.length <= 1) return;

  const toDelete = [];
  const visited = new Set();

  for (let i = 0; i < dues.length; i++) {
    const currentId = dues[i]._id.toString();
    if (visited.has(currentId)) continue;
    const cluster = [dues[i]];

    for (let j = i + 1; j < dues.length; j++) {
      const compareId = dues[j]._id.toString();
      if (visited.has(compareId)) continue;
      if (dues[i].serviceType !== dues[j].serviceType) continue;

      const startA = new Date(dues[i].periodStartDate).getTime();
      const endA = new Date(dues[i].periodEndDate).getTime();
      const startB = new Date(dues[j].periodStartDate).getTime();
      const endB = new Date(dues[j].periodEndDate).getTime();

      const overlapMs = Math.min(endA, endB) - Math.max(startA, startB);
      const overlapDays = overlapMs / (1000 * 60 * 60 * 24);

      // If cycles overlap by 14+ days, they represent the same calendar month
      if (overlapDays >= 14) {
        cluster.push(dues[j]);
        visited.add(compareId);
      }
    }

    if (cluster.length > 1) {
      // Pick best primary: highest paidAmount first, then latest updated
      cluster.sort((a, b) => {
        if (b.paidAmount !== a.paidAmount) return b.paidAmount - a.paidAmount;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });

      const primary = cluster[0];
      const duplicates = cluster.slice(1);
      const Payment = require('../models/Payment');

      for (const dup of duplicates) {
        // Point payments to primary
        await Payment.updateMany({ feeDue: dup._id }, { $set: { feeDue: primary._id } });

        if (dup.paidAmount > 0) {
          primary.paidAmount = (primary.paidAmount || 0) + dup.paidAmount;
          primary.remainingAmount = Math.max(0, primary.amount - primary.paidAmount);
          primary.status = primary.remainingAmount === 0 ? 'paid' : (primary.paidAmount > 0 ? 'partially_paid' : primary.status);
          await primary.save();
        }

        toDelete.push(dup._id);
      }
    }
  }

  if (toDelete.length > 0) {
    await FeeDue.deleteMany({ _id: { $in: toDelete } });
  }
}

/**
 * Clean up duplicates across all active students
 */
async function cleanupAllDuplicateDues() {
  const Student = require('../models/Student');
  const students = await Student.find({ isArchived: false }).select('_id');
  for (const s of students) {
    await cleanupDuplicateDues(s._id, 'coaching');
    await cleanupDuplicateDues(s._id, 'library');
  }
}

/**
 * Generates monthly dues for a specific student and service type (coaching or library)
 * Idempotent: will not create duplicate periods.
 */
async function generateDuesForStudent(student, serviceType) {
  const service = serviceType === 'coaching' ? student.coaching : student.library;
  // If service has no membership or is inactive, NEVER generate dues!
  if (!service || !service.hasMembership || service.status !== 'active' || !service.joiningDate || !service.monthlyFee) {
    return [];
  }

  // Pre-cleanup any existing duplicate cycles before generating new ones
  await cleanupDuplicateDues(student._id, serviceType);

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

  // If student joining date was moved forward in time, clean up any unpaid ghost dues prior to joiningDate
  const joiningDateFloor = new Date(service.joiningDate);
  joiningDateFloor.setHours(0, 0, 0, 0);
  await FeeDue.deleteMany({
    student: student._id,
    serviceType,
    periodEndDate: { $lt: joiningDateFloor },
    paidAmount: 0
  });

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
    if (periodStart > todayMidnight) {
      break;
    }

    const periodEnd = new Date(nextAnniversary.getTime() - 24 * 60 * 60 * 1000);

    // Format billing period string: e.g. "10 Oct 2026 - 09 Nov 2026"
    const startStr = periodStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const endStr = periodEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const billingPeriod = `${startStr} - ${endStr}`;

    const dueDate = new Date(periodEnd);

    // Check if a fee due already exists for this exact period OR overlapping significantly (same calendar month cycle)
    const existingDues = await FeeDue.find({
      student: student._id,
      serviceType
    });

    let existing = null;
    for (const d of existingDues) {
      if (d.billingPeriod === billingPeriod) {
        existing = d;
        break;
      }
      const sA = new Date(d.periodStartDate).getTime();
      const eA = new Date(d.periodEndDate).getTime();
      const sB = periodStart.getTime();
      const eB = periodEnd.getTime();
      const overlapMs = Math.min(eA, eB) - Math.max(sA, sB);
      const overlapDays = overlapMs / (1000 * 60 * 60 * 24);

      if (overlapDays >= 14) {
        existing = d;
        break;
      }
    }

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
      // Existing cycle for this month found!
      // If cycle is already paid, keep it as is. Do NOT generate duplicate!
      if (existing.remainingAmount === 0 || existing.status === 'paid') {
        // Already settled for this month
      } else if (existing.paidAmount === 0 && (existing.billingPeriod !== billingPeriod || existing.amount !== feeAmount)) {
        // If unpaid and date or fee changed, update the existing record instead of creating a duplicate!
        existing.billingPeriod = billingPeriod;
        existing.periodStartDate = periodStart;
        existing.periodEndDate = periodEnd;
        existing.dueDate = dueDate;
        existing.amount = feeAmount;
        existing.remainingAmount = feeAmount;
        existing.status = isPeriodCompleted ? 'overdue' : 'due';
        await existing.save();
      }

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

  // Final cleanup pass to guarantee zero duplicates
  await cleanupDuplicateDues(student._id, serviceType);

  return generatedDues;
}

/**
 * Syncs dues for all active students and enforces due vs overdue status.
 */
async function syncAllStudentsDues() {
  const Student = require('../models/Student');
  // First run cleanup on all students
  await cleanupAllDuplicateDues();

  const students = await Student.find({ isArchived: false });
  for (const student of students) {
    if (student.coaching && student.coaching.hasMembership && student.coaching.status === 'active') {
      await generateDuesForStudent(student, 'coaching');
    }
    if (student.library && student.library.hasMembership && student.library.status === 'active') {
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
  syncAllStudentsDues,
  cleanupDuplicateDues,
  cleanupAllDuplicateDues
};
