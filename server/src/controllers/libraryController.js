const Seat = require('../models/Seat');
const Student = require('../models/Student');
const Settings = require('../models/Settings');
const cache = require('../services/cacheService');

// Initialize or ensure seats match configured capacity
const initLibrarySeats = async (libraryType, targetCount) => {
  const existingSeats = await Seat.find({ libraryType }).sort({ seatNumber: 1 });
  const currentCount = existingSeats.length;

  if (currentCount < targetCount) {
    // Find missing seat numbers or append up to targetCount
    const existingNumbers = new Set(existingSeats.map(s => s.seatNumber));
    const toCreate = [];
    for (let i = 1; i <= targetCount; i++) {
      if (!existingNumbers.has(i)) {
        toCreate.push({
          libraryType,
          seatNumber: i,
          status: 'available',
          assignedStudent: null
        });
      }
    }
    if (toCreate.length > 0) {
      await Seat.insertMany(toCreate);
    }
  } else if (currentCount > targetCount) {
    // Shrink capacity: safely delete unassigned/unoccupied available/blocked seats above targetCount
    // Only delete seats above targetCount that are NOT occupied
    const seatsToDelete = await Seat.find({
      libraryType,
      seatNumber: { $gt: targetCount },
      status: { $ne: 'occupied' }
    });
    if (seatsToDelete.length > 0) {
      await Seat.deleteMany({
        _id: { $in: seatsToDelete.map(s => s._id) }
      });
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

    // Auto-heal orphaned occupied seats:
    // If a seat is marked 'occupied' but has no valid student, automatically release it
    for (const seat of seats) {
      if (seat.status === 'occupied' && !seat.assignedStudent) {
        seat.status = 'available';
        seat.assignedStudent = null;
        seat.assignedAt = null;
        await seat.save();
      }
    }

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

    // Invalidate dashboard cache for seat occupancy updates
    cache.invalidate('dashboard');

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

    // Invalidate dashboard cache
    cache.invalidate('dashboard');

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

    // Invalidate dashboard cache
    cache.invalidate('dashboard');

    const seats = await Seat.find({ libraryType }).sort({ seatNumber: 1 });
    const finalTotal = seats.length;
    const occupiedSeats = seats.filter(s => s.status === 'occupied').length;
    const blockedSeats = seats.filter(s => s.status === 'blocked').length;
    const availableSeats = seats.filter(s => s.status === 'available').length;

    return res.json({
      success: true,
      message: `${libraryType.toUpperCase()} library capacity updated to ${newCount} seats.`,
      stats: {
        totalSeats: finalTotal,
        occupiedSeats,
        availableSeats,
        blockedSeats,
        occupancyRate: finalTotal > 0 ? Math.round((occupiedSeats / finalTotal) * 100) : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/library/bulk-add
const bulkAddSeats = async (req, res) => {
  try {
    const { libraryType, count } = req.body;
    const addCount = Number(count);
    if (!libraryType || !['boys', 'girls'].includes(libraryType) || isNaN(addCount) || addCount < 1) {
      return res.status(400).json({ success: false, message: 'Valid library type and count (minimum 1) are required.' });
    }

    const existingSeats = await Seat.find({ libraryType }).sort({ seatNumber: 1 });
    const existingNumbers = new Set(existingSeats.map(s => s.seatNumber));
    let nextNum = 1;

    const toCreate = [];
    for (let i = 0; i < addCount; i++) {
      while (existingNumbers.has(nextNum)) {
        nextNum++;
      }
      toCreate.push({
        libraryType,
        seatNumber: nextNum,
        status: 'available',
        assignedStudent: null
      });
      existingNumbers.add(nextNum);
    }

    await Seat.insertMany(toCreate);

    const totalInDb = await Seat.countDocuments({ libraryType });
    const settings = await Settings.findOne() || new Settings();
    const capacityField = libraryType === 'boys' ? 'boysLibraryTotalSeats' : 'girlsLibraryTotalSeats';
    if (totalInDb > (settings[capacityField] || 0)) {
      settings[capacityField] = totalInDb;
      await settings.save();
    }

    cache.invalidate('dashboard');

    const seats = await Seat.find({ libraryType })
      .populate('assignedStudent', 'fullName studentId mobileNumber library')
      .sort({ seatNumber: 1 });
    const finalTotal = seats.length;
    const occupiedSeats = seats.filter(s => s.status === 'occupied').length;
    const blockedSeats = seats.filter(s => s.status === 'blocked').length;
    const availableSeats = seats.filter(s => s.status === 'available').length;

    return res.status(201).json({
      success: true,
      message: `Added ${addCount} seats to ${libraryType} library.`,
      stats: {
        totalSeats: finalTotal,
        occupiedSeats,
        availableSeats,
        blockedSeats,
        occupancyRate: finalTotal > 0 ? Math.round((occupiedSeats / finalTotal) * 100) : 0
      },
      seats
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/library/bulk-remove
const bulkRemoveSeats = async (req, res) => {
  try {
    const { libraryType, count } = req.body;
    const removeCount = Number(count);
    if (!libraryType || !['boys', 'girls'].includes(libraryType) || isNaN(removeCount) || removeCount < 1) {
      return res.status(400).json({ success: false, message: 'Valid library type and count (minimum 1) are required.' });
    }

    // Find unoccupied seats in descending seatNumber order
    const availableToRemove = await Seat.find({
      libraryType,
      status: { $ne: 'occupied' }
    }).sort({ seatNumber: -1 }).limit(removeCount);

    if (availableToRemove.length === 0) {
      return res.status(400).json({ success: false, message: 'No available or unoccupied seats can be removed.' });
    }

    const idsToDelete = availableToRemove.map(s => s._id);
    await Seat.deleteMany({ _id: { $in: idsToDelete } });

    const totalRemaining = await Seat.countDocuments({ libraryType });
    const settings = await Settings.findOne();
    if (settings) {
      const capacityField = libraryType === 'boys' ? 'boysLibraryTotalSeats' : 'girlsLibraryTotalSeats';
      settings[capacityField] = totalRemaining;
      await settings.save();
    }

    cache.invalidate('dashboard');

    const seats = await Seat.find({ libraryType })
      .populate('assignedStudent', 'fullName studentId mobileNumber library')
      .sort({ seatNumber: 1 });
    const finalTotal = seats.length;
    const occupiedSeats = seats.filter(s => s.status === 'occupied').length;
    const blockedSeats = seats.filter(s => s.status === 'blocked').length;
    const availableSeats = seats.filter(s => s.status === 'available').length;

    return res.json({
      success: true,
      message: `Removed ${availableToRemove.length} seats from ${libraryType} library.`,
      stats: {
        totalSeats: finalTotal,
        occupiedSeats,
        availableSeats,
        blockedSeats,
        occupancyRate: finalTotal > 0 ? Math.round((occupiedSeats / finalTotal) * 100) : 0
      },
      seats
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/library/add-seat
const addSeat = async (req, res) => {
  try {
    const { libraryType, seatNumber } = req.body;
    if (!libraryType || !['boys', 'girls'].includes(libraryType)) {
      return res.status(400).json({ success: false, message: 'Valid library type (boys/girls) is required' });
    }

    let targetSeatNumber = seatNumber ? Number(seatNumber) : null;

    if (!targetSeatNumber) {
      // Find highest current seatNumber
      const highestSeat = await Seat.findOne({ libraryType }).sort({ seatNumber: -1 });
      targetSeatNumber = (highestSeat ? highestSeat.seatNumber : 0) + 1;
    }

    // Check if seat already exists
    const existing = await Seat.findOne({ libraryType, seatNumber: targetSeatNumber });
    if (existing) {
      return res.status(400).json({ success: false, message: `Seat #${targetSeatNumber} already exists in ${libraryType} library.` });
    }

    const newSeat = await Seat.create({
      libraryType,
      seatNumber: targetSeatNumber,
      status: 'available',
      assignedStudent: null
    });

    // Update settings capacity if targetSeatNumber is higher than configured capacity
    const settings = await Settings.findOne() || new Settings();
    const capacityField = libraryType === 'boys' ? 'boysLibraryTotalSeats' : 'girlsLibraryTotalSeats';
    const totalCount = await Seat.countDocuments({ libraryType });
    if (totalCount > (settings[capacityField] || 0)) {
      settings[capacityField] = totalCount;
      await settings.save();
    }

    return res.status(201).json({
      success: true,
      message: `Seat #${targetSeatNumber} successfully added to ${libraryType} library.`,
      seat: newSeat
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/library/delete-seat
const deleteSeat = async (req, res) => {
  try {
    const { libraryType, seatNumber } = req.body;
    if (!libraryType || !seatNumber) {
      return res.status(400).json({ success: false, message: 'Library type and seat number are required' });
    }

    const seat = await Seat.findOne({ libraryType, seatNumber: Number(seatNumber) });
    if (!seat) {
      return res.status(404).json({ success: false, message: `Seat #${seatNumber} not found` });
    }

    if (seat.status === 'occupied' && seat.assignedStudent) {
      // Release student allocation before deleting
      await Student.findByIdAndUpdate(seat.assignedStudent, { 'library.seatNumber': null });
    }

    await Seat.findByIdAndDelete(seat._id);

    // Update settings capacity to match remaining seat count
    const totalCount = await Seat.countDocuments({ libraryType });
    const settings = await Settings.findOne();
    if (settings) {
      const capacityField = libraryType === 'boys' ? 'boysLibraryTotalSeats' : 'girlsLibraryTotalSeats';
      settings[capacityField] = totalCount;
      await settings.save();
    }

    return res.json({
      success: true,
      message: `Seat #${seatNumber} deleted successfully from ${libraryType} library.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/library/eligible-students
const getEligibleStudents = async (req, res) => {
  try {
    const { libraryType, search } = req.query;
    const type = libraryType || 'boys';

    let filter = {
      isArchived: false,
      'library.hasMembership': true
    };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { studentId: searchRegex },
        { mobileNumber: searchRegex }
      ];
    }

    const students = await Student.find(filter)
      .select('fullName studentId mobileNumber library membershipType')
      .sort({ fullName: 1 });

    return res.json({
      success: true,
      count: students.length,
      data: students
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
  configureCapacity,
  addSeat,
  deleteSeat,
  bulkAddSeats,
  bulkRemoveSeats,
  getEligibleStudents
};
