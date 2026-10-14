const Student = require('../models/Student');
const Payment = require('../models/Payment');
const FeeDue = require('../models/FeeDue');
const Seat = require('../models/Seat');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const { range } = req.query; // 'today' | 'this_month' | 'this_year' | 'all'

    // Real DB Counts
    const totalStudents = await Student.countDocuments({ isArchived: false });
    const coachingStudents = await Student.countDocuments({
      isArchived: false,
      'coaching.hasMembership': true,
      'coaching.status': 'active'
    });
    const libraryStudents = await Student.countDocuments({
      isArchived: false,
      'library.hasMembership': true,
      'library.status': 'active'
    });

    // Library Occupancies
    const boysSeats = await Seat.find({ libraryType: 'boys' });
    const boysOccupied = boysSeats.filter(s => s.status === 'occupied').length;
    const boysTotal = boysSeats.length || 50;

    const girlsSeats = await Seat.find({ libraryType: 'girls' });
    const girlsOccupied = girlsSeats.filter(s => s.status === 'occupied').length;
    const girlsTotal = girlsSeats.length || 50;

    // Collections calculation
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Week boundaries (Monday to Sunday)
    const dayOfWeek = startOfToday.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const mondayOfWeek = new Date(startOfToday);
    mondayOfWeek.setDate(startOfToday.getDate() + diffToMonday);
    const sundayOfWeek = new Date(mondayOfWeek);
    sundayOfWeek.setDate(mondayOfWeek.getDate() + 7);

    // Upcoming reminder window (Tomorrow up to 7 days ahead)
    const upcomingEnd = new Date(startOfToday);
    upcomingEnd.setDate(startOfToday.getDate() + 8);

    const [todayPayments] = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);

    const [monthPayments] = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);

    // Outstanding and Overdue fees
    const [outstandingDues] = await FeeDue.aggregate([
      { $match: { remainingAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);

    const [overdueDues] = await FeeDue.aggregate([
      { $match: { remainingAmount: { $gt: 0 }, dueDate: { $lt: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);

    // Actionable Action Lists: Due Today, Due This Week, Upcoming
    const dueTodayList = await FeeDue.find({
      remainingAmount: { $gt: 0 },
      dueDate: { $gte: startOfToday, $lt: tomorrow }
    }).populate('student', 'fullName studentId mobileNumber').sort({ dueDate: 1 }).limit(10);

    const dueThisWeekList = await FeeDue.find({
      remainingAmount: { $gt: 0 },
      dueDate: { $gte: mondayOfWeek, $lt: sundayOfWeek }
    }).populate('student', 'fullName studentId mobileNumber').sort({ dueDate: 1 }).limit(15);

    const upcomingList = await FeeDue.find({
      remainingAmount: { $gt: 0 },
      dueDate: { $gte: tomorrow, $lt: upcomingEnd }
    }).populate('student', 'fullName studentId mobileNumber').sort({ dueDate: 1 }).limit(10);

    // Coaching vs Library Collections breakdown
    const breakdown = await Payment.aggregate([
      {
        $group: {
          _id: '$serviceType',
          totalAmount: { $sum: '$amountPaid' }
        }
      }
    ]);

    const coachingCollection = breakdown.find(b => b._id === 'coaching')?.totalAmount || 0;
    const libraryCollection = breakdown.find(b => b._id === 'library')?.totalAmount || 0;

    // Recent 6 Months Trend
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyTrend = await Payment.aggregate([
      { $match: { paymentDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          total: { $sum: '$amountPaid' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          coachingStudents,
          libraryStudents,
          totalFeesCollectedToday: todayPayments ? todayPayments.total : 0,
          totalFeesCollectedThisMonth: monthPayments ? monthPayments.total : 0,
          totalOutstandingFees: outstandingDues ? outstandingDues.total : 0,
          overdueFees: overdueDues ? overdueDues.total : 0,
          boysLibraryOccupancy: {
            occupied: boysOccupied,
            total: boysTotal,
            percentage: boysTotal > 0 ? Math.round((boysOccupied / boysTotal) * 100) : 0
          },
          girlsLibraryOccupancy: {
            occupied: girlsOccupied,
            total: girlsTotal,
            percentage: girlsTotal > 0 ? Math.round((girlsOccupied / girlsTotal) * 100) : 0
          }
        },
        breakdown: {
          coachingCollection,
          libraryCollection,
          totalCollections: coachingCollection + libraryCollection
        },
        dueThisWeek: dueThisWeekList,
        dueToday: dueTodayList,
        upcoming: upcomingList,
        monthlyTrend
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
