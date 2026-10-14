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
          paidCount: 0
        });
      }

      const grp = map.get(studentId)!;
      grp.dues.push(due);
      grp.totalBilled += due.amount;
      grp.totalPaid += due.paidAmount;
      grp.totalRemaining += due.remainingAmount;
      if (due.status === 'overdue') grp.overdueCount++;
      else if (due.status === 'due' || due.status === 'partially_paid') grp.dueCount++;
      else if (due.status === 'paid') grp.paidCount++;
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
        <button
          onClick={handleSyncRecurring}
          disabled={syncing}
          className="neu-button px-4 py-2 text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Generating Dues...' : 'Run Billing Sync'}
        </button>
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
                  <th className="py-3 px-4 font-bold">Student Name</th>
                  <th className="py-3 px-4 font-bold">Services Enrolled</th>
                  <th className="py-3 px-4 font-bold text-center">Months Billed</th>
                  <th className="py-3 px-4 font-bold">Total Billed</th>
                  <th className="py-3 px-4 font-bold">Paid So Far</th>
                  <th className="py-3 px-4 font-bold">Net Remaining</th>
                  <th className="py-3 px-4 font-bold">Account Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-medium">
                {studentGroups.map((grp) => {
                  const sId = grp.student?._id || 'unknown';
                  const isExpanded = expandedStudentIds.has(sId);
                  const isFullySettled = grp.totalRemaining === 0;

                  // Unique services
                  const services = Array.from(new Set(grp.dues.map(d => d.serviceType)));

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
                              title={isExpanded ? "Collapse months" : "View individual months"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <div>
                              <div className="text-slate-900 font-bold">{grp.student?.fullName || 'N/A'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {grp.student?.studentId}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {services.map(srv => (
                              <span 
                                key={srv}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  srv === 'coaching' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                                }`}
                              >
                                {srv}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleStudentExpand(sId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                          >
                            <span>{grp.dues.length} cycles</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">₹{grp.totalBilled.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">₹{grp.totalPaid.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-extrabold ${isFullySettled ? 'text-slate-400' : 'text-amber-600'}`}>
                            ₹{grp.totalRemaining.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isFullySettled ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Fully Settled
                            </span>
                          ) : grp.overdueCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3" /> {grp.overdueCount} Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <Clock className="w-3 h-3" /> Due Pending
                            </span>
                          )}
                        </td>

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

                            {/* Collect Fee Action */}
                            {!isFullySettled ? (
                              <button
                                onClick={() => setDirectStudent(grp.student)}
                                className="neu-button-primary px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1"
                                title="Collect any amount or settle full outstanding"
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

                      {/* Expanded Collapsible Drawer showing exact monthly fee details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-y border-slate-200">
                          <td colSpan={8} className="p-3 sm:p-4">
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                  Individual Monthly Fee Breakdown ({grp.dues.length} cycles)
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Click 'Pay Month' to settle a specific monthly period
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 bg-slate-50/50">
                                    <tr>
                                      <th className="py-2 px-3">Service</th>
                                      <th className="py-2 px-3">Billing Cycle</th>
                                      <th className="py-2 px-3">Due Date</th>
                                      <th className="py-2 px-3">Monthly Amount</th>
                                      <th className="py-2 px-3">Paid</th>
                                      <th className="py-2 px-3">Remaining</th>
                                      <th className="py-2 px-3">Cycle Status</th>
                                      <th className="py-2 px-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                                    {grp.dues.map((due) => {
                                      const isDuePaid = due.status === 'paid' || due.remainingAmount === 0;
                                      return (
                                        <tr key={due._id} className="hover:bg-slate-50/80 transition">
                                          <td className="py-2 px-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                              due.serviceType === 'coaching' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                                            }`}>
                                              {due.serviceType}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 font-mono text-slate-700">{due.billingPeriod}</td>
                                          <td className="py-2 px-3 text-slate-500">
                                            {new Date(due.dueDate).toLocaleDateString('en-GB')}
                                          </td>
                                          <td className="py-2 px-3 font-semibold text-slate-800">₹{due.amount}</td>
                                          <td className="py-2 px-3 text-emerald-700 font-semibold">₹{due.paidAmount}</td>
                                          <td className="py-2 px-3">
                                            <span className={`font-bold ${isDuePaid ? 'text-slate-400' : 'text-amber-600'}`}>
                                              ₹{due.remainingAmount}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3">
                                            {isDuePaid ? (
                                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Paid ✓
                                              </span>
                                            ) : due.status === 'overdue' ? (
                                              <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Overdue
                                              </span>
                                            ) : (
                                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Due
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              {smartModeEnabled && (
                                                <button
                                                  type="button"
                                                  onClick={() => setManipulateDue(due)}
                                                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold"
                                                >
                                                  Edit
                                                </button>
                                              )}
                                              {!isDuePaid ? (
                                                <button
                                                  onClick={() => setSelectedFeeDue(due)}
                                                  className="px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 transition"
                                                >
                                                  Pay Month
                                                </button>
                                              ) : (
                                                <span className="text-slate-400 text-[10px]">Settled</span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> Due
                          </span>
                        )}
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
          setSelectedFeeDue(null);
          fetchDues();
        }}
      />

      {/* Direct Collect Fee Modal (Full Balance / Flexible Amount) */}
      <DirectCollectFeeModal
        student={directStudent}
        onClose={() => setDirectStudent(null)}
        onSuccess={() => {
          setDirectStudent(null);
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
