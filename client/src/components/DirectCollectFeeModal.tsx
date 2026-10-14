import React, { useState } from 'react';
import { X, IndianRupee, Download, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { Student } from '../types';

interface DirectCollectFeeModalProps {
  student: Student | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DirectCollectFeeModal: React.FC<DirectCollectFeeModalProps> = ({
  student,
  onClose,
  onSuccess
}) => {
  const [serviceType, setServiceType] = useState<'coaching' | 'library'>(
    student?.coaching?.hasMembership ? 'coaching' : 'library'
  );
  
  // Default amount based on membership fee
  const defaultFee = student
    ? (serviceType === 'coaching' ? student.coaching?.monthlyFee : student.library?.monthlyFee) || 500
    : 500;

  const [amount, setAmount] = useState<string>(defaultFee.toString());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [upiTransactionRef, setUpiTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [successData, setSuccessData] = useState<{
    paymentId: string;
    receiptNumber: string;
    message: string;
    excessAddedToAdvance: number;
  } | null>(null);

  if (!student) return null;

  const currentOutstanding = student.totalOutstanding || 0;
  const currentAdvance = student.advanceFeeBalance || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/fees/collect-anytime', {
        studentId: student._id,
        serviceType,
        amount: num,
        paymentMethod,
        upiTransactionRef,
        notes
      });

      if (res.data.success) {
        setSuccessData({
          paymentId: res.data.data.payment._id,
          receiptNumber: res.data.data.payment.receiptNumber,
          message: res.data.message,
          excessAddedToAdvance: res.data.data.excessAddedToAdvance || 0
        });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record fee payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!successData?.paymentId) return;
    try {
      const response = await api.get(`/fees/receipt/${successData.paymentId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt-${successData.receiptNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert('Error downloading receipt: ' + err.message);
    }
  };

  const handleDownloadFullStatement = async () => {
    try {
      const response = await api.get(`/fees/student/${student._id}/statement/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fee-Statement-${student.studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert('Error downloading statement: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Collect Student Fee</h2>
              <p className="text-xs text-slate-400">Accept current or advance payment anytime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successData ? (
          /* Payment Success Confirmation */
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Payment Recorded!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {successData.message}
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between font-mono">
              <span className="text-slate-400">Receipt No:</span>
              <span className="font-bold text-white">{successData.receiptNumber}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition"
              >
                <Download className="w-4 h-4" />
                Download Payment Receipt PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadFullStatement}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <Download className="w-4 h-4" />
                Full Ledger Statement
              </button>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white font-semibold underline"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          /* Payment Entry Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Student Info Card */}
            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white text-sm block">{student.fullName}</span>
                <span className="text-slate-400">ID: {student.studentId} • {student.mobileNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block">Pending Due</span>
                <span className={`font-bold ${currentOutstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  ₹{currentOutstanding}
                </span>
                {currentAdvance > 0 && (
                  <span className="text-[10px] text-blue-400 block font-semibold">
                    Advance Wallet: ₹{currentAdvance}
                  </span>
                )}
              </div>
            </div>

            {/* Service Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Service Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setServiceType('coaching');
                    if (student.coaching?.monthlyFee) setAmount(student.coaching.monthlyFee.toString());
                  }}
                  disabled={!student.coaching?.hasMembership}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                    serviceType === 'coaching'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  } ${!student.coaching?.hasMembership ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Coaching {student.coaching?.hasMembership ? `(₹${student.coaching.monthlyFee}/mo)` : '(N/A)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServiceType('library');
                    if (student.library?.monthlyFee) setAmount(student.library.monthlyFee.toString());
                  }}
                  disabled={!student.library?.hasMembership}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                    serviceType === 'library'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  } ${!student.library?.hasMembership ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Library {student.library?.hasMembership ? `(₹${student.library.monthlyFee}/mo)` : '(N/A)'}
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Amount to Collect (₹)
                </label>
                <span className="text-[11px] text-blue-400 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3" />
                  Excess auto-sorts next months
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-8 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                You can enter standard monthly fee, pending balance, or advance multi-month fee (e.g. ₹1500 for 3 months).
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    paymentMethod === 'upi'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  📱 UPI / Online
                </button>
              </div>
            </div>

            {/* UPI Ref if UPI selected */}
            {paymentMethod === 'upi' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  UPI Transaction ID / Ref No (Optional)
                </label>
                <input
                  type="text"
                  value={upiTransactionRef}
                  onChange={(e) => setUpiTransactionRef(e.target.value)}
                  placeholder="e.g. UPI-9849202482"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid in advance by father"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                {loading ? 'Processing...' : 'Confirm & Collect'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
