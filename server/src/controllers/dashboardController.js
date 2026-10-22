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

    // Next week boundaries
    const nextMonday = new Date(sundayOfWeek);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 7);

    // Upcoming reminder window (Tomorrow up to 7 days ahead)
    const upcomingEnd = new Date(startOfToday);
    upcomingEnd.setDate(startOfToday.getDate() + 8);

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

    // Execute Phase 1: Counts, Occupancies, Active Students, Collections in parallel
    const [
      totalStudents,
      coachingStudents,
      libraryStudents,
      boysSeats,
      girlsSeats,
      todayPayments,
      monthPayments,
      activeStudents,
      breakdown,
      paymentAggregates
    ] = await Promise.all([
      Student.countDocuments({ isArchived: false }),
      Student.countDocuments({ isArchived: false, 'coaching.hasMembership': true, 'coaching.status': 'active' }),
      Student.countDocuments({ isArchived: false, 'library.hasMembership': true, 'library.status': 'active' }),
      Seat.find({ libraryType: 'boys' }).select('status').lean(),
      Seat.find({ libraryType: 'girls' }).select('status').lean(),
      Payment.aggregate([
        { $match: { paymentDate: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      Payment.aggregate([
        { $match: { paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      Student.find({ isArchived: false }).select('_id').lean(),
      Payment.aggregate([
        { $group: { _id: '$serviceType', totalAmount: { $sum: '$amountPaid' } } }
      ]),
      Payment.aggregate([
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
      ])
    ]);

    const activeStudentIds = activeStudents.map(s => s._id);

    // Library Occupancies
    const boysOccupied = boysSeats.filter(s => s.status === 'occupied').length;
    const boysTotal = boysSeats.length || 50;
    const girlsOccupied = girlsSeats.filter(s => s.status === 'occupied').length;
    const girlsTotal = girlsSeats.length || 50;

    // Collections
    const todayTotal = todayPayments[0]?.total || 0;
    const monthTotal = monthPayments[0]?.total || 0;
    const coachingCollection = breakdown.find(b => b._id === 'coaching')?.totalAmount || 0;
    const libraryCollection = breakdown.find(b => b._id === 'library')?.totalAmount || 0;

    // Phase 2: Dues & Overdues Breakdown (Coaching vs Library, Month/Week, Action Lists) in parallel
    const [
      outstandingGrouped,
      overdueGrouped,
      monthlyDuesAggregates,
      dueTodayList,
      dueThisWeekList,
      upcomingList,
      topOverdueList
    ] = await Promise.all([
      // Outstanding separated by coaching vs library
      FeeDue.aggregate([
        {
          $match: {
            student: { $in: activeStudentIds },
            remainingAmount: { $gt: 0 },
            periodStartDate: { $lte: endOfToday }
          }
        },
        {
          $group: {
            _id: '$serviceType',
            total: { $sum: '$remainingAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Overdue separated by coaching vs library
      FeeDue.aggregate([
        {
          $match: {
            student: { $in: activeStudentIds },
            remainingAmount: { $gt: 0 },
            periodEndDate: { $lt: startOfToday }
          }
        },
        {
          $group: {
            _id: '$serviceType',
            total: { $sum: '$remainingAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Month-wise Dues and Overdue trend (for chart & visual timeline)
      FeeDue.aggregate([
        {
          $match: {
            student: { $in: activeStudentIds },
            remainingAmount: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$periodStartDate' },
              month: { $month: '$periodStartDate' },
              service: '$serviceType',
              isOverdue: { $lt: ['$periodEndDate', startOfToday] }
            },
            total: { $sum: '$remainingAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Due Today List
      FeeDue.find({
        student: { $in: activeStudentIds },
        remainingAmount: { $gt: 0 },
        dueDate: { $gte: startOfToday, $lt: tomorrow }
      }).populate('student', 'fullName studentId mobileNumber').sort({ dueDate: 1 }).limit(10).lean(),
      // Due This Week List
      FeeDue.find({
        student: { $in: activeStudentIds },
        remainingAmount: { $gt: 0 },
        dueDate: { $gte: mondayOfWeek, $lt: sundayOfWeek }
      }).populate('student', 'fullName studentId mobileNumber').sort({ dueDate: 1 }).limit(15).lean(),
      // Upcoming (Next 7 Days) List
      FeeDue.find({
        student: { $in: activeStudentIds },
        remainingAmount: { $gt: 0 },
        dueDate: { $gte: tomorrow, $lt: upcomingEnd }
      }).populate('student', 'fullName studentId mobileNumber').sort({ dueDate: 1 }).limit(10).lean(),
      // Top Overdue Students List (for quick follow-up)
      FeeDue.find({
        student: { $in: activeStudentIds },
        remainingAmount: { $gt: 0 },
        periodEndDate: { $lt: startOfToday }
      }).populate('student', 'fullName studentId mobileNumber').sort({ periodEndDate: 1, remainingAmount: -1 }).limit(15).lean()
    ]);

    // Parse Outstanding totals
    const coachingOutstanding = outstandingGrouped.find(o => o._id === 'coaching')?.total || 0;
    const libraryOutstanding = outstandingGrouped.find(o => o._id === 'library')?.total || 0;
    const totalOutstandingFees = coachingOutstanding + libraryOutstanding;

    // Parse Overdue totals
    const coachingOverdue = overdueGrouped.find(o => o._id === 'coaching')?.total || 0;
    const libraryOverdue = overdueGrouped.find(o => o._id === 'library')?.total || 0;
    const totalOverdueFees = coachingOverdue + libraryOverdue;

    // Map payments into trend months list
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

    // Process Month-wise Dues and Overdues timeline
    const monthlyDuesMap = {};
    monthlyDuesAggregates.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      if (!monthlyDuesMap[key]) {
        monthlyDuesMap[key] = {
          year: item._id.year,
          month: item._id.month,
          coachingDue: 0,
          libraryDue: 0,
          coachingOverdue: 0,
          libraryOverdue: 0,
          totalDue: 0,
          totalOverdue: 0
        };
      }
      const target = monthlyDuesMap[key];
      const isOver = Boolean(item._id.isOverdue);
      if (item._id.service === 'coaching') {
        if (isOver) {
          target.coachingOverdue += item.total;
          target.totalOverdue += item.total;
        } else {
          target.coachingDue += item.total;
          target.totalDue += item.total;
        }
      } else if (item._id.service === 'library') {
        if (isOver) {
          target.libraryOverdue += item.total;
          target.totalOverdue += item.total;
        } else {
          target.libraryDue += item.total;
          target.totalDue += item.total;
        }
      }
    });

    const monthlyDuesTimeline = Object.values(monthlyDuesMap).sort((a, b) => {
      return (a.year * 12 + a.month) - (b.year * 12 + b.month);
    });

    // Week-wise Dues breakdown
    let dueThisWeekCoaching = 0;
    let dueThisWeekLibrary = 0;
    dueThisWeekList.forEach(d => {
      if (d.serviceType === 'coaching') dueThisWeekCoaching += d.remainingAmount;
      else if (d.serviceType === 'library') dueThisWeekLibrary += d.remainingAmount;
    });

    let dueTodayCoaching = 0;
    let dueTodayLibrary = 0;
    dueTodayList.forEach(d => {
      if (d.serviceType === 'coaching') dueTodayCoaching += d.remainingAmount;
      else if (d.serviceType === 'library') dueTodayLibrary += d.remainingAmount;
    });

    const weeklyBreakdown = {
      today: {
        total: dueTodayCoaching + dueTodayLibrary,
        coaching: dueTodayCoaching,
        library: dueTodayLibrary,
        count: dueTodayList.length
      },
      thisWeek: {
        total: dueThisWeekCoaching + dueThisWeekLibrary,
        coaching: dueThisWeekCoaching,
        library: dueThisWeekLibrary,
        count: dueThisWeekList.length
      },
      overdueTotal: {
        total: totalOverdueFees,
        coaching: coachingOverdue,
        library: libraryOverdue
      }
    };

    const responseData = {
      summary: {
        totalStudents,
        coachingStudents,
        libraryStudents,
        totalFeesCollectedToday: todayTotal,
        totalFeesCollectedThisMonth: monthTotal,
        totalOutstandingFees,
        coachingOutstandingFees: coachingOutstanding,
        libraryOutstandingFees: libraryOutstanding,
        overdueFees: totalOverdueFees,
        coachingOverdueFees: coachingOverdue,
        libraryOverdueFees: libraryOverdue,
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
      duesBreakdown: {
        coachingOutstanding,
        libraryOutstanding,
        totalOutstanding: totalOutstandingFees,
        coachingOverdue,
        libraryOverdue,
        totalOverdue: totalOverdueFees,
        weekly: weeklyBreakdown,
        monthlyTimeline: monthlyDuesTimeline
      },
      breakdown: {
        coachingCollection,
        libraryCollection,
        totalCollections: coachingCollection + libraryCollection
      },
      dueThisWeek: dueThisWeekList,
      dueToday: dueTodayList,
      upcoming: upcomingList,
      topOverdue: topOverdueList,
      monthlyTrend
    };

    // Cache dashboard response for 20 seconds
    cache.set(cacheKey, responseData, 20000);

    return res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
