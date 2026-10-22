import React, { useState, useEffect } from 'react';
import { X, IndianRupee, Download, Sparkles, CheckCircle2, AlertCircle, PlusCircle, Calendar, BookOpen } from 'lucide-react';
import api from '../services/api';
import { Student, FeeDue } from '../types';
import { useToast } from '../context/ToastContext';

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
  const toast = useToast();
  const [serviceType, setServiceType] = useState<'coaching' | 'library'>(
    student?.coaching?.hasMembership ? 'coaching' : 'library'
  );
  
  const [studentDues, setStudentDues] = useState<FeeDue[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);

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
    amountCollected: number;
    serviceType: string;
    settledPayments: any[];
  } | null>(null);

  // Fetch dues for this student to show month-by-month dues breakdown
  const fetchStudentDues = async (sId: string) => {
    try {
      setLoadingDues(true);
      const res = await api.get('/fees', { params: { studentId: sId } });
      if (res.data.success) {
        setStudentDues(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDues(false);
    }
  };

  useEffect(() => {
    if (student) {
      setSuccessData(null);
      setError(null);
      const def = (student.coaching?.hasMembership ? student.coaching?.monthlyFee : student.library?.monthlyFee) || 500;
      setAmount(def.toString());
      setServiceType(student.coaching?.hasMembership ? 'coaching' : 'library');
      setNotes('');
      setUpiTransactionRef('');
      fetchStudentDues(student._id);
    }
  }, [student?._id]);

  if (!student) return null;

  // Coaching & Library dues breakdown
  const coachingDues = studentDues.filter(d => d.serviceType === 'coaching' && d.remainingAmount > 0);
  const libraryDues = studentDues.filter(d => d.serviceType === 'library' && d.remainingAmount > 0);
  const coachingDueSum = coachingDues.reduce((sum, d) => sum + d.remainingAmount, 0);
  const libraryDueSum = libraryDues.reduce((sum, d) => sum + d.remainingAmount, 0);
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
          excessAddedToAdvance: res.data.data.excessAddedToAdvance || 0,
          amountCollected: num,
          serviceType,
          settledPayments: res.data.data.settledPayments || []
        });
        toast.success(`Fee ₹${num} collected successfully!`);
        window.dispatchEvent(new Event('nsc_fees_updated'));
        // Notify parent to refresh lists in background
        onSuccess();
        // Also re-fetch dues for this student
        fetchStudentDues(student._id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to record fee payment.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectAnother = () => {
    setSuccessData(null);
    setError(null);
    const def = (serviceType === 'coaching' ? student.coaching?.monthlyFee : student.library?.monthlyFee) || 500;
    setAmount(def.toString());
    setNotes('');
    setUpiTransactionRef('');
    if (student) fetchStudentDues(student._id);
  };

  const handleClose = () => {
    setSuccessData(null);
    setError(null);
    onClose();
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
      toast.info('Receipt downloaded');
    } catch (err: any) {
      toast.error('Error downloading receipt: ' + err.message);
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
      toast.info('Student ledger downloaded');
    } catch (err: any) {
      toast.error('Error downloading statement: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Collect Student Fee</h2>
              <p className="text-xs text-slate-400">Accept monthly, balance, or advance fee anytime</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successData ? (
          /* ================= PAYMENT SUCCESS SCREEN ================= */
          <div className="py-2 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Payment Recorded Successfully!</h3>
              <p className="text-xs text-emerald-400 font-semibold mt-1">
                ₹{successData.amountCollected} Received via {paymentMethod.toUpperCase()}
              </p>
            </div>

            {/* Receipt No */}
            <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60 text-xs flex items-center justify-between font-mono">
              <span className="text-slate-400">Receipt Number:</span>
              <span className="font-bold text-emerald-400">{successData.receiptNumber}</span>
            </div>

            {/* Month & Cycle Settlement Breakdown */}
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Fee Allocation Breakdown
              </div>

              {successData.settledPayments && successData.settledPayments.length > 0 ? (
                <div className="space-y-1.5 pt-1 max-h-40 overflow-y-auto pr-1">
                  {successData.settledPayments.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.serviceType === 'coaching' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-purple-900/60 text-purple-300'
                        }`}>
                          {p.serviceType}
                        </span>
                        <span className="text-slate-200 font-medium">{p.billingPeriod}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-emerald-400">₹{p.amountPaid}</span>
                        <span className="text-[10px] text-slate-400">Paid ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-1">Fee credited to account.</p>
              )}

              {successData.excessAddedToAdvance > 0 && (
                <div className="p-2 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs text-blue-300 flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Saved in Advance Wallet for next cycles:
                  </span>
                  <span className="font-bold text-blue-200">₹{successData.excessAddedToAdvance}</span>
                </div>
              )}
            </div>

            {/* PDF Downloads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Receipt PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadFullStatement}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Full Ledger PDF
              </button>
            </div>

            {/* Continuous Workflow Action Buttons - No Reload Required */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleCollectAnother}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Collect Another Fee
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          /* ================= PAYMENT ENTRY FORM ================= */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Student Info Card */}
            <div className="p-3.5 bg-slate-800/70 rounded-xl border border-slate-700/60 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                <div>
                  <span className="font-bold text-white text-sm block">{student.fullName}</span>
                  <span className="text-slate-400">
                    ID: {student.studentId}
                    {student.fatherName && ` • S/D of ${student.fatherName}`}
                    {student.mobileNumber && ` • ${student.mobileNumber}`}
                  </span>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 ${
                  currentAdvance > 0 
                    ? 'text-emerald-300 bg-emerald-950/60 border-emerald-700/60 shadow-xs' 
                    : 'text-slate-400 bg-slate-800/80 border-slate-700/60'
                }`}>
                  💼 Advance: ₹{currentAdvance}
                </span>
              </div>

              {/* Outstanding Month-by-Month Dues Breakdown */}
              <div className="pt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-400 font-semibold">Coaching Due:</span>
                    <span className={`font-bold ${coachingDueSum > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ₹{coachingDueSum}
                    </span>
                  </div>
                  {coachingDues.length > 0 && (
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {coachingDues.map(d => d.billingPeriod).join(', ')}
                    </div>
                  )}
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400 font-semibold">Library Due:</span>
                    <span className={`font-bold ${libraryDueSum > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ₹{libraryDueSum}
                    </span>
                  </div>
                  {libraryDues.length > 0 && (
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {libraryDues.map(d => d.billingPeriod).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Apply Fee To Service
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setServiceType('coaching');
                    const targetDue = coachingDueSum > 0 ? coachingDueSum : (student.coaching?.monthlyFee || 500);
                    setAmount(targetDue.toString());
                  }}
                  disabled={!student.coaching?.hasMembership}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                    serviceType === 'coaching'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 ring-1 ring-blue-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  } ${!student.coaching?.hasMembership ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  📚 Coaching {student.coaching?.hasMembership ? `(₹${student.coaching.monthlyFee}/mo)` : '(Not Enrolled)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServiceType('library');
                    const targetDue = libraryDueSum > 0 ? libraryDueSum : (student.library?.monthlyFee || 500);
                    setAmount(targetDue.toString());
                  }}
                  disabled={!student.library?.hasMembership}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                    serviceType === 'library'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400 ring-1 ring-purple-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  } ${!student.library?.hasMembership ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  📖 Library {student.library?.hasMembership ? `(₹${student.library.monthlyFee}/mo)` : '(Not Enrolled)'}
                </button>
              </div>
            </div>

            {/* Quick Amount Shortcuts for Fast UI */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Amount to Collect (₹)
                </label>
                <div className="flex items-center gap-1.5">
                  {serviceType === 'coaching' && coachingDueSum > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(coachingDueSum.toString())}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold"
                    >
                      Fill Coaching Due (₹{coachingDueSum})
                    </button>
                  )}
                  {serviceType === 'library' && libraryDueSum > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(libraryDueSum.toString())}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold"
                    >
                      Fill Library Due (₹{libraryDueSum})
                    </button>
                  )}
                </div>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-8 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-400">Presets:</span>
                {[300, 500, 600, 800, 1000, 1500, 2000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
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
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  💵 Cash Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    paymentMethod === 'upi'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 ring-1 ring-blue-500/50'
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
                placeholder="e.g. Month fee deposited"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleClose}
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
