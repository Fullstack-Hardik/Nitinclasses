import React, { useState } from 'react';
import { X, Save, AlertCircle, Sparkles } from 'lucide-react';
import api from '../services/api';
import { FeeDue } from '../types';

interface ManipulateFeeModalProps {
  feeDue: FeeDue | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManipulateFeeModal: React.FC<ManipulateFeeModalProps> = ({
  feeDue,
  onClose,
  onSuccess
}) => {
  if (!feeDue) return null;

  const [amount, setAmount] = useState<string>(feeDue.amount.toString());
  const [paidAmount, setPaidAmount] = useState<string>(feeDue.paidAmount.toString());
  const [remainingAmount, setRemainingAmount] = useState<string>(feeDue.remainingAmount.toString());
  const [status, setStatus] = useState<string>(feeDue.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate remaining when total or paid changes
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const a = Number(val) || 0;
    const p = Number(paidAmount) || 0;
    const rem = Math.max(0, a - p);
    setRemainingAmount(rem.toString());
    if (rem === 0) setStatus('paid');
    else if (p > 0) setStatus('partially_paid');
    else setStatus('due');
  };

  const handlePaidChange = (val: string) => {
    setPaidAmount(val);
    const a = Number(amount) || 0;
    const p = Number(val) || 0;
    const rem = Math.max(0, a - p);
    setRemainingAmount(rem.toString());
    if (rem === 0) setStatus('paid');
    else if (p > 0) setStatus('partially_paid');
    else setStatus('due');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const res = await api.put(`/fees/due/${feeDue._id}/manipulate`, {
        amount: Number(amount) || 0,
        paidAmount: Number(paidAmount) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        status
      });

      if (res.data.success) {
        window.dispatchEvent(new Event('nsc_fees_updated'));
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update fee record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Smart Mode: Manipulate Fee</h2>
              <p className="text-xs text-slate-400">Override billed, paid, and pending figures</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 text-xs">
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Student:</span>
              <span className="font-bold text-white">{feeDue.student?.fullName}</span>
            </div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Period:</span>
              <span className="font-mono text-slate-300">{feeDue.billingPeriod}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Service:</span>
              <span className="capitalize font-bold text-blue-400">{feeDue.serviceType}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Monthly Billed Fee Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Paid So Far (₹)
            </label>
            <input
              type="number"
              min="0"
              required
              value={paidAmount}
              onChange={(e) => handlePaidChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm font-bold text-emerald-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Remaining Outstanding Balance (₹)
            </label>
            <input
              type="number"
              min="0"
              required
              value={remainingAmount}
              onChange={(e) => setRemainingAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm font-bold text-amber-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Status Override
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid (Settled)</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-blue-600/25"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : 'Save Smart Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
