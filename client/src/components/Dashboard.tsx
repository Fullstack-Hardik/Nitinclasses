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
  Building, 
  TrendingUp, 
  UserPlus, 
  CreditCard, 
  Wrench, 
  ArrowUpRight, 
  Sparkles, 
  Search, 
  ChevronRight,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';
import api, { cachedGet, invalidateClientCache } from '../services/api';
import { DashboardStats, FeeDue } from '../types';
import { SplitText } from './SplitText';
import { CollectFeeModal } from './CollectFeeModal';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeeDue, setSelectedFeeDue] = useState<FeeDue | null>(null);

  const [trendRange, setTrendRange] = useState<'6_months' | '12_months' | 'current_year'>('6_months');

  const fetchStats = async (forceRefresh = false, range = trendRange) => {
    try {
      if (forceRefresh) {
        invalidateClientCache('dashboard');
      }
      const res = await cachedGet<any>('/dashboard/stats', {
        params: { trendRange: range }
      }, forceRefresh ? 0 : 15000);
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
    fetchStats(true, trendRange);

    // Listen for fee collection / manipulation events across tabs/modals
    const handleFeesUpdated = () => {
      fetchStats(true, trendRange);
    };

    window.addEventListener('nsc_fees_updated', handleFeesUpdated);
    window.addEventListener('focus', () => fetchStats(true, trendRange));

    return () => {
      window.removeEventListener('nsc_fees_updated', handleFeesUpdated);
      window.removeEventListener('focus', () => fetchStats(true, trendRange));
    };
  }, [trendRange]);

  if (loading && !stats) {
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
        <button onClick={() => fetchStats(true)} className="neu-button px-5 py-2 text-sm font-semibold text-slate-800">
          Retry Loading
        </button>
      </div>
    );
  }

  const { summary, breakdown, duesBreakdown, monthlyTrend = [], topOverdue = [] } = stats;

  // Compute maximum monthly revenue for chart scaling
  const maxTrend = Math.max(...monthlyTrend.map(m => m.total), 1000);
  const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Outstanding Dues calculations
  const totalOutstanding = summary.totalOutstandingFees || 0;
  const coachingOutstanding = summary.coachingOutstandingFees || 0;
  const libraryOutstanding = summary.libraryOutstandingFees || 0;
  const coachingOutPct = totalOutstanding > 0 ? Math.round((coachingOutstanding / totalOutstanding) * 100) : 0;
  const libraryOutPct = totalOutstanding > 0 ? Math.round((libraryOutstanding / totalOutstanding) * 100) : 0;

  // Overdue calculations
  const totalOverdue = summary.overdueFees || 0;
  const coachingOverdue = summary.coachingOverdueFees || 0;
  const libraryOverdue = summary.libraryOverdueFees || 0;
  const coachingOverPct = totalOverdue > 0 ? Math.round((coachingOverdue / totalOverdue) * 100) : 0;
  const libraryOverPct = totalOverdue > 0 ? Math.round((libraryOverdue / totalOverdue) * 100) : 0;

  return (
    <div className="space-y-7 animate-fade-in pb-10">
      {/* Top Header / Welcome & Quick Action Bar */}
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
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time institute oversight, automated fee cycles, and occupancy metrics
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => onNavigate?.('students')}
            className="neu-button-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Enroll Student
          </button>
          <button 
            onClick={() => onNavigate?.('fees')}
            className="neu-button px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center gap-1.5 hover:text-slate-900"
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            Collect Fees
          </button>
          <button 
            onClick={() => onNavigate?.('tools')}
            className="neu-button px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center gap-1.5 hover:text-slate-900"
          >
            <Wrench className="w-3.5 h-3.5 text-purple-600" />
            Tools Dock
          </button>
          <button 
            onClick={() => fetchStats(true)}
            title="Refresh database records"
            className="neu-button p-2 text-slate-600 hover:text-slate-900"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Primary Top Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Enrolled */}
        <div 
          onClick={() => onNavigate?.('students')}
          className="google-card p-5 cursor-pointer flex flex-col justify-between group hover:border-blue-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{summary.totalStudents}</h3>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="font-semibold text-indigo-600">{summary.coachingStudents} Coaching</span>
              <span>•</span>
              <span className="font-semibold text-violet-600">{summary.libraryStudents} Library</span>
            </div>
          </div>
        </div>

        {/* 2. Collected This Month */}
        <div 
          onClick={() => onNavigate?.('fees')}
          className="google-card p-5 cursor-pointer flex flex-col justify-between group hover:border-emerald-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month Collection</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              ₹{summary.totalFeesCollectedThisMonth.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              ₹{summary.totalFeesCollectedToday.toLocaleString('en-IN')} collected today
            </p>
          </div>
        </div>

        {/* 3. Outstanding Balances & Overdue Split */}
        <div 
          onClick={() => onNavigate?.('fees')}
          className="google-card p-5 cursor-pointer flex flex-col justify-between group hover:border-amber-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding Dues</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-amber-600 tracking-tight">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-slate-600 flex-wrap">
              <span className="text-indigo-600">Coaching: ₹{coachingOutstanding.toLocaleString('en-IN')}</span>
              <span>•</span>
              <span className="text-purple-600">Lib: ₹{libraryOutstanding.toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>₹{totalOverdue.toLocaleString('en-IN')} Overdue</span>
              <span className="text-red-500">({coachingOverdue > 0 ? `C: ₹${coachingOverdue}` : ''} {libraryOverdue > 0 ? `L: ₹${libraryOverdue}` : ''})</span>
            </div>
          </div>
        </div>

        {/* 4. Library Seat Capacity */}
        <div 
          onClick={() => onNavigate?.('library')}
          className="google-card p-5 cursor-pointer flex flex-col justify-between group hover:border-sky-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Library Capacity</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {summary.boysLibraryOccupancy.occupied + summary.girlsLibraryOccupancy.occupied}
              <span className="text-xs font-normal text-slate-400"> / {summary.boysLibraryOccupancy.total + summary.girlsLibraryOccupancy.total} seats</span>
            </h3>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-sky-600 font-semibold">Boys: {summary.boysLibraryOccupancy.percentage}%</span>
              <span>•</span>
              <span className="text-pink-600 font-semibold">Girls: {summary.girlsLibraryOccupancy.percentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* DUES & OVERDUES DEEP-DIVE ANALYTICS SECTION (COACHING VS LIBRARY + MONTH/WEEK TIMELINE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Coaching vs Library Dues & Overdue Split Cards */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Dues Breakdown: Coaching vs Library
              </h3>
              <button 
                onClick={() => onNavigate?.('fees')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
              >
                Fees Ledger <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="py-4 space-y-5">
              {/* 1. Total Outstanding Split Bar */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="font-bold text-slate-800">Total Outstanding Dues</span>
                  <span className="text-amber-700 font-extrabold">₹{totalOutstanding.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex border border-slate-200">
                  <div 
                    className="bg-indigo-600 h-3 transition-all duration-500"
                    style={{ width: `${coachingOutPct}%` }}
                    title={`Coaching: ₹${coachingOutstanding} (${coachingOutPct}%)`}
                  />
                  <div 
                    className="bg-violet-600 h-3 transition-all duration-500"
                    style={{ width: `${libraryOutPct}%` }}
                    title={`Library: ₹${libraryOutstanding} (${libraryOutPct}%)`}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-semibold mt-1.5 text-slate-500">
                  <span className="text-indigo-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                    Coaching: ₹{coachingOutstanding.toLocaleString('en-IN')} ({coachingOutPct}%)
                  </span>
                  <span className="text-violet-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
                    Library: ₹{libraryOutstanding.toLocaleString('en-IN')} ({libraryOutPct}%)
                  </span>
                </div>
              </div>

              {/* 2. Overdue Past Months Split Bar */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Strictly Overdue (Past Months)
                  </span>
                  <span className="text-red-700 font-extrabold">₹{totalOverdue.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex border border-slate-200">
                  <div 
                    className="bg-rose-500 h-3 transition-all duration-500"
                    style={{ width: `${coachingOverPct}%` }}
                    title={`Coaching Overdue: ₹${coachingOverdue} (${coachingOverPct}%)`}
                  />
                  <div 
                    className="bg-purple-500 h-3 transition-all duration-500"
                    style={{ width: `${libraryOverPct}%` }}
                    title={`Library Overdue: ₹${libraryOverdue} (${libraryOverPct}%)`}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-semibold mt-1.5 text-slate-500">
                  <span className="text-rose-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    Coaching Overdue: ₹{coachingOverdue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-purple-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    Library Overdue: ₹{libraryOverdue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* 3. Weekly Status Quick Summary */}
              {duesBreakdown?.weekly && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800">Due This Week</span>
                    <p className="text-base font-extrabold text-amber-900 mt-0.5">
                      ₹{duesBreakdown.weekly.thisWeek.total.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-amber-700">
                      {duesBreakdown.weekly.thisWeek.count} student cycle{duesBreakdown.weekly.thisWeek.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50/80 border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-800">Due Today</span>
                    <p className="text-base font-extrabold text-blue-900 mt-0.5">
                      ₹{duesBreakdown.weekly.today.total.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-blue-700">
                      {duesBreakdown.weekly.today.count} student cycle{duesBreakdown.weekly.today.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 2 cols: Month-wise Dues & Overdues Timeline ("Kiss Month Ka Kitna Dues/Overdue Hai") */}
        <div className="neu-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Month-Wise Dues & Overdue Timeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of unpaid balances across historical and current billing months
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 self-start sm:self-auto">
                {duesBreakdown?.monthlyTimeline?.length || 0} Months with Balances
              </span>
            </div>

            {(!duesBreakdown?.monthlyTimeline || duesBreakdown.monthlyTimeline.length === 0) ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700 text-sm">All historical & current months are fully settled!</p>
                <p className="text-slate-400 mt-0.5">No overdue balances pending in MongoDB ledger.</p>
              </div>
            ) : (
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {duesBreakdown.monthlyTimeline.map((item, idx) => {
                  const mName = monthShortNames[item.month - 1] || `${item.month}`;
                  const yrShort = String(item.year).slice(-2);
                  const isCurrentMonth = item.totalDue > 0 && item.totalOverdue === 0;
                  const hasOverdue = item.totalOverdue > 0;

                  return (
                    <div 
                      key={idx}
                      onClick={() => onNavigate?.('fees')}
                      className={`p-3.5 rounded-xl border transition cursor-pointer group hover:shadow-sm ${
                        hasOverdue 
                          ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300' 
                          : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 text-xs font-mono">
                          {mName} '{yrShort}
                        </span>
                        {hasOverdue ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                            Overdue
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            Running Due
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {hasOverdue && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium text-[11px]">Overdue:</span>
                            <span className="font-extrabold text-red-700">₹{item.totalOverdue.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {item.totalDue > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium text-[11px]">Running Due:</span>
                            <span className="font-extrabold text-amber-700">₹{item.totalDue.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>

                      {/* Service Breakdown Tags */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                        <span className="text-indigo-700">Coaching: ₹{(item.coachingDue + item.coachingOverdue).toLocaleString('en-IN')}</span>
                        <span className="text-violet-700">Library: ₹{(item.libraryDue + item.libraryOverdue).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>Verified cycle balances automatically tracked per student</span>
            <button 
              onClick={() => onNavigate?.('fees')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Manage & Collect in Fees Page <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Charts & Collections Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Monthly Revenue Analytics Bar Chart */}
        <div className="neu-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Monthly Revenue & Fee Collection Trend
                </h3>
              </div>

              {/* Chart Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl self-start sm:self-auto">
                {[
                  { id: '6_months', label: 'Last 6 Months' },
                  { id: '12_months', label: '12 Months' },
                  { id: 'current_year', label: 'Current Year' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTrendRange(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      trendRange === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Coaching Fees
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                Library Fees
              </span>
              <span className="text-[11px] text-slate-400 ml-auto font-mono">
                Max in period: ₹{maxTrend.toLocaleString('en-IN')}
              </span>
            </div>

            {(() => {
              const monthsToDisplay = (() => {
                const now = new Date();
                let count = 6;
                if (trendRange === '12_months') count = 12;
                else if (trendRange === 'current_year') count = now.getMonth() + 1;

                const fullList = [];
                for (let i = count - 1; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const yr = d.getFullYear();
                  const mo = d.getMonth() + 1;
                  const found = monthlyTrend.find(item => item._id && item._id.year === yr && item._id.month === mo);
                  fullList.push({
                    _id: { year: yr, month: mo },
                    total: found?.total || 0,
                    coaching: found?.coaching || (found?.total || 0),
                    library: found?.library || 0
                  });
                }
                return fullList;
              })();

              const maxVal = Math.max(...monthsToDisplay.map(m => m.total), 1000);

              return (
                <div className="pt-4">
                  <div className="h-48 flex items-end justify-between gap-2.5 px-1">
                    {monthsToDisplay.map((m, idx) => {
                      const total = m.total || 0;
                      const coaching = m.coaching || 0;
                      const library = m.library || 0;

                      const heightPct = total > 0 ? Math.max(12, Math.round((total / maxVal) * 100)) : 4;
                      const coachingPct = total > 0 ? Math.round((coaching / total) * 100) : 0;
                      const libraryPct = total > 0 ? Math.round((library / total) * 100) : 0;
                      const monthLabel = monthShortNames[m._id.month - 1] || `${m._id.month}`;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-12 z-20 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-[#101828] text-white text-[10px] font-mono p-1.5 rounded-md shadow-lg whitespace-nowrap">
                            <p className="font-bold text-white">₹{total.toLocaleString('en-IN')}</p>
                            <p className="text-blue-300">Coaching: ₹{coaching.toLocaleString('en-IN')}</p>
                            <p className="text-purple-300">Library: ₹{library.toLocaleString('en-IN')}</p>
                          </div>

                          {/* Top Value Label */}
                          <span className={`text-[10px] font-bold font-mono transition text-center whitespace-nowrap ${
                            total > 0 ? 'text-[#101828]' : 'text-slate-400'
                          }`}>
                            {total > 0 ? `₹${total}` : '₹0'}
                          </span>

                          {/* Bar Track Container */}
                          <div className="w-full bg-[#F5F7FB] rounded-lg h-36 flex items-end p-1 overflow-hidden border border-[#E5E9F0]">
                            {total > 0 ? (
                              <div 
                                className="w-full rounded-md transition-all duration-500 overflow-hidden flex flex-col justify-end"
                                style={{ height: `${heightPct}%` }}
                              >
                                {libraryPct > 0 && (
                                  <div 
                                    className="w-full bg-[#8B5CF6] transition-all" 
                                    style={{ height: `${libraryPct}%` }} 
                                    title={`Library: ₹${library}`}
                                  />
                                )}
                                {coachingPct > 0 && (
                                  <div 
                                    className="w-full bg-[#1765D1] transition-all" 
                                    style={{ height: `${coachingPct}%` }} 
                                    title={`Coaching: ₹${coaching}`}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-1 bg-slate-200 rounded-full" />
                            )}
                          </div>

                          {/* Month Axis Label */}
                          <span className="text-[11px] font-semibold text-[#667085] font-mono">
                            {monthLabel} '{String(m._id.year).slice(-2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>Aggregated verified receipts from real MongoDB ledger</span>
            <button 
              onClick={() => onNavigate?.('fees')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View detailed billing table <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Lifetime Collections & Library Occupancies */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Service Revenue Share
              </h3>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    Coaching Collections
                  </span>
                  <span className="font-bold text-slate-900">₹{breakdown.coachingCollection.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${breakdown.totalCollections > 0 ? (breakdown.coachingCollection / breakdown.totalCollections) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                    Library Collections
                  </span>
                  <span className="font-bold text-slate-900">₹{breakdown.libraryCollection.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-violet-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${breakdown.totalCollections > 0 ? (breakdown.libraryCollection / breakdown.totalCollections) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-xs flex justify-between font-bold text-slate-800">
                <span>Total Lifetime Collection</span>
                <span className="text-emerald-700">₹{breakdown.totalCollections.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Library Mini Gauges */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hall Occupancies</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-100 text-center">
                  <span className="text-[10px] font-bold text-sky-700 uppercase">Boys Hall</span>
                  <p className="text-lg font-extrabold text-sky-900 mt-0.5">{summary.boysLibraryOccupancy.percentage}%</p>
                  <p className="text-[10px] text-sky-600">{summary.boysLibraryOccupancy.occupied}/{summary.boysLibraryOccupancy.total} seats</p>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-50/80 border border-pink-100 text-center">
                  <span className="text-[10px] font-bold text-pink-700 uppercase">Girls Hall</span>
                  <p className="text-lg font-extrabold text-pink-900 mt-0.5">{summary.girlsLibraryOccupancy.percentage}%</p>
                  <p className="text-[10px] text-pink-600">{summary.girlsLibraryOccupancy.occupied}/{summary.girlsLibraryOccupancy.total} seats</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Due Reminders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Due Today */}
        <div className="neu-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Due Today ({stats.dueToday?.length || 0})
              </h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Action Required
              </span>
            </div>

            {(!stats.dueToday || stats.dueToday.length === 0) ? (
              <div className="py-7 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                No student fees due today.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {stats.dueToday.map((due) => (
                  <div key={due._id} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-xs">
                    <div>
                      <p className="font-bold text-slate-900">{due.student?.fullName || 'Student'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {due.student?.studentId} • {due.serviceType.toUpperCase()}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-extrabold text-amber-600">₹{due.remainingAmount}</span>
                      <button
                        onClick={() => setSelectedFeeDue(due)}
                        className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition shadow-xs"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Fees Due This Week */}
        <div className="neu-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Due This Week ({stats.dueThisWeek?.length || 0})
              </h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Current Week
              </span>
            </div>

            {(!stats.dueThisWeek || stats.dueThisWeek.length === 0) ? (
              <div className="py-7 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                All weekly fees up to date.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {stats.dueThisWeek.map((due) => (
                  <div key={due._id} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-xs">
                    <div>
                      <p className="font-bold text-slate-900">{due.student?.fullName || 'Student'}</p>
                      <p className="text-[10px] text-slate-400">Due: {new Date(due.dueDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className="font-extrabold text-slate-800">₹{due.remainingAmount}</span>
                        <p className="text-[10px] text-slate-400 capitalize">{due.serviceType}</p>
                      </div>
                      <button
                        onClick={() => setSelectedFeeDue(due)}
                        className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition shadow-xs"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Top Overdue Balances List (Direct Follow-up & Collection) */}
        <div className="neu-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Highest Overdue ({topOverdue.length})
              </h3>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                Overdue Dues
              </span>
            </div>

            {(!topOverdue || topOverdue.length === 0) ? (
              <div className="py-7 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                No overdue student balances.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {topOverdue.map((due) => (
                  <div key={due._id} className="p-2.5 rounded-xl bg-white border border-rose-200 text-xs flex items-center justify-between shadow-xs">
                    <div>
                      <p className="font-bold text-slate-900">{due.student?.fullName || 'Student'}</p>
                      <p className="text-[10px] text-red-600 font-medium">
                        Period: {due.billingPeriod} • <span className="capitalize">{due.serviceType}</span>
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-extrabold text-red-700">₹{due.remainingAmount}</span>
                      <button
                        onClick={() => setSelectedFeeDue(due)}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition shadow-xs"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collect Fee Modal */}
      <CollectFeeModal
        feeDue={selectedFeeDue}
        onClose={() => setSelectedFeeDue(null)}
        onSuccess={() => {
          setSelectedFeeDue(null);
          fetchStats(true);
        }}
      />
    </div>
  );
};

export default Dashboard;
