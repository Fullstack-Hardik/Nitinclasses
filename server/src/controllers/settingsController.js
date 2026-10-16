const Settings = require('../models/Settings');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const FeeDue = require('../models/FeeDue');
const Seat = require('../models/Seat');
const ExcelJS = require('exceljs');

// GET /api/settings
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const {
      instituteName,
      contactNumber,
      email,
      address,
      receiptPrefix,
      receiptFooterNote,
      boysLibraryTotalSeats,
      girlsLibraryTotalSeats,
      smartModeEnabled,
      adminNotes,
      adminNoteFiles,
      adminTodos
    } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (instituteName) settings.instituteName = instituteName;
    if (contactNumber) settings.contactNumber = contactNumber;
    if (email) settings.email = email;
    if (address) settings.address = address;
    if (receiptPrefix) settings.receiptPrefix = receiptPrefix;
    if (receiptFooterNote) settings.receiptFooterNote = receiptFooterNote;
    if (boysLibraryTotalSeats !== undefined) settings.boysLibraryTotalSeats = Number(boysLibraryTotalSeats);
    if (girlsLibraryTotalSeats !== undefined) settings.girlsLibraryTotalSeats = Number(girlsLibraryTotalSeats);
    if (smartModeEnabled !== undefined) settings.smartModeEnabled = Boolean(smartModeEnabled);
    if (adminNotes !== undefined) settings.adminNotes = adminNotes;
    if (adminNoteFiles !== undefined) settings.adminNoteFiles = adminNoteFiles;
    if (adminTodos !== undefined) settings.adminTodos = adminTodos;

    await settings.save();
    return res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/settings/export/students
const exportStudentsExcel = async (req, res) => {
  try {
    const students = await Student.find({ isArchived: false }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');

    sheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 14 },
      { header: 'Full Name', key: 'fullName', width: 22 },
      { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
      { header: 'Date of Birth', key: 'dob', width: 14 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Membership Type', key: 'membershipType', width: 20 },
      { header: 'Coaching Fee', key: 'coachingFee', width: 14 },
      { header: 'Coaching Status', key: 'coachingStatus', width: 15 },
      { header: 'Library Type', key: 'libraryType', width: 14 },
      { header: 'Library Fee', key: 'libraryFee', width: 14 },
      { header: 'Assigned Seat', key: 'seatNumber', width: 14 },
      { header: 'Library Status', key: 'libraryStatus', width: 15 },
      { header: 'Joining Date', key: 'joiningDate', width: 14 }
    ];

    students.forEach(s => {
      sheet.addRow({
        studentId: s.studentId,
        fullName: s.fullName,
        mobileNumber: s.mobileNumber,
        dob: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-GB') : '',
        address: s.address,
        membershipType: s.membershipType,
        coachingFee: s.coaching?.hasMembership ? s.coaching.monthlyFee : 0,
        coachingStatus: s.coaching?.hasMembership ? s.coaching.status : 'N/A',
        libraryType: s.library?.hasMembership ? s.library.libraryType : 'N/A',
        libraryFee: s.library?.hasMembership ? s.library.monthlyFee : 0,
        seatNumber: s.library?.hasMembership && s.library.seatNumber ? `#${s.library.seatNumber}` : 'None',
        libraryStatus: s.library?.hasMembership ? s.library.status : 'N/A',
        joiningDate: s.studentJoiningDate ? new Date(s.studentJoiningDate).toLocaleDateString('en-GB') : ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Students_Export.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/settings/export/payments
const exportPaymentsExcel = async (req, res) => {
  try {
    const payments = await Payment.find().populate('student').sort({ paymentDate: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payments');

    sheet.columns = [
      { header: 'Receipt No', key: 'receiptNumber', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Student ID', key: 'studentId', width: 14 },
      { header: 'Student Name', key: 'studentName', width: 22 },
      { header: 'Service', key: 'serviceType', width: 12 },
      { header: 'Billing Period', key: 'billingPeriod', width: 28 },
      { header: 'Fee Amount (INR)', key: 'originalFee', width: 16 },
      { header: 'Amount Paid (INR)', key: 'amountPaid', width: 16 },
      { header: 'Remaining Balance (INR)', key: 'balance', width: 22 },
      { header: 'Payment Method', key: 'method', width: 14 },
      { header: 'UPI Reference', key: 'upiRef', width: 20 }
    ];

    payments.forEach(p => {
      sheet.addRow({
        receiptNumber: p.receiptNumber,
        date: new Date(p.paymentDate).toLocaleDateString('en-GB'),
        studentId: p.student?.studentId || 'N/A',
        studentName: p.student?.fullName || 'N/A',
        serviceType: p.serviceType.toUpperCase(),
        billingPeriod: p.billingPeriod,
        originalFee: p.originalFeeAmount,
        amountPaid: p.amountPaid,
        balance: p.remainingBalance,
        method: p.paymentMethod.toUpperCase(),
        upiRef: p.upiTransactionRef || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Payments_Export.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/settings/export/student-archive/:id (For deletion safeguard verification)
const exportStudentArchive = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const dues = await FeeDue.find({ student: student._id });
    const payments = await Payment.find({ student: student._id });

    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Personal Profile
    const profileSheet = workbook.addWorksheet('Student Profile');
    profileSheet.columns = [
      { header: 'Field', key: 'field', width: 22 },
      { header: 'Value', key: 'value', width: 35 }
    ];
    profileSheet.addRows([
      { field: 'Student ID', value: student.studentId },
      { field: 'Full Name', value: student.fullName },
      { field: 'Mobile Number', value: student.mobileNumber },
      { field: 'Date of Birth', value: student.dateOfBirth?.toLocaleDateString('en-GB') },
      { field: 'Address', value: student.address },
      { field: 'Membership Type', value: student.membershipType },
      { field: 'Coaching Monthly Fee', value: student.coaching?.monthlyFee },
      { field: 'Library Monthly Fee', value: student.library?.monthlyFee },
      { field: 'Assigned Library Seat', value: student.library?.seatNumber || 'None' }
    ]);

    // Sheet 2: Payments
    const paySheet = workbook.addWorksheet('Payment History');
    paySheet.columns = [
      { header: 'Receipt No', key: 'rec', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Service', key: 'service', width: 14 },
      { header: 'Period', key: 'period', width: 28 },
      { header: 'Amount Paid', key: 'amt', width: 15 },
      { header: 'Method', key: 'method', width: 12 }
    ];
    payments.forEach(p => {
      paySheet.addRow({
        rec: p.receiptNumber,
        date: new Date(p.paymentDate).toLocaleDateString('en-GB'),
        service: p.serviceType,
        period: p.billingPeriod,
        amt: p.amountPaid,
        method: p.paymentMethod
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Archive_${student.studentId}_${student.fullName.replace(/\s+/g, '_')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const cache = require('../services/cacheService');
const { getCycleStatus } = require('../services/codeService');

const verifyAdminPassword = async (adminId, password) => {
  if (!password) {
    throw new Error('Admin password is required to authorize this action.');
  }
  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new Error('Admin account not found.');
  }
  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    throw new Error('Incorrect Admin Password. Action aborted.');
  }
  return admin;
};

// POST /api/settings/danger/wipe-payments
const dangerWipePayments = async (req, res) => {
  try {
    const admin = await verifyAdminPassword(req.admin._id, req.body.password);

    const deletedPaymentsCount = await Payment.countDocuments();
    await Payment.deleteMany({});

    // Reset student advance balances
    await Student.updateMany({}, { advanceFeeBalance: 0 });

    // Reset fee dues: paidAmount = 0, remainingAmount = amount, status recalculated
    const dues = await FeeDue.find({});
    for (const due of dues) {
      due.paidAmount = 0;
      due.remainingAmount = due.amount;
      due.status = getCycleStatus(due);
      await due.save();
    }

    cache.clear();

    await AuditLog.create({
      action: 'DANGER_WIPE_PAYMENTS',
      performedBy: admin.email,
      details: { deletedPaymentsCount },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Cleared ${deletedPaymentsCount} payment receipts. Dues have been reset to unpaid.`
    });
  } catch (error) {
    return res.status(error.message.includes('Password') || error.message.includes('password') ? 401 : 500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/settings/danger/wipe-students
const dangerWipeStudents = async (req, res) => {
  try {
    const admin = await verifyAdminPassword(req.admin._id, req.body.password);

    const studentCount = await Student.countDocuments();
    await Student.deleteMany({});
    await FeeDue.deleteMany({});
    await Payment.deleteMany({});
    await Seat.updateMany({}, { status: 'available', assignedStudent: null, assignedAt: null });

    cache.clear();

    await AuditLog.create({
      action: 'DANGER_WIPE_STUDENTS',
      performedBy: admin.email,
      details: { deletedStudentsCount: studentCount },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Deleted all ${studentCount} students, fee dues, payments, and unassigned library seats.`
    });
  } catch (error) {
    return res.status(error.message.includes('Password') || error.message.includes('password') ? 401 : 500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/settings/danger/wipe-all
const dangerWipeAll = async (req, res) => {
  try {
    const admin = await verifyAdminPassword(req.admin._id, req.body.password);

    await Student.deleteMany({});
    await FeeDue.deleteMany({});
    await Payment.deleteMany({});
    await Seat.updateMany({}, { status: 'available', assignedStudent: null, assignedAt: null });
    await AuditLog.deleteMany({});

    cache.clear();

    await AuditLog.create({
      action: 'DANGER_WIPE_ALL',
      performedBy: admin.email,
      details: { timestamp: new Date() },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'All application data (students, payments, fees, seats) has been completely wiped.'
    });
  } catch (error) {
    return res.status(error.message.includes('Password') || error.message.includes('password') ? 401 : 500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  exportStudentsExcel,
  exportPaymentsExcel,
  exportStudentArchive,
  dangerWipePayments,
  dangerWipeStudents,
  dangerWipeAll
};
