import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Ban, 
  Sliders, 
  AlertCircle,
  Building,
  UserCheck,
  Plus,
  Trash2,
  Search,
  UserPlus,
  X,
  Phone,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { Seat, Student } from '../types';

export const LibraryPage: React.FC = () => {
  const [libraryType, setLibraryType] = useState<'boys' | 'girls'>('boys');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [stats, setStats] = useState<{
    totalSeats: number;
    occupiedSeats: number;
    availableSeats: number;
    blockedSeats: number;
    occupancyRate: number;
  }>({
    totalSeats: 50,
    occupiedSeats: 0,
    availableSeats: 50,
    blockedSeats: 0,
    occupancyRate: 0
  });

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Capacity config modal
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [newCapacity, setNewCapacity] = useState<string>('50');
  const [capacityLoading, setCapacityLoading] = useState(false);

  // Add Seat modal
  const [showAddSeatModal, setShowAddSeatModal] = useState(false);
  const [customSeatNumber, setCustomSeatNumber] = useState('');
  const [addSeatLoading, setAddSeatLoading] = useState(false);

  // Assign Student Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState<Student | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Seat Action state
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/library/overview', {
        params: { libraryType }
      });
      if (res.data.success) {
        setSeats(res.data.seats);
        setStats(res.data.stats);
        setNewCapacity(res.data.stats.totalSeats.toString());
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load library seat map.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedSeat(null);
    fetchLibraryData();
  }, [libraryType]);

  // Fetch eligible students for seat allocation modal
  const fetchEligibleStudents = async (searchQuery = '') => {
    try {
      setStudentsLoading(true);
      const res = await api.get('/library/eligible-students', {
        params: { libraryType, search: searchQuery }
      });
      if (res.data.success) {
        setEligibleStudents(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch eligible students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleOpenAssignModal = () => {
    setStudentSearch('');
    setSelectedStudentToAssign(null);
    fetchEligibleStudents('');
    setShowAssignModal(true);
  };

  const handleSearchStudents = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEligibleStudents(studentSearch);
  };

  const handleAssignSeat = async () => {
    if (!selectedSeat || !selectedStudentToAssign) return;

    try {
      setAssignLoading(true);
      const res = await api.post('/library/allocate', {
        libraryType,
        seatNumber: selectedSeat.seatNumber,
        studentId: selectedStudentToAssign._id
      });
      if (res.data.success) {
        setShowAssignModal(false);
        setSelectedStudentToAssign(null);
        await fetchLibraryData();
        // Update selected seat with new populated data
        const updatedSeat = res.data.seat;
        setSelectedSeat({
          ...updatedSeat,
          assignedStudent: selectedStudentToAssign
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign seat to student.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAddSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddSeatLoading(true);
      const res = await api.post('/library/add-seat', {
        libraryType,
        seatNumber: customSeatNumber ? Number(customSeatNumber) : undefined
      });
      if (res.data.success) {
        setShowAddSeatModal(false);
        setCustomSeatNumber('');
        await fetchLibraryData();
        if (res.data.seat) {
          setSelectedSeat(res.data.seat);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add seat.');
    } finally {
      setAddSeatLoading(false);
    }
  };

  const handleDeleteSeat = async () => {
    if (!selectedSeat) return;
    const confirmMessage = selectedSeat.status === 'occupied'
      ? `Seat #${selectedSeat.seatNumber} is currently occupied! Deleting it will release the student's seat allocation. Proceed?`
      : `Are you sure you want to permanently delete Seat #${selectedSeat.seatNumber} from ${libraryType} library?`;

    if (!confirm(confirmMessage)) return;

    try {
      setActionLoading(true);
      const res = await api.post('/library/delete-seat', {
        libraryType,
        seatNumber: selectedSeat.seatNumber
      });
      if (res.data.success) {
        setSelectedSeat(null);
        fetchLibraryData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete seat.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedSeat) return;
    try {
      setActionLoading(true);
      const res = await api.post('/library/toggle-block', {
        libraryType,
        seatNumber: selectedSeat.seatNumber
      });
      if (res.data.success) {
        setSelectedSeat(res.data.seat);
        fetchLibraryData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle seat block.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseSeat = async () => {
    if (!selectedSeat || !selectedSeat.assignedStudent) return;
    if (!confirm(`Are you sure you want to release Seat #${selectedSeat.seatNumber}?`)) return;

    try {
      setActionLoading(true);
      const res = await api.post('/library/release', {
        libraryType,
        seatNumber: selectedSeat.seatNumber
      });
      if (res.data.success) {
        setSelectedSeat(null);
        fetchLibraryData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to release seat.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(newCapacity);
    if (isNaN(count) || count < 1) {
      alert('Please enter a valid seat count.');
      return;
    }

    try {
      setCapacityLoading(true);
      const res = await api.post('/library/configure-capacity', {
        libraryType,
        totalSeats: count
      });
      if (res.data.success) {
        setShowCapacityModal(false);
        fetchLibraryData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update capacity.');
    } finally {
      setCapacityLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Library Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Interactive seat maps, live assignment & custom seat controls</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Library Hall Toggle: Boys' vs Girls' */}
          <div className="flex items-center p-1 bg-slate-200/70 rounded-xl">
            <button
              onClick={() => setLibraryType('boys')}
              className={`
                px-4 py-2 rounded-lg text-xs font-bold transition-all
                ${libraryType === 'boys'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              Boys' Library
            </button>
            <button
              onClick={() => setLibraryType('girls')}
              className={`
                px-4 py-2 rounded-lg text-xs font-bold transition-all
                ${libraryType === 'girls'
                  ? 'bg-white text-pink-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              Girls' Library
            </button>
          </div>

          {/* Add Seat button */}
          <button
            onClick={() => {
              const maxSeat = seats.reduce((max, s) => Math.max(max, s.seatNumber), 0);
              setCustomSeatNumber((maxSeat + 1).toString());
              setShowAddSeatModal(true);
            }}
            className="neu-button-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Seat
          </button>

          {/* Set Capacity button */}
          <button
            onClick={() => setShowCapacityModal(true)}
            className="neu-button px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            Set Capacity
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neu-card p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Seats</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSeats}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Configured hall capacity</p>
        </div>

        <div className="neu-card p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Occupied Seats</p>
          <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stats.occupiedSeats}</h3>
          <p className="text-[10px] text-indigo-500 font-medium mt-0.5">{stats.occupancyRate}% occupancy</p>
        </div>

        <div className="neu-card p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Seats</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.availableSeats}</h3>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready for assignment</p>
        </div>

        <div className="neu-card p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blocked Seats</p>
          <h3 className="text-2xl font-bold text-slate-500 mt-1">{stats.blockedSeats}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Maintenance / Inactive</p>
        </div>
      </div>

      {/* Seat Map & Selected Seat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat Map Grid (Left 2 cols) */}
        <div className="neu-card p-6 lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500" />
              Interactive Seat Layout ({libraryType === 'boys' ? "Boys'" : "Girls'"} Hall)
            </h2>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-900" /> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-300" /> Blocked
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-600">{error}</div>
          ) : seats.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p>No seats available in this library yet.</p>
              <button
                onClick={() => {
                  setCustomSeatNumber('1');
                  setShowAddSeatModal(true);
                }}
                className="neu-button-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Seat
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5 max-h-[520px] overflow-y-auto p-2">
              {seats.map((seat) => {
                const isSelected = selectedSeat?.seatNumber === seat.seatNumber;
                let bgClass = 'bg-emerald-500 text-white hover:bg-emerald-600'; // available
                if (seat.status === 'occupied') {
                  bgClass = 'bg-slate-900 text-white hover:bg-slate-800';
                } else if (seat.status === 'blocked') {
                  bgClass = 'bg-slate-300 text-slate-500';
                }

                return (
                  <button
                    key={seat._id}
                    onClick={() => setSelectedSeat(seat)}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative group
                      ${bgClass}
                      ${isSelected ? 'ring-3 ring-blue-500 ring-offset-2 scale-105 shadow-md z-10' : 'shadow-sm hover:scale-102'}
                    `}
                  >
                    <span>#{seat.seatNumber}</span>
                    {seat.status === 'occupied' && (
                      <span className="text-[9px] font-normal opacity-80 truncate max-w-[90%] px-1">
                        {typeof seat.assignedStudent === 'object' && seat.assignedStudent?.fullName
                          ? seat.assignedStudent.fullName.split(' ')[0]
                          : 'Occ.'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Seat Inspector / Action Panel (Right 1 col) */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
              <h2 className="text-sm font-bold text-slate-800">
                Seat Details Inspector
              </h2>
              {selectedSeat && (
                <button
                  type="button"
                  onClick={handleDeleteSeat}
                  disabled={actionLoading}
                  title="Delete this seat permanently"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedSeat ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 text-center">
                  <span className="text-3xl font-extrabold text-slate-900">Seat #{selectedSeat.seatNumber}</span>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      selectedSeat.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                      selectedSeat.status === 'occupied' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {selectedSeat.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700 capitalize">
                      {selectedSeat.libraryType}
                    </span>
                  </div>
                </div>

                {selectedSeat.status === 'occupied' && selectedSeat.assignedStudent ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Assigned Student Details:</p>
                    <div className="p-4 rounded-xl bg-white border border-slate-200/70 space-y-2 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {typeof selectedSeat.assignedStudent === 'object' ? selectedSeat.assignedStudent.fullName : 'Student'}
                          </p>
                          <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                            ID: {typeof selectedSeat.assignedStudent === 'object' ? selectedSeat.assignedStudent.studentId : ''}
                          </p>
                        </div>
                        <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                          <UserCheck className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 text-slate-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{typeof selectedSeat.assignedStudent === 'object' ? selectedSeat.assignedStudent.mobileNumber : 'N/A'}</span>
                      </div>
                      {selectedSeat.assignedAt && (
                        <p className="text-[10px] text-slate-400 pt-1">
                          Allocated on: {new Date(selectedSeat.assignedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {selectedSeat.status === 'available'
                        ? 'This seat is currently empty. You can assign any registered student with an active library membership.'
                        : 'This seat is marked as blocked and cannot be allocated until unblocked.'}
                    </p>

                    {selectedSeat.status === 'available' && (
                      <button
                        type="button"
                        onClick={handleOpenAssignModal}
                        className="w-full py-2.5 neu-button-primary font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign Student to Seat #{selectedSeat.seatNumber}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Select any seat from the map to view student details, assign a student, block/unblock, or delete the seat.
              </div>
            )}
          </div>

          {/* Action Buttons for Selected Seat */}
          {selectedSeat && (
            <div className="pt-4 border-t border-slate-200/60 space-y-2">
              {selectedSeat.status === 'occupied' ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReleaseSeat}
                  className="w-full py-2.5 neu-button font-bold text-xs text-red-600 hover:text-red-700"
                >
                  {actionLoading ? 'Releasing...' : 'Release Allocated Student'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleToggleBlock}
                    className="flex-1 py-2.5 neu-button font-bold text-xs text-slate-700 hover:text-slate-900"
                  >
                    {actionLoading ? 'Updating...' : (selectedSeat.status === 'blocked' ? 'Unblock Seat' : 'Block Seat')}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleDeleteSeat}
                    className="px-3 py-2.5 neu-button font-bold text-xs text-red-600 hover:bg-red-50"
                    title="Delete Seat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assign Student Modal with Search */}
      {showAssignModal && selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="neu-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Student to Seat #{selectedSeat.seatNumber}
                  </h3>
                  <p className="text-xs text-slate-500 capitalize">
                    {libraryType} Library Hall
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student Search Bar */}
            <form onSubmit={handleSearchStudents} className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name, ID or mobile..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  fetchEligibleStudents(e.target.value);
                }}
                className="w-full neu-input pl-10 pr-4 py-2.5 text-xs font-medium"
              />
            </form>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[340px]">
              {studentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : eligibleStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No students found with active library membership.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Make sure student has library membership activated.</p>
                </div>
              ) : (
                eligibleStudents.map((st) => {
                  const isSelected = selectedStudentToAssign?._id === st._id;
                  const alreadyHasSeat = st.library?.seatNumber;

                  return (
                    <div
                      key={st._id}
                      onClick={() => setSelectedStudentToAssign(st)}
                      className={`
                        p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }
                      `}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{st.fullName}</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {st.studentId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Phone: {st.mobileNumber}</p>
                        {alreadyHasSeat && (
                          <p className="text-[10px] text-amber-600 font-medium">
                            Currently at Seat #{alreadyHasSeat} (will be moved)
                          </p>
                        )}
                      </div>

                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="selectedStudent"
                          checked={isSelected}
                          onChange={() => setSelectedStudentToAssign(st)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
              <span className="text-xs text-slate-500">
                {selectedStudentToAssign
                  ? `Selected: ${selectedStudentToAssign.fullName}`
                  : 'Please select a student'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="neu-button px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedStudentToAssign || assignLoading}
                  onClick={handleAssignSeat}
                  className="neu-button-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Seat Modal */}
      {showAddSeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="neu-card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <h3 className="text-base font-bold text-slate-900">
                Add New Seat ({libraryType === 'boys' ? "Boys'" : "Girls'"} Library)
              </h3>
              <button
                onClick={() => setShowAddSeatModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSeat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seat Number
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 51"
                  value={customSeatNumber}
                  onChange={(e) => setCustomSeatNumber(e.target.value)}
                  className="w-full neu-input px-3.5 py-2 text-sm font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique number for this hall. Available immediately once created.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSeatModal(false)}
                  className="neu-button px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSeatLoading}
                  className="neu-button-primary px-5 py-2 text-xs font-bold"
                >
                  {addSeatLoading ? 'Adding...' : 'Add Seat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Capacity Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="neu-card w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Configure {libraryType === 'boys' ? "Boys'" : "Girls'"} Library Capacity
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Adjust total seat count. Existing allocations will be maintained.
            </p>
            <form onSubmit={handleUpdateCapacity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Seats Count</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full neu-input px-3.5 py-2 text-sm font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapacityModal(false)}
                  className="neu-button px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={capacityLoading}
                  className="neu-button-primary px-5 py-2 text-xs font-bold"
                >
                  {capacityLoading ? 'Saving...' : 'Update Capacity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
