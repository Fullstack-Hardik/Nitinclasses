import React, { useEffect, useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  IndianRupee, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  Calendar,
  Building
} from 'lucide-react';
import api from '../services/api';
import { DashboardStats } from '../types';

import { SplitText } from './SplitText';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Aggregating live database records...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="neu-card p-8 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">Failed to Load Dashboard</h3>
        <p className="text-sm text-slate-500 mb-4">{error || 'Could not fetch summary data.'}</p>
        <button onClick={fetchStats} className="neu-button px-5 py-2 text-sm font-semibold text-slate-800">
          Retry Loading
        </button>
      </div>
    );
  }

  const { summary, breakdown } = stats;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <SplitText
            text="Hello Nitin, Welcome Back!"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            delay={40}
            duration={0.6}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 30 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            textAlign="left"
            tag="h1"
          />
          <p className="text-sm text-slate-500 mt-1">Live metrics from database records & coaching operations</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchStats}
            className="neu-button px-4 py-2 text-xs font-semibold text-slate-700 flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* 9 Strict Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Total Students */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.totalStudents}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Enrolled in institute</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Active Coaching Memberships */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Coaching</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.coachingStudents}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Active batch members</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Active Library Memberships */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Library</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.libraryStudents}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Study hall members</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Total Fees Collected Today */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fees Collected Today</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{summary.totalFeesCollectedToday.toLocaleString('en-IN')}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Verified payment receipts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* 5. Total Fees Collected This Month */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected This Month</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{summary.totalFeesCollectedThisMonth.toLocaleString('en-IN')}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Current calendar month</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* 6. Total Outstanding Fees */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{summary.totalOutstandingFees.toLocaleString('en-IN')}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Pending student balances</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* 7. Overdue Fees */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Fees</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">₹{summary.overdueFees.toLocaleString('en-IN')}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Past scheduled due date</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* 8. Boys' Library Occupancy */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Boys' Library Occupancy</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {summary.boysLibraryOccupancy.occupied} <span className="text-sm font-normal text-slate-400">/ {summary.boysLibraryOccupancy.total} seats</span>
            </h3>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">{summary.boysLibraryOccupancy.percentage}% Occupied</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        {/* 9. Girls' Library Occupancy */}
        <div className="neu-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Girls' Library Occupancy</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {summary.girlsLibraryOccupancy.occupied} <span className="text-sm font-normal text-slate-400">/ {summary.girlsLibraryOccupancy.total} seats</span>
            </h3>
            <p className="text-[11px] text-pink-600 font-semibold mt-1">{summary.girlsLibraryOccupancy.percentage}% Occupied</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Collection Breakdown Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neu-card p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-slate-700" />
            Revenue Breakdown: Coaching vs Library
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>Coaching Collections</span>
                <span>₹{breakdown.coachingCollection.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${breakdown.totalCollections > 0 ? (breakdown.coachingCollection / breakdown.totalCollections) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>Library Collections</span>
                <span>₹{breakdown.libraryCollection.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-violet-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${breakdown.totalCollections > 0 ? (breakdown.libraryCollection / breakdown.totalCollections) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Total Confirmed Collections</span>
              <span className="font-bold text-slate-900 text-base">₹{breakdown.totalCollections.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Seat Occupancy Visual Comparison */}
        <div className="neu-card p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-700" />
            Study Hall Occupancy Status
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>Boys' Library ({summary.boysLibraryOccupancy.occupied} / {summary.boysLibraryOccupancy.total} seats)</span>
                <span>{summary.boysLibraryOccupancy.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-sky-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${summary.boysLibraryOccupancy.percentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>Girls' Library ({summary.girlsLibraryOccupancy.occupied} / {summary.girlsLibraryOccupancy.total} seats)</span>
                <span>{summary.girlsLibraryOccupancy.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${summary.girlsLibraryOccupancy.percentage}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/60 text-xs text-slate-500 leading-relaxed">
              Real-time synchronization with active seat allocations. Unallocated seats remain available for immediate assignment.
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Sections: Due Today, Due This Week, Upcoming Fees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Due Today */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Due Today ({stats.dueToday?.length || 0})
              </h2>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Action Required
              </span>
            </div>

            {(!stats.dueToday || stats.dueToday.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                No student fees due today.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {stats.dueToday.map((due) => (
                  <div key={due._id} className="p-3 rounded-xl bg-white border border-slate-200/70 text-xs flex items-center justify-between shadow-xs">
                    <div>
                      <p className="font-bold text-slate-900">{due.student?.fullName || 'Student'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {due.student?.studentId} • {due.serviceType.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-amber-600">₹{due.remainingAmount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Fees Due This Week */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Due This Week ({stats.dueThisWeek?.length || 0})
              </h2>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Current Week
              </span>
            </div>

            {(!stats.dueThisWeek || stats.dueThisWeek.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                All weekly fees up to date.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {stats.dueThisWeek.map((due) => (
                  <div key={due._id} className="p-3 rounded-xl bg-white border border-slate-200/70 text-xs flex items-center justify-between shadow-xs">
                    <div>
                      <p className="font-bold text-slate-900">{due.student?.fullName || 'Student'}</p>
                      <p className="text-[10px] text-slate-400">Due: {new Date(due.dueDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-800">₹{due.remainingAmount}</span>
                      <p className="text-[10px] text-slate-400 capitalize">{due.serviceType}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Upcoming Fees (Next 7 Days Preview) */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-500" />
                Upcoming Reminders ({stats.upcoming?.length || 0})
              </h2>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Next 7 Days
              </span>
            </div>

            {(!stats.upcoming || stats.upcoming.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                No fees approaching within 7 days.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {stats.upcoming.map((due) => {
                  const daysLeft = Math.ceil((new Date(due.dueDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={due._id} className="p-3 rounded-xl bg-white border border-slate-200/70 text-xs flex items-center justify-between shadow-xs">
                      <div>
                        <p className="font-bold text-slate-900">{due.student?.fullName || 'Student'}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold">
                          {daysLeft === 1 ? 'Due Tomorrow' : `In ${daysLeft} days`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-700">₹{due.remainingAmount}</span>
                        <p className="text-[10px] text-slate-400 capitalize">{due.serviceType}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
