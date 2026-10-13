import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Calendar, 
  AlertCircle, 
  RefreshCw,
  IndianRupee,
  CheckCircle2,
  Clock
} from 'lucide-react';
import api from '../services/api';
import { FeeDue } from '../types';
import { CollectFeeModal } from './CollectFeeModal';

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

  const fetchDues = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (serviceFilter !== 'all') params.serviceType = serviceFilter;

      const res = await api.get('/fees', { params });
      if (res.data.success) {
        setDues(res.data.data);
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

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Tabs: Due Today, Pending, Overdue, Paid, All */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All' },
              { id: 'due_today', label: 'Due Today' },
              { id: 'pending', label: 'Pending' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'paid', label: 'Paid' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`
                  px-3 py-1.5 rounded-lg transition-all
                  ${statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
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
        ) : (
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
                        {!isPaid ? (
                          <button
                            onClick={() => setSelectedFeeDue(due)}
                            className="neu-button-primary px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                            Collect Fee
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect Fee Modal */}
      <CollectFeeModal
        feeDue={selectedFeeDue}
        onClose={() => setSelectedFeeDue(null)}
        onSuccess={() => {
          setSelectedFeeDue(null);
          fetchDues();
        }}
      />
    </div>
  );
};
