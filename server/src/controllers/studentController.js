const Student = require('../models/Student');
const Seat = require('../models/Seat');
const FeeDue = require('../models/FeeDue');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const cache = require('../services/cacheService');
const { generateDuesForStudent } = require('../services/billingService');

const { generateStudentId, reassignStudentIdIfNeeded } = require('../services/codeService');

// GET /api/students
const getStudents = async (req, res) => {
  try {
    const { search, membershipType, libraryType } = req.query;
    let query = { isArchived: false };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { fatherName: searchRegex },
        { mobileNumber: searchRegex },
        { studentId: searchRegex }
      ];
    }

    if (membershipType && membershipType !== 'all') {
      query.membershipType = membershipType;
    }

    if (libraryType && libraryType !== 'all') {
      query['library.libraryType'] = libraryType;
    }

    const students = await Student.find(query).sort({ createdAt: -1 });

    // Fetch outstanding balance for each student
    const studentIds = students.map(s => s._id);
    const dues = await FeeDue.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $group: { _id: '$student', totalRemaining: { $sum: '$remainingAmount' } } }
    ]);

    const duesMap = {};
    dues.forEach(d => { duesMap[d._id.toString()] = d.totalRemaining; });

    const results = students.map(s => ({
      ...s.toObject(),
      totalOutstanding: duesMap[s._id.toString()] || 0
    }));

    return res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/students/:id
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.isArchived) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Auto sync dues on view to guarantee up-to-date billing periods
    if (student.coaching?.hasMembership) {
      await generateDuesForStudent(student, 'coaching');
    }
    if (student.library?.hasMembership) {
      await generateDuesForStudent(student, 'library');
    }

    const dues = await FeeDue.find({ student: student._id }).sort({ dueDate: -1 });
    const payments = await Payment.find({ student: student._id }).sort({ paymentDate: -1 });

    const totalBilled = dues.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaid = payments.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const totalOutstanding = dues.reduce((acc, curr) => acc + curr.remainingAmount, 0);

    return res.json({
      success: true,
      data: {
        student,
        dues,
        payments,
        summary: {
          totalBilled,
          totalPaid,
          totalOutstanding
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/students
const createStudent = async (req, res) => {
  try {
    const {
      fullName,
      fatherName,
      dateOfBirth,
      mobileNumber,
      address,
      studentJoiningDate,
      membershipType,
      coachingMonthlyFee,
      coachingJoiningDate,
      coachingStatus,
      libraryType,
      libraryMonthlyFee,
      libraryJoiningDate,
      seatNumber,
      libraryStatus
    } = req.body;

    // Validation - only fullName and membershipType are mandatory
    if (!fullName || !fullName.trim() || !membershipType) {
      return res.status(400).json({ success: false, message: 'Full name and membership selection are required.' });
    }

    if (!['coaching_only', 'library_only', 'coaching_and_library'].includes(membershipType)) {
      return res.status(400).json({ success: false, message: 'Invalid membership type selected.' });
    }

    // Mobile check - optional
    const cleanMobile = mobileNumber ? mobileNumber.trim() : '';
    if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number, or leave it blank.' });
    }

    // Duplicate detection: Only if mobile number is provided
    if (cleanMobile) {
      const existingStudent = await Student.findOne({
        mobileNumber: cleanMobile,
        isArchived: false
      });

      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: `A student named "${existingStudent.fullName}" is already registered with mobile number ${cleanMobile} (Student ID: ${existingStudent.studentId}). Please manage the existing student record instead of creating a duplicate.`,
          existingStudent: {
            id: existingStudent._id,
            studentId: existingStudent.studentId,
            fullName: existingStudent.fullName
          }
        });
      }
    }

    const studentId = await generateStudentId(membershipType);

    const hasCoaching = membershipType === 'coaching_only' || membershipType === 'coaching_and_library';
    const hasLibrary = membershipType === 'library_only' || membershipType === 'coaching_and_library';

    if (hasCoaching && (!coachingMonthlyFee || coachingMonthlyFee <= 0)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid coaching monthly fee.' });
    }

    if (hasLibrary && (!libraryMonthlyFee || libraryMonthlyFee <= 0)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid library monthly fee.' });
    }

    // Check Seat Allocation if seat specified
    let allocatedSeat = null;
    if (hasLibrary && seatNumber) {
      const selectedLibType = libraryType || 'boys';
      const seat = await Seat.findOne({ libraryType: selectedLibType, seatNumber: Number(seatNumber) });
      if (!seat) {
        return res.status(400).json({ success: false, message: `Seat #${seatNumber} does not exist in ${selectedLibType} library.` });
      }
      if (seat.status === 'blocked') {
        return res.status(400).json({ success: false, message: `Seat #${seatNumber} is currently blocked.` });
      }
      if (seat.status === 'occupied') {
        return res.status(400).json({ success: false, message: `Seat #${seatNumber} is already occupied by another student.` });
      }
      allocatedSeat = seat;
    }

    const student = await Student.create({
      studentId,
      fullName: fullName.trim(),
      fatherName: fatherName ? fatherName.trim() : '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      mobileNumber: cleanMobile,
      address: address ? address.trim() : '',
      studentJoiningDate: studentJoiningDate ? new Date(studentJoiningDate) : new Date(),
      membershipType,
      coaching: {
        hasMembership: hasCoaching,
        monthlyFee: hasCoaching ? Number(coachingMonthlyFee) : 0,
        joiningDate: hasCoaching ? (coachingJoiningDate ? new Date(coachingJoiningDate) : new Date()) : null,
        status: coachingStatus || 'active'
      },
      library: {
        hasMembership: hasLibrary,
        libraryType: libraryType || 'boys',
        monthlyFee: hasLibrary ? Number(libraryMonthlyFee) : 0,
        joiningDate: hasLibrary ? (libraryJoiningDate ? new Date(libraryJoiningDate) : new Date()) : null,
        status: libraryStatus || 'active',
        seatNumber: allocatedSeat ? allocatedSeat.seatNumber : null
      }
    });

    // Mark seat occupied if allocated
    if (allocatedSeat) {
      allocatedSeat.status = 'occupied';
      allocatedSeat.assignedStudent = student._id;
      allocatedSeat.assignedAt = new Date();
      await allocatedSeat.save();
    }

    // Generate initial dues immediately
    if (student.coaching.hasMembership) {
      await generateDuesForStudent(student, 'coaching');
    }
    if (student.library.hasMembership) {
      await generateDuesForStudent(student, 'library');
    }

    // Invalidate dashboard and stats cache
    cache.invalidate('dashboard');

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: student
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/students/:id
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.isArchived) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const {
      fullName,
      fatherName,
      dateOfBirth,
      mobileNumber,
      address,
      studentJoiningDate,
      membershipType,
      coachingMonthlyFee,
      coachingJoiningDate,
      coachingStatus,
      libraryType,
      libraryMonthlyFee,
      libraryJoiningDate,
      seatNumber,
      libraryStatus,
      advanceFeeBalance
    } = req.body;

    if (fullName) student.fullName = fullName.trim();
    if (fatherName !== undefined) student.fatherName = fatherName.trim();
    if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (mobileNumber !== undefined) student.mobileNumber = mobileNumber.trim();
    if (address !== undefined) student.address = address.trim();
    if (studentJoiningDate) student.studentJoiningDate = new Date(studentJoiningDate);
    if (advanceFeeBalance !== undefined) student.advanceFeeBalance = Number(advanceFeeBalance);

    if (membershipType) {
      await reassignStudentIdIfNeeded(student, membershipType);
      student.membershipType = membershipType;
      const hasCoaching = membershipType === 'coaching_only' || membershipType === 'coaching_and_library';
      const hasLibrary = membershipType === 'library_only' || membershipType === 'coaching_and_library';

      student.coaching.hasMembership = hasCoaching;
      student.library.hasMembership = hasLibrary;

      // If library was removed, free up assigned seat automatically
      if (!hasLibrary && student.library.seatNumber) {
        const oldSeat = await Seat.findOne({
          libraryType: student.library.libraryType,
          seatNumber: student.library.seatNumber
        });
        if (oldSeat && oldSeat.assignedStudent?.toString() === student._id.toString()) {
          oldSeat.status = 'available';
          oldSeat.assignedStudent = null;
          oldSeat.assignedAt = null;
          await oldSeat.save();
        }
        student.library.seatNumber = null;
      }
    }

    if (coachingMonthlyFee !== undefined) student.coaching.monthlyFee = Number(coachingMonthlyFee);
    if (coachingJoiningDate) student.coaching.joiningDate = new Date(coachingJoiningDate);
    if (coachingStatus) student.coaching.status = coachingStatus;

    if (libraryMonthlyFee !== undefined) student.library.monthlyFee = Number(libraryMonthlyFee);
    if (libraryJoiningDate) student.library.joiningDate = new Date(libraryJoiningDate);
    if (libraryStatus) student.library.status = libraryStatus;
    if (libraryType) student.library.libraryType = libraryType;

    // Handle seat reallocation safely
    if (seatNumber !== undefined && student.library.hasMembership) {
      const newSeatNum = seatNumber ? Number(seatNumber) : null;
      const currentSeatNum = student.library.seatNumber;

      if (newSeatNum !== currentSeatNum) {
        // Free old seat
        if (currentSeatNum) {
          const oldSeat = await Seat.findOne({
            libraryType: student.library.libraryType,
            seatNumber: currentSeatNum
          });
          if (oldSeat && oldSeat.assignedStudent?.toString() === student._id.toString()) {
            oldSeat.status = 'available';
            oldSeat.assignedStudent = null;
            oldSeat.assignedAt = null;
            await oldSeat.save();
          }
        }

        // Occupy new seat
        if (newSeatNum) {
          const newSeat = await Seat.findOne({
            libraryType: student.library.libraryType,
            seatNumber: newSeatNum
          });
          if (!newSeat || newSeat.status === 'blocked' || (newSeat.status === 'occupied' && newSeat.assignedStudent?.toString() !== student._id.toString())) {
            return res.status(400).json({ success: false, message: `Seat #${newSeatNum} is not available.` });
          }
          newSeat.status = 'occupied';
          newSeat.assignedStudent = student._id;
          newSeat.assignedAt = new Date();
          await newSeat.save();
          student.library.seatNumber = newSeatNum;
        } else {
          student.library.seatNumber = null;
        }
      }
    }

    await student.save();

    // Re-sync dues
    if (student.coaching.hasMembership) await generateDuesForStudent(student, 'coaching');
    if (student.library.hasMembership) await generateDuesForStudent(student, 'library');

    // Invalidate dashboard cache
    cache.invalidate('dashboard');

    return res.json({ success: true, message: 'Student updated successfully', data: student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/students/:id (Safeguarded deletion workflow)
const deleteStudent = async (req, res) => {
  try {
    const { archiveConfirmed } = req.body;
    if (!archiveConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Student deletion requires exporting their financial records and providing explicit confirmation.'
      });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Release any allocated seat
    if (student.library?.seatNumber) {
      const seat = await Seat.findOne({
        libraryType: student.library.libraryType,
        seatNumber: student.library.seatNumber
      });
      if (seat && seat.assignedStudent?.toString() === student._id.toString()) {
        seat.status = 'available';
        seat.assignedStudent = null;
        seat.assignedAt = null;
        await seat.save();
      }
    }

    // Soft delete/archive student to preserve historical fee dues and payments for accounting
    student.isArchived = true;
    student.archivedAt = new Date();
    await student.save();

    // Audit log
    await AuditLog.create({
      action: 'DELETE_STUDENT_ARCHIVE',
      performedBy: req.admin?.email || 'Admin',
      details: {
        studentId: student.studentId,
        fullName: student.fullName,
        archivedAt: student.archivedAt
      },
      ipAddress: req.ip
    });

    // Invalidate dashboard cache
    cache.invalidate('dashboard');

    return res.json({
      success: true,
      message: `Student ${student.fullName} archived safely. Financial and payment history preserved.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};
