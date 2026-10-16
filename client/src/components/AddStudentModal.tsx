import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Personal Info
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [studentJoiningDate, setStudentJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Membership Type: 'coaching_only' | 'library_only' | 'coaching_and_library'
  const [membershipType, setMembershipType] = useState<'coaching_only' | 'library_only' | 'coaching_and_library'>('coaching_only');

  // Coaching Details
  const [coachingMonthlyFee, setCoachingMonthlyFee] = useState('');
  const [coachingJoiningDate, setCoachingJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [coachingStatus, setCoachingStatus] = useState<'active' | 'inactive' | 'paused'>('active');

  // Library Details
  const [libraryType, setLibraryType] = useState<'boys' | 'girls'>('boys');
  const [libraryMonthlyFee, setLibraryMonthlyFee] = useState('');
  const [libraryJoiningDate, setLibraryJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [seatNumber, setSeatNumber] = useState('');
  const [libraryStatus, setLibraryStatus] = useState<'active' | 'inactive' | 'paused'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const showCoaching = membershipType === 'coaching_only' || membershipType === 'coaching_and_library';
  const showLibrary = membershipType === 'library_only' || membershipType === 'coaching_and_library';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation - only full name is mandatory
    if (!fullName.trim()) {
      setError('Please enter the student\'s full name.');
      return;
    }

    if (mobileNumber.trim() && !/^\d{10}$/.test(mobileNumber.trim())) {
      setError('Please enter a valid 10-digit mobile number, or leave it blank.');
      return;
    }

    if (showCoaching && (!coachingMonthlyFee || Number(coachingMonthlyFee) <= 0)) {
      setError('Please provide a valid coaching monthly fee.');
      return;
    }

    if (showLibrary && (!libraryMonthlyFee || Number(libraryMonthlyFee) <= 0)) {
      setError('Please provide a valid library monthly fee.');
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
      };

      if (showCoaching) {
        payload.coachingMonthlyFee = Number(coachingMonthlyFee);
        payload.coachingJoiningDate = coachingJoiningDate;
        payload.coachingStatus = coachingStatus;
      }

      if (showLibrary) {
        payload.libraryType = libraryType;
        payload.libraryMonthlyFee = Number(libraryMonthlyFee);
        payload.libraryJoiningDate = libraryJoiningDate;
        payload.libraryStatus = libraryStatus;
        if (seatNumber) {
          payload.seatNumber = Number(seatNumber);
        }
      }

      const res = await api.post('/students', payload);
      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enroll student. Please check input data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="neu-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add New Student</h2>
            <p className="text-xs text-slate-500 mt-0.5">Register student with custom membership details</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
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
                  placeholder="e.g. Rahul Sharma"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admission / Registration Date *
                </label>
                <input
                  type="date"
                  required
                  value={studentJoiningDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setStudentJoiningDate(newDate);
                    // Pre-fill coaching and library joining dates by default
                    setCoachingJoiningDate(newDate);
                    setLibraryJoiningDate(newDate);
                  }}
                  className="w-full neu-input px-3.5 py-2.5 text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Overall admission date (coaching/library can have distinct joining dates below)
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Complete Address (Optional)</label>
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

          {/* Section B: Membership Selection */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              B. Membership Selection
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
          </div>

          {/* Section C: Coaching Details */}
          {showCoaching && (
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 space-y-4">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                C. Coaching Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monthly Fee (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required={showCoaching}
                    value={coachingMonthlyFee}
                    onChange={(e) => setCoachingMonthlyFee(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Joining Date *</label>
                  <input
                    type="date"
                    required={showCoaching}
                    value={coachingJoiningDate}
                    onChange={(e) => setCoachingJoiningDate(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Membership Status</label>
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

          {/* Section D: Library Details */}
          {showLibrary && (
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 space-y-4">
              <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider">
                D. Library Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Library Hall *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monthly Fee (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required={showLibrary}
                    value={libraryMonthlyFee}
                    onChange={(e) => setLibraryMonthlyFee(e.target.value)}
                    placeholder="e.g. 600"
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Joining Date *</label>
                  <input
                    type="date"
                    required={showLibrary}
                    value={libraryJoiningDate}
                    onChange={(e) => setLibraryJoiningDate(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Seat Allocation</label>
                  <input
                    type="number"
                    placeholder="Seat # (or leave empty)"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    className="w-full neu-input px-3 py-2 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Can be allocated later from seat map</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Membership Status</label>
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
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Save Student Record'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
