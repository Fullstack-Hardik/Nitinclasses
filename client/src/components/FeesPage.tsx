import React, { useEffect, useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Calendar, 
  AlertCircle, 
  RefreshCw,
  IndianRupee,
  CheckCircle2,
  Clock,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  ListFilter,
  UserCheck
} from 'lucide-react';
import api from '../services/api';
import { FeeDue, Student } from '../types';
import { CollectFeeModal } from './CollectFeeModal';
import { DirectCollectFeeModal } from './DirectCollectFeeModal';
import { ManipulateFeeModal } from './ManipulateFeeModal';

// Helper to evaluate running month (Due - Orange) vs expired past month (Overdue - Red)
export const getCycleEvaluation = (due: FeeDue) => {
  const isPaid = due.status === 'paid' || due.remainingAmount === 0;
  if (isPaid) {
    return {
      statusType: 'paid',
      label: 'Paid ✓',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold',
      isCurrent: false,
      isOverdue: false
    };
  }

  const now = new Date();
  const end = new Date(due.periodEndDate || due.dueDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(due.periodStartDate);
  start.setHours(0, 0, 0, 0);

  const isOverdue = now > end;
  const isRunning = now >= start && now <= end;

  if (isOverdue) {
    return {
      statusType: 'overdue',
      label: 'Overdue',
      badgeClass: 'bg-red-50 text-red-800 border border-red-300 font-bold',
      isCurrent: false,
      isOverdue: true
    };
  }

  return {
    statusType: 'due',
    label: isRunning ? 'Due (Running)' : 'Due',
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
    isCurrent: isRunning,
    isOverdue: false
  };
};

export const FeesPage: React.FC = () => {
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due_today' | 'pending' | 'overdue' | 'paid'>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'coaching' | 'library'>('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collect Fee Modal state
  const [selectedFeeDue, setSelectedFeeDue] = useState<FeeDue | null>(null);
  // Direct Collect Fee Modal state (for full balance / anytime collection)
  const [directStudent, setDirectStudent] = useState<Student | null>(null);
  // Smart Mode Manipulation Modal state
  const [manipulateDue, setManipulateDue] = useState<FeeDue | null>(null);
  const [smartModeEnabled, setSmartModeEnabled] = useState(false);

  // Grouped / Compressed view state (Compressed per student by default!)
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());

  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const fetchDues = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (serviceFilter !== 'all') params.serviceType = serviceFilter;

      const [feeRes, settingsRes] = await Promise.all([
        api.get('/fees', { params }),
        api.get('/settings').catch(() => ({ data: { data: {} } }))
      ]);

      if (feeRes.data.success) {
        setDues(feeRes.data.data);
      }
      if (settingsRes?.data?.data?.smartModeEnabled !== undefined) {
        setSmartModeEnabled(settingsRes.data.data.smartModeEnabled);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch coaching fees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, [statusFilter, serviceFilter]);

  const handleSyncRecurring = async () => {
    try {
      setSyncing(true);
      await api.post('/fees/sync');
      fetchDues();
    } catch (err: any) {
      alert('Error triggering recurring billing generation: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSmartMode = async () => {
    const nextState = !smartModeEnabled;
    setSmartModeEnabled(nextState);
    try {
      await api.put('/settings', { smartModeEnabled: nextState });
    } catch (err: any) {
      console.error('Failed to toggle smart mode:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDues();
  };

  // Group dues by Student for Compressed / Summary View
  const studentGroups = useMemo(() => {
    const map = new Map<string, {
      student: any;
      dues: FeeDue[];
      totalBilled: number;
      totalPaid: number;
      totalRemaining: number;
      overdueCount: number;
      dueCount: number;
      paidCount: number;
      coachingDues: FeeDue[];
      libraryDues: FeeDue[];
      coachingBilled: number;
      coachingPaid: number;
      coachingRemaining: number;
      libraryBilled: number;
      libraryPaid: number;
      libraryRemaining: number;
    }>();

    for (const due of dues) {
      const studentId = due.student?._id || 'unknown';
      if (!map.has(studentId)) {
        map.set(studentId, {
          student: due.student || { fullName: 'Unknown Student', studentId: 'N/A' },
          dues: [],
          totalBilled: 0,
          totalPaid: 0,
          totalRemaining: 0,
          overdueCount: 0,
          dueCount: 0,
          paidCount: 0,
          coachingDues: [],
          libraryDues: [],
          coachingBilled: 0,
          coachingPaid: 0,
          coachingRemaining: 0,
          libraryBilled: 0,
          libraryPaid: 0,
          libraryRemaining: 0
        });
      }

      const grp = map.get(studentId)!;
      grp.dues.push(due);
      grp.totalBilled += due.amount;
      grp.totalPaid += due.paidAmount;
      grp.totalRemaining += due.remainingAmount;

      if (due.serviceType === 'coaching') {
        grp.coachingDues.push(due);
        grp.coachingBilled += due.amount;
        grp.coachingPaid += due.paidAmount;
        grp.coachingRemaining += due.remainingAmount;
      } else {
        grp.libraryDues.push(due);
        grp.libraryBilled += due.amount;
        grp.libraryPaid += due.paidAmount;
        grp.libraryRemaining += due.remainingAmount;
      }

      const evalResult = getCycleEvaluation(due);
      if (evalResult.statusType === 'paid') grp.paidCount++;
      else if (evalResult.statusType === 'overdue') grp.overdueCount++;
      else grp.dueCount++;
    }

    return Array.from(map.values());
  }, [dues]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Coaching Fees & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Recurring dues based on individual joining-date anniversaries</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Instant Smart Mode Switch */}
          <button
            type="button"
            onClick={handleToggleSmartMode}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              smartModeEnabled
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm shadow-blue-200'
                : 'neu-button text-slate-600 hover:text-slate-900'
            }`}
            title={smartModeEnabled ? 'Smart Mode is ON (Click to Turn Off)' : 'Smart Mode is OFF (Click to Turn On)'}
          >
            <Sparkles className={`w-3.5 h-3.5 ${smartModeEnabled ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
            {smartModeEnabled ? 'Smart Mode: Active ✓' : 'Enable Smart Mode'}
          </button>

          <button
            onClick={handleSyncRecurring}
            disabled={syncing}
            className="neu-button px-4 py-2 text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Generating Dues...' : 'Run Billing Sync'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or ID..."
            className="w-full neu-input py-2 pl-10 pr-4 text-xs font-medium"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All' },
              { id: 'current_month', label: 'Current Month' },
              { id: 'due_this_week', label: 'This Week' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'due_today', label: 'Due Today' },
              { id: 'pending', label: 'Pending' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'paid', label: 'Paid' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`
                  px-2.5 py-1.5 rounded-lg transition-all text-xs
                  ${statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Service filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value as any)}
            className="neu-input px-3 py-1.5 text-xs font-medium"
          >
            <option value="all">All Services</option>
            <option value="coaching">Coaching Only</option>
            <option value="library">Library Only</option>
          </select>

          {/* View Mode Switcher: Compressed Student View vs Detailed Entries */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-2.5 py-1.5 rounded-lg transition-all text-xs flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Group by student — 1 compressed row per student"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>By Student</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-lg transition-all text-xs flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Show all individual monthly dues separately"
            >
              <ListFilter className="w-3.5 h-3.5 text-slate-600" />
              <span>All Entries</span>
            </button>
          </div>

          {/* Export to Excel action */}
          <button
            onClick={async () => {
              try {
                const response = await api.get('/settings/export/payments', {
                  responseType: 'blob'
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Fee_Receipts_${new Date().toISOString().slice(0, 10)}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              } catch (err: any) {
                alert('Export failed: ' + (err.message || 'Error occurred'));
              }
            }}
            className="neu-button px-3 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-1.5"
            title="Export all fee payments to Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Export Fees
          </button>
        </div>
      </div>

      {/* Fee Dues Table */}
      <div className="neu-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : dues.length === 0 ? (
          <div className="p-16 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Billing Dues Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no fees matching the current filter criteria.
            </p>
          </div>
        ) : viewMode === 'grouped' ? (
          /* ================= COMPRESSED STUDENT SUMMARY VIEW ================= */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-200/50 text-slate-700 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 font-bold">Student Details</th>
                  <th className="py-3 px-4 font-bold">📚 Coaching Status</th>
                  <th className="py-3 px-4 font-bold">📖 Library Status</th>
                  <th className="py-3 px-4 font-bold">Net Total Due</th>
                  <th className="py-3 px-4 font-bold">Monthly Cycles</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-medium">
                {studentGroups.map((grp) => {
                  const sId = grp.student?._id || 'unknown';
                  const isExpanded = expandedStudentIds.has(sId);
                  const isFullySettled = grp.totalRemaining === 0;

                  return (
                    <React.Fragment key={sId}>
                      {/* Main Compressed Student Summary Row */}
                      <tr className="hover:bg-slate-100/60 transition bg-white">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleStudentExpand(sId)}
                              className="p-1 rounded-md hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition"
                              title={isExpanded ? "Collapse months" : "View individual monthly cycles"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <div>
                              <div className="text-slate-900 font-bold text-sm">{grp.student?.fullName || 'N/A'}</div>
                              <div className="text-[11px] text-slate-500">
                                {grp.student?.fatherName ? `S/D of ${grp.student.fatherName}` : 'ID: ' + grp.student?.studentId}
                                {grp.student?.mobileNumber && ` • ${grp.student.mobileNumber}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Coaching Status */}
                        <td className="py-3 px-4">
                          {grp.student?.coaching?.hasMembership || grp.coachingDues.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">₹{grp.coachingRemaining} Due</span>
                                {grp.coachingRemaining === 0 && (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">Paid ✓</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Billed: ₹{grp.coachingBilled} • Paid: ₹{grp.coachingPaid}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Not Enrolled</span>
                          )}
                        </td>

                        {/* Library Status */}
                        <td className="py-3 px-4">
                          {grp.student?.library?.hasMembership || grp.libraryDues.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">₹{grp.libraryRemaining} Due</span>
                                {grp.libraryRemaining === 0 && (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">Paid ✓</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Billed: ₹{grp.libraryBilled} • Paid: ₹{grp.libraryPaid}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Not Enrolled</span>
                          )}
                        </td>

                        {/* Net Total Due */}
                        <td className="py-3 px-4">
                          <span className={`text-sm font-extrabold ${isFullySettled ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {isFullySettled ? '₹0 (Settled)' : `₹${grp.totalRemaining.toLocaleString('en-IN')}`}
                          </span>
                          {grp.overdueCount > 0 ? (
                            <span className="block text-[10px] text-red-600 font-bold mt-0.5">
                              ⚠️ {grp.overdueCount} Overdue
                            </span>
                          ) : grp.dueCount > 0 ? (
                            <span className="block text-[10px] text-amber-700 font-bold mt-0.5">
                              ⚡ Current Month Due
                            </span>
                          ) : (
                            <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">
                              ✓ All Paid
                            </span>
                          )}
                          {grp.student?.advanceFeeBalance > 0 && (
                            <div className="text-[10px] text-blue-600 font-semibold">
                              Advance: ₹{grp.student.advanceFeeBalance}
                            </div>
                          )}
                        </td>

                        {/* Monthly Cycles Preview */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggleStudentExpand(sId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                          >
                            <span>{grp.dues.length} Month Cycle{grp.dues.length !== 1 ? 's' : ''}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Statement PDF Download */}
                            {grp.student?._id && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const response = await api.get(`/fees/student/${grp.student._id}/statement/pdf`, {
                                      responseType: 'blob'
                                    });
                                    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `Fee-Statement-${grp.student.studentId}.pdf`);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.parentNode?.removeChild(link);
                                  } catch (err: any) {
                                    alert('Failed to download statement: ' + err.message);
                                  }
                                }}
                                title="Download Full Ledger & Statement PDF"
                                className="p-1.5 neu-button text-slate-600 hover:text-slate-900"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Smart Edit button on student row */}
                            {smartModeEnabled && (
                              <button
                                type="button"
                                onClick={() => {
                                  const dueToEdit = grp.dues.find(d => d.remainingAmount > 0) || grp.dues[0];
                                  if (dueToEdit) {
                                    setManipulateDue(dueToEdit);
                                  } else {
                                    toggleStudentExpand(sId);
                                  }
                                }}
                                className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1 text-[11px] font-bold"
                                title="Smart Edit: Edit fee record"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                            )}

                            {/* Collect Fee Action */}
                            <button
                              onClick={() => setDirectStudent(grp.student)}
                              className="neu-button-primary px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 shadow-xs"
                              title="Collect monthly or balance fee"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              Collect Fee
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Collapsible Drawer showing separated Coaching & Library monthly breakdowns */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-y border-slate-200">
                          <td colSpan={6} className="p-3 sm:p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Left Card: Coaching Monthly Cycles */}
                              <div className="bg-white rounded-xl border border-indigo-100 p-3.5 shadow-xs">
                                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-indigo-50">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                    <h4 className="text-xs font-bold text-indigo-950">
                                      📚 Coaching Monthly Cycles ({grp.coachingDues.length})
                                    </h4>
                                  </div>
                                  <span className="text-[11px] font-bold text-indigo-700">
                                    Remaining: ₹{grp.coachingRemaining}
                                  </span>
                                </div>

                                {grp.coachingDues.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-3 text-center italic">
                                    No coaching billing cycles recorded yet.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 bg-slate-50/60">
                                        <tr>
                                          <th className="py-1.5 px-2">Cycle Month</th>
                                          <th className="py-1.5 px-2">Fee</th>
                                          <th className="py-1.5 px-2">Paid</th>
                                          <th className="py-1.5 px-2">Due</th>
                                          <th className="py-1.5 px-2">Status</th>
                                          <th className="py-1.5 px-2 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                                        {grp.coachingDues.map((due) => {
                                          const statusEval = getCycleEvaluation(due);
                                          return (
                                            <tr key={due._id} className="hover:bg-slate-50/80">
                                              <td className="py-2 px-2 font-semibold text-slate-800">
                                                {due.billingPeriod}
                                              </td>
                                              <td className="py-2 px-2 text-slate-700">₹{due.amount}</td>
                                              <td className="py-2 px-2 text-emerald-700 font-semibold">₹{due.paidAmount}</td>
                                              <td className="py-2 px-2 font-bold text-amber-600">₹{due.remainingAmount}</td>
                                              <td className="py-2 px-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${statusEval.badgeClass}`}>
                                                  {statusEval.label}
                                                </span>
                                              </td>
                                              <td className="py-2 px-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                  {smartModeEnabled && (
                                                    <button
                                                      type="button"
                                                      onClick={() => setManipulateDue(due)}
                                                      className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 inline-flex items-center gap-0.5 transition shadow-2xs"
                                                      title="Smart Mode: Edit or override this fee due"
                                                    >
                                                      <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                                                      Edit
                                                    </button>
                                                  )}
                                                  {statusEval.statusType !== 'paid' ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => setSelectedFeeDue(due)}
                                                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition shadow-xs"
                                                    >
                                                      Pay Month
                                                    </button>
                                                  ) : (
                                                    <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Settled ✓</span>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Right Card: Library Monthly Cycles */}
                              <div className="bg-white rounded-xl border border-purple-100 p-3.5 shadow-xs">
                                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-purple-50">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                    <h4 className="text-xs font-bold text-purple-950">
                                      📖 Library Monthly Cycles ({grp.libraryDues.length})
                                    </h4>
                                  </div>
                                  <span className="text-[11px] font-bold text-purple-700">
                                    Remaining: ₹{grp.libraryRemaining}
                                  </span>
                                </div>

                                {grp.libraryDues.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-3 text-center italic">
                                    No library billing cycles recorded yet.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 bg-slate-50/60">
                                        <tr>
                                          <th className="py-1.5 px-2">Cycle Month</th>
                                          <th className="py-1.5 px-2">Fee</th>
                                          <th className="py-1.5 px-2">Paid</th>
                                          <th className="py-1.5 px-2">Due</th>
                                          <th className="py-1.5 px-2">Status</th>
                                          <th className="py-1.5 px-2 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                                        {grp.libraryDues.map((due) => {
                                          const statusEval = getCycleEvaluation(due);
                                          return (
                                            <tr key={due._id} className="hover:bg-slate-50/80">
                                              <td className="py-2 px-2 font-semibold text-slate-800">
                                                {due.billingPeriod}
                                              </td>
                                              <td className="py-2 px-2 text-slate-700">₹{due.amount}</td>
                                              <td className="py-2 px-2 text-emerald-700 font-semibold">₹{due.paidAmount}</td>
                                              <td className="py-2 px-2 font-bold text-amber-600">₹{due.remainingAmount}</td>
                                              <td className="py-2 px-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${statusEval.badgeClass}`}>
                                                  {statusEval.label}
                                                </span>
                                              </td>
                                              <td className="py-2 px-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                  {smartModeEnabled && (
                                                    <button
                                                      type="button"
                                                      onClick={() => setManipulateDue(due)}
                                                      className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 inline-flex items-center gap-0.5 transition shadow-2xs"
                                                      title="Smart Mode: Edit or override this fee due"
                                                    >
                                                      <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                                                      Edit
                                                    </button>
                                                  )}
                                                  {statusEval.statusType !== 'paid' ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => setSelectedFeeDue(due)}
                                                      className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition shadow-xs"
                                                    >
                                                      Pay Month
                                                    </button>
                                                  ) : (
                                                    <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Settled ✓</span>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ================= ALL ENTRIES LIST VIEW ================= */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-200/50 text-slate-700 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 font-bold">Student Name</th>
                  <th className="py-3 px-4 font-bold">Service</th>
                  <th className="py-3 px-4 font-bold">Billing Period</th>
                  <th className="py-3 px-4 font-bold">Due Date</th>
                  <th className="py-3 px-4 font-bold">Monthly Fee</th>
                  <th className="py-3 px-4 font-bold">Paid So Far</th>
                  <th className="py-3 px-4 font-bold">Remaining</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-medium">
                {dues.map((due) => {
                  const isPaid = due.status === 'paid' || due.remainingAmount === 0;
                  const isOverdue = due.status === 'overdue';

                  return (
                    <tr key={due._id} className="hover:bg-slate-100/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div>{due.student?.fullName || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">ID: {due.student?.studentId}</div>
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          due.serviceType === 'coaching' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                        }`}>
                          {due.serviceType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] font-mono">{due.billingPeriod}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(due.dueDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">₹{due.amount}</td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">₹{due.paidAmount}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${isPaid ? 'text-slate-400' : 'text-amber-600'}`}>
                          ₹{due.remainingAmount}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const statusEval = getCycleEvaluation(due);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] ${statusEval.badgeClass}`}>
                              {statusEval.isOverdue ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : statusEval.statusType === 'paid' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {statusEval.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {due.student?._id && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const response = await api.get(`/fees/student/${due.student._id}/statement/pdf`, {
                                    responseType: 'blob'
                                  });
                                  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', `Fee-Statement-${due.student.studentId}.pdf`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.parentNode?.removeChild(link);
                                } catch (err: any) {
                                  alert('Failed to download statement: ' + err.message);
                                }
                              }}
                              title="Download Full Ledger & Statement PDF"
                              className="p-1.5 neu-button text-slate-600 hover:text-slate-900"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {smartModeEnabled && (
                            <button
                              type="button"
                              onClick={() => setManipulateDue(due)}
                              className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold inline-flex items-center gap-1 border border-blue-300"
                              title="Smart Mode: Manipulate or override this fee due"
                            >
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              Edit Due
                            </button>
                          )}
                          {!isPaid ? (
                            <button
                              onClick={() => setSelectedFeeDue(due)}
                              className="neu-button-primary px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              Collect Fee
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-lg">
                              Settled ✓
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Month Collect Fee Modal */}
      <CollectFeeModal
        feeDue={selectedFeeDue}
        onClose={() => setSelectedFeeDue(null)}
        onSuccess={() => {
          fetchDues();
        }}
      />

      {/* Direct Collect Fee Modal (Full Balance / Flexible Amount) */}
      <DirectCollectFeeModal
        student={directStudent}
        onClose={() => setDirectStudent(null)}
        onSuccess={() => {
          fetchDues();
        }}
      />

      {/* Smart Mode Fee Manipulation Modal */}
      <ManipulateFeeModal
        feeDue={manipulateDue}
        onClose={() => setManipulateDue(null)}
        onSuccess={() => {
          setManipulateDue(null);
          fetchDues();
        }}
      />
    </div>
  );
};
