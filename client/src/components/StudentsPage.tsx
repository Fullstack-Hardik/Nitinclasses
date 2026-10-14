import React, { useEffect, useState } from 'react';
import { 
  Search, 
  UserPlus, 
  GraduationCap, 
  BookOpen, 
  Eye, 
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react';
import api from '../services/api';
import { Student } from '../types';
import { AddStudentModal } from './AddStudentModal';
import { StudentProfileModal } from './StudentProfileModal';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (membershipFilter !== 'all') params.membershipType = membershipFilter;

      const res = await api.get('/students', { params });
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load students list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [membershipFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage admissions, memberships, and records</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={async () => {
              try {
                const response = await api.get('/settings/export/students', {
                  responseType: 'blob'
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Students_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              } catch (err: any) {
                alert('Export failed: ' + (err.message || 'Error occurred'));
              }
            }}
            className="neu-button px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:text-slate-900"
            title="Export full student records to Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export to Excel
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="neu-button-primary px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Enroll New Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, ID or mobile..."
            className="w-full neu-input py-2.5 pl-10 pr-4 text-xs font-medium"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter:</span>
          <select
            value={membershipFilter}
            onChange={(e) => setMembershipFilter(e.target.value)}
            className="neu-input px-3 py-2 text-xs font-medium w-full sm:w-auto"
          >
            <option value="all">All Memberships</option>
            <option value="coaching_only">Coaching Only</option>
            <option value="library_only">Library Only</option>
            <option value="coaching_and_library">Coaching + Library</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
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
        ) : students.length === 0 ? (
          <div className="p-16 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Students Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No student records match your filter. Click "Enroll New Student" to register a new member.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-200/50 text-slate-700 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 font-bold">Student ID</th>
                  <th className="py-3 px-4 font-bold">Full Name</th>
                  <th className="py-3 px-4 font-bold">Mobile</th>
                  <th className="py-3 px-4 font-bold">Membership</th>
                  <th className="py-3 px-4 font-bold">Seat Info</th>
                  <th className="py-3 px-4 font-bold">Outstanding</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-medium">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-100/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{student.studentId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{student.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Joined: {new Date(student.studentJoiningDate).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{student.mobileNumber}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {student.coaching?.hasMembership && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                            Coaching (₹{student.coaching.monthlyFee})
                          </span>
                        )}
                        {student.library?.hasMembership && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold">
                            Library (₹{student.library.monthlyFee})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {student.library?.hasMembership ? (
                        student.library.seatNumber ? (
                          <span className="font-bold text-slate-800">Seat #{student.library.seatNumber} ({student.library.libraryType})</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">Unallocated</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {(student.totalOutstanding || 0) > 0 ? (
                        <span className="font-bold text-amber-600">₹{student.totalOutstanding?.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="font-bold text-emerald-600">All Clear</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudentId(student._id)}
                        className="neu-button px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => fetchStudents()}
      />

      {/* Student Profile Modal */}
      <StudentProfileModal
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onDeleted={() => {
          setSelectedStudentId(null);
          fetchStudents();
        }}
        onRefreshList={() => fetchStudents()}
      />
    </div>
  );
};
