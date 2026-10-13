import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Ban, 
  Sliders, 
  AlertCircle,
  Building,
  UserCheck
} from 'lucide-react';
import api from '../services/api';
import { Seat } from '../types';

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
          <p className="text-sm text-slate-500 mt-0.5">Interactive seat maps and capacity allocation</p>
        </div>

        <div className="flex items-center gap-3">
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
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5 max-h-[500px] overflow-y-auto p-2">
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
                      aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all
                      ${bgClass}
                      ${isSelected ? 'ring-3 ring-blue-500 ring-offset-2 scale-105 shadow-md' : 'shadow-sm'}
                    `}
                  >
                    <span>#{seat.seatNumber}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Seat Inspector / Action Panel (Right 1 col) */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200/60 mb-4">
              Seat Details Inspector
            </h2>

            {selectedSeat ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60 text-center">
                  <span className="text-3xl font-extrabold text-slate-900">Seat #{selectedSeat.seatNumber}</span>
                  <div className="mt-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      selectedSeat.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                      selectedSeat.status === 'occupied' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {selectedSeat.status}
                    </span>
                  </div>
                </div>

                {selectedSeat.status === 'occupied' && selectedSeat.assignedStudent ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-400 font-medium">Assigned Student Details:</p>
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/60 space-y-1">
                      <p className="font-bold text-slate-900 text-sm">
                        {typeof selectedSeat.assignedStudent === 'object' ? selectedSeat.assignedStudent.fullName : 'Student'}
                      </p>
                      <p className="text-slate-500">
                        ID: {typeof selectedSeat.assignedStudent === 'object' ? selectedSeat.assignedStudent.studentId : ''}
                      </p>
                      <p className="text-slate-500">
                        Mobile: {typeof selectedSeat.assignedStudent === 'object' ? selectedSeat.assignedStudent.mobileNumber : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {selectedSeat.status === 'available'
                      ? 'This seat is currently unassigned. Students with active library memberships can be allocated this seat.'
                      : 'This seat is marked as blocked and cannot be allocated until unblocked.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Select any seat from the map to view allocation details, block/unblock, or release.
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
                  {actionLoading ? 'Releasing...' : 'Release Allocated Seat'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleToggleBlock}
                  className="w-full py-2.5 neu-button font-bold text-xs text-slate-700 hover:text-slate-900"
                >
                  {actionLoading ? 'Updating...' : (selectedSeat.status === 'blocked' ? 'Unblock Seat' : 'Block Seat')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Configure Capacity Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
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
