const Student = require('../models/Student');
const Payment = require('../models/Payment');

/**
 * Resolves the service prefix:
 * - Library Only: 'L1'
 * - Coaching Only: 'C1'
 * - Both (Coaching & Library): 'LC1'
 */
function getServicePrefix(serviceOrStudent) {
  if (!serviceOrStudent) return 'C1';

  if (typeof serviceOrStudent === 'string') {
    const s = serviceOrStudent.toLowerCase();
    if (s === 'library' || s === 'library_only') return 'L1';
    if (s === 'coaching_and_library' || s === 'both') return 'LC1';
    return 'C1';
  }

  const s = serviceOrStudent;
  const hasCoaching = s.membershipType === 'coaching_only' || s.membershipType === 'coaching_and_library' || (s.coaching && s.coaching.hasMembership && s.coaching.status !== 'inactive');
  const hasLibrary = s.membershipType === 'library_only' || s.membershipType === 'coaching_and_library' || (s.library && s.library.hasMembership && s.library.status !== 'inactive');

  if (hasCoaching && hasLibrary) return 'LC1';
  if (hasLibrary) return 'L1';
  return 'C1';
}

/**
 * Generates unique Student ID based on service prefix (e.g. L1-1001, C1-1001, LC1-1001)
 */
async function generateStudentId(serviceOrStudent) {
  const prefix = getServicePrefix(serviceOrStudent);
  const count = await Student.countDocuments({ studentId: new RegExp(`^${prefix}-`) });
  let candidateNum = count + 1001;
  let id = `${prefix}-${candidateNum}`;

  while (await Student.findOne({ studentId: id })) {
    candidateNum++;
    id = `${prefix}-${candidateNum}`;
  }
  return id;
}

/**
 * Re-assigns student ID if student joins or leaves coaching/library
 */
async function reassignStudentIdIfNeeded(student, newMembershipType) {
  const expectedPrefix = getServicePrefix(newMembershipType || student);
  if (!student.studentId || !student.studentId.startsWith(`${expectedPrefix}-`)) {
    const newId = await generateStudentId(newMembershipType || student);
    student.studentId = newId;
    return newId;
  }
  return student.studentId;
}

/**
 * Generates unique Receipt Number based on service prefix:
 * - Library: L1-...
 * - Coaching: C1-...
 * - Both: LC1-...
 */
async function generateReceiptNumber(serviceOrStudent) {
  const prefix = getServicePrefix(serviceOrStudent);
  const today = new Date();
  const yearStr = today.getFullYear().toString().slice(-2);
  const count = await Payment.countDocuments({ receiptNumber: new RegExp(`^${prefix}-`) });
  let candidateNum = count + 1001;
  let candidate = `${prefix}-${yearStr}-${candidateNum}`;

  while (await Payment.findOne({ receiptNumber: candidate })) {
    candidateNum++;
    candidate = `${prefix}-${yearStr}-${candidateNum}`;
  }
  return candidate;
}

/**
 * Evaluates cycle status based on cycle period and remaining amount:
 * - If remainingAmount === 0: 'paid'
 * - If today is strictly past periodEnd (entire month completed): 'overdue'
 * - If today is within running month (periodStart <= today <= periodEnd): 'due'
 */
function getCycleStatus(feeDue) {
  if (feeDue.remainingAmount === 0 || feeDue.status === 'paid') return 'paid';

  const now = new Date();
  const end = new Date(feeDue.periodEndDate || feeDue.dueDate);
  end.setHours(23, 59, 59, 999);

  if (now > end) {
    return 'overdue';
  }
  return 'due';
}

module.exports = {
  getServicePrefix,
  generateStudentId,
  reassignStudentIdIfNeeded,
  generateReceiptNumber,
  getCycleStatus
};
