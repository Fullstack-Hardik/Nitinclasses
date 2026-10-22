export interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  fatherName?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  address?: string;
  studentJoiningDate: string;
  membershipType: 'coaching_only' | 'library_only' | 'coaching_and_library';
  coaching?: {
    hasMembership: boolean;
    monthlyFee: number;
    joiningDate?: string;
    status: 'active' | 'inactive' | 'paused';
  };
  library?: {
    hasMembership: boolean;
    libraryType: 'boys' | 'girls';
    monthlyFee: number;
    joiningDate?: string;
    status: 'active' | 'inactive' | 'paused';
    seatNumber?: number | null;
  };
  totalOutstanding?: number;
  advanceFeeBalance?: number;
  isArchived?: boolean;
  createdAt?: string;
}

export interface FeeDue {
  _id: string;
  student: Student;
  serviceType: 'coaching' | 'library';
  billingPeriod: string;
  periodStartDate: string;
  periodEndDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'upcoming' | 'due' | 'overdue' | 'partially_paid' | 'paid';
}

export interface Payment {
  _id: string;
  receiptNumber: string;
  student: string | Student;
  feeDue: string;
  serviceType: 'coaching' | 'library';
  billingPeriod: string;
  originalFeeAmount: number;
  previousPaidAmount: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: 'cash' | 'upi';
  upiTransactionRef?: string;
  notes?: string;
  paymentDate: string;
}

export interface Seat {
  _id: string;
  libraryType: 'boys' | 'girls';
  seatNumber: number;
  status: 'available' | 'occupied' | 'blocked';
  assignedStudent?: Student | null;
  assignedAt?: string | null;
  notes?: string;
}

export interface DashboardStats {
  summary: {
    totalStudents: number;
    coachingStudents: number;
    libraryStudents: number;
    totalFeesCollectedToday: number;
    totalFeesCollectedThisMonth: number;
    totalOutstandingFees: number;
    coachingOutstandingFees?: number;
    libraryOutstandingFees?: number;
    overdueFees: number;
    coachingOverdueFees?: number;
    libraryOverdueFees?: number;
    boysLibraryOccupancy: {
      occupied: number;
      total: number;
      percentage: number;
    };
    girlsLibraryOccupancy: {
      occupied: number;
      total: number;
      percentage: number;
    };
  };
  duesBreakdown?: {
    coachingOutstanding: number;
    libraryOutstanding: number;
    totalOutstanding: number;
    coachingOverdue: number;
    libraryOverdue: number;
    totalOverdue: number;
    weekly?: {
      today: { total: number; coaching: number; library: number; count: number };
      thisWeek: { total: number; coaching: number; library: number; count: number };
      overdueTotal: { total: number; coaching: number; library: number };
    };
    monthlyTimeline?: Array<{
      year: number;
      month: number;
      coachingDue: number;
      libraryDue: number;
      coachingOverdue: number;
      libraryOverdue: number;
      totalDue: number;
      totalOverdue: number;
    }>;
  };
  breakdown: {
    coachingCollection: number;
    libraryCollection: number;
    totalCollections: number;
  };
  dueThisWeek?: FeeDue[];
  dueToday?: FeeDue[];
  upcoming?: FeeDue[];
  topOverdue?: FeeDue[];
  monthlyTrend: Array<{
    _id: { year: number; month: number };
    total: number;
    coaching?: number;
    library?: number;
  }>;
}

export interface SettingsData {
  instituteName: string;
  contactNumber: string;
  email: string;
  address: string;
  receiptPrefix: string;
  receiptFooterNote: string;
  boysLibraryTotalSeats: number;
  girlsLibraryTotalSeats: number;
  smartModeEnabled?: boolean;
}
