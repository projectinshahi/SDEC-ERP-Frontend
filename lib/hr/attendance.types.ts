// ─────────────────────────────────────────────────────────────────────────────
// HR Attendance Module — Type Definitions
// Business Flow: Morning In → Lunch Out → Lunch In → Check Out
// ─────────────────────────────────────────────────────────────────────────────

export type AttendanceStageStatus =
  | 'Completed'   // punch-in recorded
  | 'Pending'     // not yet reached this stage
  | 'Missed';     // stage time passed without punch

export interface AttendanceStage {
  label: 'Morning In' | 'Lunch Out' | 'Lunch In' | 'Check Out';
  time: string | null;       // "09:05 AM" or null if not punched
  status: AttendanceStageStatus;
}

// ─── Primary record ───────────────────────────────────────────────────────────

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';

export interface AttendanceRecord {
  id: string;
  employeeId: string;         // EMP-2026-XXX
  name: string;
  department: string;
  role: string;
  date: string;               // ISO date: "2026-06-24"
  morningIn: string | null;   // "09:05 AM" | null
  lunchOut: string | null;    // "01:03 PM" | null
  lunchIn: string | null;     // "02:00 PM" | null
  checkOut: string | null;    // "06:15 PM" | null
  totalHours: string | null;  // "8h 32m" | null
  status: AttendanceStatus;
  overtime: string | null;    // "0h 30m" | null
  note?: string;              // optional HR note
}

// ─── Summary / stats ─────────────────────────────────────────────────────────

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateArrivals: number;
  onLeave: number;
  averageHours: string;
}

// ─── Filter state ─────────────────────────────────────────────────────────────

export type AttendanceSortKey = 'name' | 'department' | 'morningIn' | 'totalHours' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface AttendanceFilters {
  search: string;
  department: string;
  status: string;
  date: string;
}

// ─── Derived stage display ────────────────────────────────────────────────────

export interface PunchStageDisplay {
  label: string;
  time: string | null;
  icon: string;              // icon name hint for rendering
  color: string;             // tailwind color token
}
