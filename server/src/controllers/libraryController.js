const Seat = require('../models/Seat');
const Student = require('../models/Student');
const Settings = require('../models/Settings');

// Initialize or ensure seats match configured capacity
const initLibrarySeats = async (libraryType, targetCount) => {
  const existingSeats = await Seat.find({ libraryType }).sort({ seatNumber: 1 });
  const currentCount = existingSeats.length;

  if (currentCount < targetCount) {
    const toCreate = [];
    for (let i = currentCount + 1; i <= targetCount; i++) {
      toCreate.push({
        libraryType,
        seatNumber: i,
        status: 'available',
        assignedStudent: null
      });
    }
    if (toCreate.length > 0) {
      await Seat.insertMany(toCreate);
    }
  }
};

// GET /api/library/overview
const getLibraryOverview = async (req, res) => {
  try {
    const { libraryType } = req.query; // 'boys' | 'girls'
    const type = libraryType || 'boys';

    const settings = await Settings.findOne();
    const configuredCapacity = type === 'boys'
      ? (settings?.boysLibraryTotalSeats || 50)
      : (settings?.girlsLibraryTotalSeats || 50);

    // Auto-ensure seats exist up to configuredCapacity
    await initLibrarySeats(type, configuredCapacity);

    const seats = await Seat.find({ libraryType: type })
      .populate('assignedStudent', 'fullName studentId mobileNumber library')
      .sort({ seatNumber: 1 });

    const totalSeats = seats.length;
    const occupiedSeats = seats.filter(s => s.status === 'occupied').length;
    const blockedSeats = seats.filter(s => s.status === 'blocked').length;
    const availableSeats = seats.filter(s => s.status === 'available').length;

    return res.json({
      success: true,
      libraryType: type,
      stats: {
        totalSeats,
        occupiedSeats,
        availableSeats,
        blockedSeats,
        occupancyRate: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0
      },
      seats
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/library/allocate
const allocateSeat = async (req, res) => {
  try {
    const { libraryType, seatNumber, studentId } = req.body;

    if (!libraryType || !seatNumber || !studentId) {
      return res.status(400).json({ success: false, message: 'Library type, seat number, and student ID are required' });
    }

    const student = await Student.findById(studentId);
    if (!student || student.isArchived) {
      return res.status(404).json({ success: false, message: 'Student not found or is archived' });
    }

    if (!student.library?.hasMembership) {
      return res.status(400).json({ success: false, message: 'Student does not have an active Library membership.' });
    }

    const seat = await Seat.findOne({ libraryType, seatNumber: Number(seatNumber) });
    if (!seat) {
      return res.status(404).json({ success: false, message: `Seat #${seatNumber} does not exist.` });
    }

    if (seat.status === 'blocked') {
      return res.status(400).json({ success: false, message: `Seat #${seatNumber} is blocked and cannot be allocated.` });
    }

    if (seat.status === 'occupied' && seat.assignedStudent?.toString() !== student._id.toString()) {
      return res.status(400).json({ success: false, message: `Seat #${seatNumber} is already occupied.` });
    }

    // Release any prior seat assigned to this student
    if (student.library.seatNumber && student.library.seatNumber !== Number(seatNumber)) {
      await Seat.findOneAndUpdate(
        { libraryType, seatNumber: student.library.seatNumber },
        { status: 'available', assignedStudent: null, assignedAt: null }
      );
    }

    // Allocate new seat
    seat.status = 'occupied';
    seat.assignedStudent = student._id;
    seat.assignedAt = new Date();
    await seat.save();

    student.library.seatNumber = Number(seatNumber);
    student.library.libraryType = libraryType;
    await student.save();

    return res.json({
      success: true,
      message: `Seat #${seatNumber} successfully allocated to ${student.fullName}.`,
      seat
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/library/release
const releaseSeat = async (req, res) => {
  try {
    const { libraryType, seatNumber } = req.body;

    const seat = await Seat.findOne({ libraryType, seatNumber: Number(seatNumber) });
    if (!seat) {
      return res.status(404).json({ success: false, message: 'Seat not found' });
    }

    if (seat.assignedStudent) {
      await Student.findByIdAndUpdate(seat.assignedStudent, { 'library.seatNumber': null });
    }

    seat.status = 'available';
    seat.assignedStudent = null;
    seat.assignedAt = null;
    await seat.save();

    return res.json({ success: true, message: `Seat #${seatNumber} is now released and available.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/library/toggle-block
const toggleBlockSeat = async (req, res) => {
  try {
    const { libraryType, seatNumber, notes } = req.body;
    const seat = await Seat.findOne({ libraryType, seatNumber: Number(seatNumber) });
    if (!seat) {
      return res.status(404).json({ success: false, message: 'Seat not found' });
    }

    if (seat.status === 'occupied') {
      return res.status(400).json({ success: false, message: 'Cannot block an occupied seat. Release or reallocate the student first.' });
    }

    const newStatus = seat.status === 'blocked' ? 'available' : 'blocked';
    seat.status = newStatus;
    if (notes) seat.notes = notes;
    await seat.save();

    return res.json({
      success: true,
      message: `Seat #${seatNumber} is now ${newStatus}.`,
      seat
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/library/configure-capacity
const configureCapacity = async (req, res) => {
  try {
    const { libraryType, totalSeats } = req.body;
    const newCount = Number(totalSeats);

    if (!libraryType || isNaN(newCount) || newCount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid total seats capacity.' });
    }

    const settings = await Settings.findOne() || new Settings();
    if (libraryType === 'boys') {
      settings.boysLibraryTotalSeats = newCount;
    } else {
      settings.girlsLibraryTotalSeats = newCount;
    }
    await settings.save();

    // Adjust seat documents
    await initLibrarySeats(libraryType, newCount);

    return res.json({
      success: true,
      message: `${libraryType.toUpperCase()} library capacity updated to ${newCount} seats.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLibraryOverview,
  allocateSeat,
  releaseSeat,
  toggleBlockSeat,
  configureCapacity
};
