import React, { useEffect, useState } from 'react';
import { 
  X, 
  Calendar, 
  IndianRupee, 
  Download, 
  Trash2, 
  AlertTriangle,
  GraduationCap,
  BookOpen,
  MapPin,
  Phone,
  Receipt
} from 'lucide-react';
import api from '../services/api';
import { Student, FeeDue, Payment } from '../types';

interface StudentProfileModalProps {
  studentId: string | null;
  onClose: () => void;
  onDeleted: () => void;
  onRefreshList: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  studentId,
  onClose,
  onDeleted,
  onRefreshList
}) => {
  const [data, setData] = useState<{
    student: Student;
    dues: FeeDue[];
    payments: Payment[];
    summary: { totalBilled: number; totalPaid: number; totalOutstanding: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion workflow safeguards
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [archiveDownloaded, setArchiveDownloaded] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProfile = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/students/${studentId}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [studentId]);

  if (!studentId) return null;

  // Step 1 of Deletion: Download Archive File
  const handleDownloadArchive = async () => {
    try {
      const response = await api.get(`/settings/export/student-archive/${studentId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Archive_${data?.student.studentId}_${data?.student.fullName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setArchiveDownloaded(true);
    } catch (err: any) {
      alert('Failed to generate archive: ' + (err.message || 'Error occurred.'));
    }
  };

  // Step 2: Confirm Deletion
  const handleConfirmDelete = async () => {
    if (!archiveDownloaded) {
      alert('You must download the financial archive before deleting.');
      return;
    }
    try {
      setDeleteLoading(true);
      const res = await api.delete(`/students/${studentId}`, {
        data: { archiveConfirmed: true }
      });
      if (res.data.success) {
        onDeleted();
        onClose();
      }
    } catch (err: any) {
      alert('Failed to delete student: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: string, receiptNum: string) => {
    try {
      const response = await api.get(`/fees/receipt/${paymentId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt-${receiptNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert('Could not download PDF receipt: ' + (err.message || 'Error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200/60 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              {data?.student.studentId.slice(-3) || 'ST'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{data?.student.fullName || 'Student Profile'}</h2>
              <p className="text-xs text-slate-500 font-medium">ID: {data?.student.studentId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await api.get(`/fees/student/${studentId}/statement/pdf`, {
                    responseType: 'blob'
                  });
                  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `Fee-Statement-${data?.student.studentId}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.parentNode?.removeChild(link);
                } catch (err: any) {
                  alert('Error downloading complete statement: ' + err.message);
                }
              }}
              className="neu-button-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              title="Download full fee ledger and receipt statement PDF"
            >
              <Download className="w-3.5 h-3.5" />
              Download Full Receipt & Statement
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error || !data ? (
          <div className="p-8 text-center text-sm text-red-600">{error || 'No data available'}</div>
        ) : (
          <div className="space-y-6">
            {/* Personal & Contact Grid */}
            <div className="neu-card-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium mb-0.5">Mobile Number</p>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {data.student.mobileNumber}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium mb-0.5">Date of Birth</p>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(data.student.dateOfBirth).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium mb-0.5">Admission Date</p>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(data.student.studentJoiningDate).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div className="sm:col-span-3">
                <p className="text-slate-400 font-medium mb-0.5">Residential Address</p>
                <p className="font-semibold text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  {data.student.address}
                </p>
              </div>
            </div>

            {/* Membership Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Coaching Card */}
              <div className="neu-card-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Coaching Membership
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    data.student.coaching?.hasMembership ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {data.student.coaching?.hasMembership ? (data.student.coaching.status || 'Active') : 'Not Enrolled'}
                  </span>
                </div>
                {data.student.coaching?.hasMembership ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-600">Monthly Fee: <span className="font-bold text-slate-900">₹{data.student.coaching.monthlyFee}</span></p>
                    <p className="text-slate-500">Joined: {data.student.coaching.joiningDate ? new Date(data.student.coaching.joiningDate).toLocaleDateString('en-GB') : 'N/A'}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No coaching batch enrolled</p>
                )}
              </div>

              {/* Library Card */}
              <div className="neu-card-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                    Library Membership
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    data.student.library?.hasMembership ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {data.student.library?.hasMembership ? (data.student.library.status || 'Active') : 'Not Enrolled'}
                  </span>
                </div>
                {data.student.library?.hasMembership ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-600">
                      Hall: <span className="font-bold capitalize text-slate-900">{data.student.library.libraryType} Library</span>
                    </p>
                    <p className="text-slate-600">
                      Assigned Seat: <span className="font-bold text-slate-900">{data.student.library.seatNumber ? `#${data.student.library.seatNumber}` : 'Unallocated'}</span>
                    </p>
                    <p className="text-slate-600">Monthly Fee: <span className="font-bold text-slate-900">₹{data.student.library.monthlyFee}</span></p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No library seat subscribed</p>
                )}
              </div>
            </div>

            {/* Financial Ledger Summary */}
            <div className="neu-card-sm p-4 bg-slate-900 text-white rounded-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Financial Ledger</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[11px] text-slate-400">Total Billed</p>
                  <p className="text-base sm:text-lg font-bold mt-0.5">₹{data.summary.totalBilled.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-emerald-400">Total Paid</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">₹{data.summary.totalPaid.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-amber-400">Outstanding Balance</p>
                  <p className="text-base sm:text-lg font-bold text-amber-400 mt-0.5">₹{data.summary.totalOutstanding.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Payment History & Receipts */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Payment History & Receipts</h3>
              {data.payments.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-100 text-center text-xs text-slate-500">
                  No payment records recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200/60 text-slate-700">
                      <tr>
                        <th className="p-2.5 rounded-l-lg">Receipt No</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Service</th>
                        <th className="p-2.5">Period</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5 rounded-r-lg text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50">
                      {data.payments.map((p) => (
                        <tr key={p._id}>
                          <td className="p-2.5 font-bold text-slate-900">{p.receiptNumber}</td>
                          <td className="p-2.5 text-slate-600">{new Date(p.paymentDate).toLocaleDateString('en-GB')}</td>
                          <td className="p-2.5 capitalize">{p.serviceType}</td>
                          <td className="p-2.5 text-slate-500">{p.billingPeriod}</td>
                          <td className="p-2.5 font-bold text-emerald-700">₹{p.amountPaid}</td>
                          <td className="p-2.5 uppercase font-medium">{p.paymentMethod}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleDownloadReceipt(p._id, p.receiptNumber)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
                              title="Download PDF Receipt"
                            >
                              <Download className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Deletion Workflow Section */}
            <div className="pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Student Profile
                </button>
              ) : (
                <div className="w-full p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-800">Protected Student Deletion</h4>
                      <p className="text-[11px] text-red-700 mt-0.5">
                        Financial history must be archived first. Download archive spreadsheet to enable deletion.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadArchive}
                      className="neu-button px-3.5 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      {archiveDownloaded ? 'Archive Downloaded ✓' : '1. Download Financial Archive'}
                    </button>

                    <button
                      type="button"
                      disabled={!archiveDownloaded || deleteLoading}
                      onClick={handleConfirmDelete}
                      className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs disabled:opacity-40 hover:bg-red-700 transition"
                    >
                      {deleteLoading ? 'Archiving...' : '2. Confirm Protected Deletion'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 ml-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="neu-button px-5 py-2 text-xs font-semibold text-slate-700 ml-auto"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
