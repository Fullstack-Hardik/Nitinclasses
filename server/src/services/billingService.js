const FeeDue = require('../models/FeeDue');

/**
 * Calculates recurring billing date taking care of month-end adjustments.
 * E.g., if anniversary day is 31st, for February it uses 28/29, for April 30.
 */
function getAnniversaryDate(year, monthIndex, targetDay) {
  // Days in monthIndex (0-based)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const validDay = Math.min(targetDay, daysInMonth);
  return new Date(year, monthIndex, validDay);
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

  const joiningDate = new Date(service.joiningDate);
  const now = new Date();
  const feeAmount = service.monthlyFee;
  const anniversaryDay = joiningDate.getDate();

  const generatedDues = [];

  // Start from joining month/year up to current month/year
  let currentYear = joiningDate.getFullYear();
  let currentMonth = joiningDate.getMonth();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  while (
    currentYear < nowYear ||
    (currentYear === nowYear && currentMonth <= nowMonth)
  ) {
    const periodStart = getAnniversaryDate(currentYear, currentMonth, anniversaryDay);

    // CRITICAL: If the period start date is still in the future, do not generate it yet!
    // A fee cycle only becomes due once the anniversary day has actually arrived.
    if (periodStart > now) {
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
    const startStr = periodStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const endStr = periodEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
      const initialStatus = isPastDue ? 'overdue' : 'due';

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
    } else {
      // Update status if overdue and unpaid
      if (existing.remainingAmount > 0 && existing.dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()) && existing.status === 'due') {
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
