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
      girlsLibraryTotalSeats
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
    if (boysLibraryTotalSeats) settings.boysLibraryTotalSeats = Number(boysLibraryTotalSeats);
    if (girlsLibraryTotalSeats) settings.girlsLibraryTotalSeats = Number(girlsLibraryTotalSeats);

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

module.exports = {
  getSettings,
  updateSettings,
  exportStudentsExcel,
  exportPaymentsExcel,
  exportStudentArchive
};
