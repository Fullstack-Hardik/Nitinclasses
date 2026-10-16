const Student = require('../models/Student');
const Payment = require('../models/Payment');
const FeeDue = require('../models/FeeDue');
const Seat = require('../models/Seat');
const cache = require('../services/cacheService');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const trendRange = req.query.trendRange || '6_months';
    const cacheKey = `dashboard_stats_${trendRange}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({ success: true, data: cachedData, cached: true });
    }

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
    const boysSeats = await Seat.find({ libraryType: 'boys' }).select('status');
    const boysOccupied = boysSeats.filter(s => s.status === 'occupied').length;
    const boysTotal = boysSeats.length || 50;

    const girlsSeats = await Seat.find({ libraryType: 'girls' }).select('status');
    const girlsOccupied = girlsSeats.filter(s => s.status === 'occupied').length;
    const girlsTotal = girlsSeats.length || 50;

    // Collections calculation
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
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
    // Outstanding includes only completed past cycles and today's due (never future incomplete cycles)
    const [outstandingDues] = await FeeDue.aggregate([
      { $match: { remainingAmount: { $gt: 0 }, dueDate: { $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);

    // Overdue includes only past cycles whose due date has strictly elapsed
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

    // Trend range filter: '6_months' (default) | '12_months' | 'current_year'
    let monthCount = 6;
    if (trendRange === '12_months') monthCount = 12;
    else if (trendRange === 'current_year') monthCount = now.getMonth() + 1;

    // Generate continuous sequence of months up to current month
    const trendMonthsList = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMonthsList.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1, // 1-indexed
        coaching: 0,
        library: 0,
        total: 0
      });
    }

    const startDate = new Date(trendMonthsList[0].year, trendMonthsList[0].month - 1, 1);

    const paymentAggregates = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
            service: '$serviceType'
          },
          total: { $sum: '$amountPaid' }
        }
      }
    ]);

    // Map payments into the trend months list
    paymentAggregates.forEach(p => {
      const entry = trendMonthsList.find(m => m.year === p._id.year && m.month === p._id.month);
      if (entry) {
        if (p._id.service === 'coaching') entry.coaching += p.total;
        else if (p._id.service === 'library') entry.library += p.total;
        entry.total += p.total;
      }
    });

    const monthlyTrend = trendMonthsList.map(m => ({
      _id: { year: m.year, month: m.month },
      coaching: m.coaching,
      library: m.library,
      total: m.total
    }));

    const responseData = {
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
    };

    // Cache dashboard response for 30 seconds
    cache.set(cacheKey, responseData, 30000);

    return res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
