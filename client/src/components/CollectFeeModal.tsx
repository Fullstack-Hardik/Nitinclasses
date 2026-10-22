import React, { useState } from 'react';
import { X, IndianRupee, Download } from 'lucide-react';
import api from '../services/api';
import { FeeDue } from '../types';

interface CollectFeeModalProps {
  feeDue: FeeDue | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CollectFeeModal: React.FC<CollectFeeModalProps> = ({ feeDue, onClose, onSuccess }) => {
  const [amountPaid, setAmountPaid] = useState<string>(feeDue ? feeDue.remainingAmount.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [upiTransactionRef, setUpiTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  React.useEffect(() => {
    if (feeDue) {
      setAmountPaid(feeDue.remainingAmount.toString());
      setReceiptPaymentId(null);
      setReceiptNumber(null);
      setError(null);
      setNotes('');
      setUpiTransactionRef('');
    }
  }, [feeDue?._id]);

  if (!feeDue) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = Number(amountPaid);
    if (isNaN(num) || num <= 0) {
      setError('Please provide a valid positive amount.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/fees/collect', {
        feeDueId: feeDue._id,
        amountPaid: num,
        paymentMethod,
        upiTransactionRef,
        notes
      });

      if (res.data.success) {
        setReceiptPaymentId(res.data.data.payment._id);
        setReceiptNumber(res.data.data.payment.receiptNumber);
        window.dispatchEvent(new Event('nsc_fees_updated'));
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptPaymentId) return;
    try {
      const response = await api.get(`/fees/receipt/${receiptPaymentId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt-${receiptNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert('Error downloading receipt: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setReceiptPaymentId(null);
    setReceiptNumber(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-card w-full max-w-lg p-6 sm:p-8 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Record Fee Payment</h2>
            <p className="text-xs text-slate-500 mt-0.5">Cash / UPI fee collection</p>
          </div>
          <button 
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {receiptPaymentId ? (
          /* Payment Success & Receipt download screen */
          <div className="py-5 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <IndianRupee className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Recorded Successfully!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Receipt No: <span className="font-bold text-slate-800 font-mono">{receiptNumber}</span>
              </p>
            </div>

            {/* Clear Month & Amount Confirmation */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5 text-left font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{feeDue.student.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold capitalize text-slate-900">{feeDue.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cycle / Month:</span>
                <span className="font-semibold text-blue-700">{feeDue.billingPeriod}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-extrabold text-emerald-700 text-sm">₹{amountPaid}</span>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="neu-button-primary w-full sm:w-auto px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF Receipt
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="neu-button w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                Done / Back to List
              </button>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* Student & Due Summary */}
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{feeDue.student.fullName} ({feeDue.student.studentId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold capitalize text-slate-900">{feeDue.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Period:</span>
                <span className="font-medium text-slate-800">{feeDue.billingPeriod}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Original Fee:</span>
                <span className="font-semibold text-slate-800">₹{feeDue.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Previously Paid:</span>
                <span className="font-semibold text-emerald-700">₹{feeDue.paidAmount}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="font-bold text-slate-700">Remaining Balance:</span>
                <span className="font-extrabold text-amber-600">₹{feeDue.remainingAmount}</span>
              </div>
            </div>

            {/* Input Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Amount Being Collected (₹) *
                </label>
                <span className="text-[11px] text-blue-600 font-medium">
                  Extra amount auto-sorts next months
                </span>
              </div>
              <input
                type="number"
                min="1"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full neu-input px-3.5 py-2.5 text-sm font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Supports partial payment or advance multi-month payment (e.g. ₹1000 or ₹1500).
              </span>
            </div>

            {/* Payment Method: Cash or UPI */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Payment Method *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`
                    py-2.5 rounded-xl text-xs font-bold transition-all border
                    ${paymentMethod === 'cash'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'neu-button text-slate-700 border-transparent hover:bg-slate-200/60'
                    }
                  `}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`
                    py-2.5 rounded-xl text-xs font-bold transition-all border
                    ${paymentMethod === 'upi'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'neu-button text-slate-700 border-transparent hover:bg-slate-200/60'
                    }
                  `}
                >
                  UPI
                </button>
              </div>
            </div>

            {paymentMethod === 'upi' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  UPI Reference / Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-984712849"
                  value={upiTransactionRef}
                  onChange={(e) => setUpiTransactionRef(e.target.value)}
                  className="w-full neu-input px-3.5 py-2 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes (Optional)</label>
              <input
                type="text"
                placeholder="Optional payment remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full neu-input px-3.5 py-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="neu-button px-5 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="neu-button-primary px-6 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Confirm & Record Payment'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
