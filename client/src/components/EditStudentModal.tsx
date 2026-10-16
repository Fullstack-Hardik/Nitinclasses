import React, { useState } from 'react';
import { X, Save, AlertCircle, Sparkles } from 'lucide-react';
import api from '../services/api';
import { Student } from '../types';

interface EditStudentModalProps {
  student: Student | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  onClose,
  onSuccess
}) => {
  if (!student) return null;

  // Personal Info
  const [fullName, setFullName] = useState(student.fullName || '');
  const [fatherName, setFatherName] = useState(student.fatherName || '');
  const [mobileNumber, setMobileNumber] = useState(student.mobileNumber || '');
  const [address, setAddress] = useState(student.address || '');
  const [studentJoiningDate, setStudentJoiningDate] = useState(
    student.studentJoiningDate ? new Date(student.studentJoiningDate).toISOString().split('T')[0] : ''
  );

  // Membership Type: 'coaching_only' | 'library_only' | 'coaching_and_library'
  const [membershipType, setMembershipType] = useState<'coaching_only' | 'library_only' | 'coaching_and_library'>(
    student.membershipType || 'coaching_only'
  );

  // Coaching Details
  const [coachingMonthlyFee, setCoachingMonthlyFee] = useState(
    student.coaching?.monthlyFee ? student.coaching.monthlyFee.toString() : '0'
  );
  const [coachingJoiningDate, setCoachingJoiningDate] = useState(
    student.coaching?.joiningDate
      ? new Date(student.coaching.joiningDate).toISOString().split('T')[0]
      : (student.studentJoiningDate ? new Date(student.studentJoiningDate).toISOString().split('T')[0] : '')
  );
  const [coachingStatus, setCoachingStatus] = useState<'active' | 'inactive' | 'paused'>(
    student.coaching?.status || 'active'
  );

  // Library Details
  const [libraryType, setLibraryType] = useState<'boys' | 'girls'>(
    student.library?.libraryType || 'boys'
  );
  const [libraryMonthlyFee, setLibraryMonthlyFee] = useState(
    student.library?.monthlyFee ? student.library.monthlyFee.toString() : '0'
  );
  const [libraryJoiningDate, setLibraryJoiningDate] = useState(
    student.library?.joiningDate
      ? new Date(student.library.joiningDate).toISOString().split('T')[0]
      : (student.studentJoiningDate ? new Date(student.studentJoiningDate).toISOString().split('T')[0] : '')
  );
  const [seatNumber, setSeatNumber] = useState(
    student.library?.seatNumber ? student.library.seatNumber.toString() : ''
  );
  const [libraryStatus, setLibraryStatus] = useState<'active' | 'inactive' | 'paused'>(
    student.library?.status || 'active'
  );

  // Advance Balance (Smart Control)
  const [advanceFeeBalance, setAdvanceFeeBalance] = useState(
    (student.advanceFeeBalance || 0).toString()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCoaching = membershipType === 'coaching_only' || membershipType === 'coaching_and_library';
  const showLibrary = membershipType === 'library_only' || membershipType === 'coaching_and_library';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (mobileNumber.trim() && !/^\d{10}$/.test(mobileNumber.trim())) {
      setError('Please provide a valid 10-digit mobile number, or leave it blank.');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        fullName: fullName.trim(),
        fatherName: fatherName.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        studentJoiningDate,
        membershipType,
        advanceFeeBalance: Number(advanceFeeBalance) || 0
      };

      if (showCoaching) {
        payload.coachingMonthlyFee = Number(coachingMonthlyFee) || 0;
        payload.coachingJoiningDate = coachingJoiningDate;
        payload.coachingStatus = coachingStatus;
      }

      if (showLibrary) {
        payload.libraryType = libraryType;
        payload.libraryMonthlyFee = Number(libraryMonthlyFee) || 0;
        payload.libraryJoiningDate = libraryJoiningDate;
        payload.libraryStatus = libraryStatus;
        payload.seatNumber = seatNumber ? Number(seatNumber) : null;
      }

      const res = await api.put(`/students/${student._id}`, payload);
      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update student details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Student & Memberships</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manipulate student profile, fee rates, join dates, and coaching/library enrollments
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section A: Personal Information */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              A. Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full neu-input px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Father's Name (Optional)</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full neu-input px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mobile Number (Optional)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit number"
                  className="w-full neu-input px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admission Date *</label>
                <input
                  type="date"
                  required
                  value={studentJoiningDate}
                  onChange={(e) => setStudentJoiningDate(e.target.value)}
                  className="w-full neu-input px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address (Optional)</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Residential address..."
                  className="w-full neu-input px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section B: Membership Type Toggling */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              B. Membership Subscriptions (Add/Remove Anytime)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'coaching_only', label: 'Coaching Only', code: 'C1-...' },
                { id: 'library_only', label: 'Library Only', code: 'L1-...' },
                { id: 'coaching_and_library', label: 'Coaching + Library', code: 'LC1-...' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMembershipType(opt.id as any)}
                  className={`
                    p-3 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center gap-1
                    ${membershipType === opt.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'neu-button text-slate-700 border-transparent hover:bg-slate-200/60'
                    }
                  `}
                >
                  <span>{opt.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${membershipType === opt.id ? 'bg-slate-800 text-slate-300' : 'text-slate-400'}`}>
                    ID: {opt.code}
                  </span>
                </button>
              ))}
            </div>
            {student && student.membershipType !== membershipType && (
              <p className="text-[11px] text-blue-600 mt-2 font-medium">
                ℹ️ Changing service will automatically re-assign student ID code to match ({membershipType === 'library_only' ? 'L1' : membershipType === 'coaching_and_library' ? 'LC1' : 'C1'}).
              </p>
            )}
          </div>

          {/* Section C: Coaching Settings */}
          {showCoaching && (
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 space-y-4">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                C. Coaching Details & Fee Override
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={coachingMonthlyFee}
                    onChange={(e) => setCoachingMonthlyFee(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm font-bold text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Coaching Joining Date</label>
                  <input
                    type="date"
                    value={coachingJoiningDate}
                    onChange={(e) => setCoachingJoiningDate(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Sets billing anniversary day</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <select
                    value={coachingStatus}
                    onChange={(e) => setCoachingStatus(e.target.value as any)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section D: Library Settings */}
          {showLibrary && (
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 space-y-4">
              <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider">
                D. Library Details & Fee Override
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Library Hall</label>
                  <select
                    value={libraryType}
                    onChange={(e) => setLibraryType(e.target.value as any)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  >
                    <option value="boys">Boys' Library</option>
                    <option value="girls">Girls' Library</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={libraryMonthlyFee}
                    onChange={(e) => setLibraryMonthlyFee(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm font-bold text-violet-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Library Joining Date</label>
                  <input
                    type="date"
                    value={libraryJoiningDate}
                    onChange={(e) => setLibraryJoiningDate(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Sets billing anniversary day</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Seat Number</label>
                  <input
                    type="number"
                    placeholder="Seat # (or empty)"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <select
                    value={libraryStatus}
                    onChange={(e) => setLibraryStatus(e.target.value as any)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section E: Advance Wallet Credit Balance */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Advance Fee Wallet Balance (₹)
              </label>
              <span className="text-[11px] text-blue-700">Auto-sorts across next months</span>
            </div>
            <input
              type="number"
              min="0"
              value={advanceFeeBalance}
              onChange={(e) => setAdvanceFeeBalance(e.target.value)}
              className="w-full neu-input px-3.5 py-2 text-sm font-bold text-blue-900"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="neu-button px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="neu-button-primary px-6 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving Changes...' : 'Save Updated Student Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
