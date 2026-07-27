import { AttendanceRecord, AttendanceStats } from './attendance.types';
import { hasWorkingHalfPunch, isMorningLateArrival } from './attendanceStatus';

// Today's date string (used as the default date for the page)
export const TODAY = new Date().toISOString().split('T')[0]; // "2026-06-24"

// ─── Mock Records ─────────────────────────────────────────────────────────────

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-001',
    employeeId: 'EMP-2026-001',
    name: 'Jaseem K M',
    department: 'Management',
    role: 'Managing Director',
    date: TODAY,
    morningIn: '08:55 AM',
    lunchOut: '01:05 PM',
    lunchIn: '02:00 PM',
    checkOut: '06:10 PM',
    totalHours: '9h 10m',
    status: 'Present',
    overtime: '1h 10m',
  },
  {
    id: 'att-002',
    employeeId: 'EMP-2026-002',
    name: 'Michal Davis',
    department: 'Development',
    role: 'Lead Architect',
    date: TODAY,
    morningIn: '09:02 AM',
    lunchOut: '01:00 PM',
    lunchIn: '02:05 PM',
    checkOut: '06:05 PM',
    totalHours: '8h 58m',
    status: 'Present',
    overtime: null,
  },
  {
    id: 'att-003',
    employeeId: 'EMP-2026-003',
    name: 'Dimah Al-Sabah',
    department: 'Development',
    role: 'Frontend Engineer',
    date: TODAY,
    morningIn: '09:00 AM',
    lunchOut: '01:15 PM',
    lunchIn: '02:10 PM',
    checkOut: null,
    totalHours: null,
    status: 'Present',
    overtime: null,
    note: 'Check-out pending',
  },
  {
    id: 'att-004',
    employeeId: 'EMP-2026-004',
    name: 'Radha Sharma',
    department: 'Design',
    role: 'UI/UX Designer',
    date: TODAY,
    morningIn: null,
    lunchOut: null,
    lunchIn: null,
    checkOut: null,
    totalHours: null,
    status: 'On Leave',
    overtime: null,
    note: 'Approved casual leave',
  },
  {
    id: 'att-005',
    employeeId: 'EMP-2026-005',
    name: 'Sinan Tariq',
    department: 'Development',
    role: 'Software Engineer',
    date: TODAY,
    morningIn: null,
    lunchOut: null,
    lunchIn: null,
    checkOut: null,
    totalHours: null,
    status: 'Absent',
    overtime: null,
    note: 'No prior notification',
  },
  {
    id: 'att-006',
    employeeId: 'EMP-2026-006',
    name: 'Hiba Fathima',
    department: 'HR',
    role: 'HR Generalist',
    date: TODAY,
    morningIn: '09:04 AM',
    lunchOut: '01:02 PM',
    lunchIn: '01:58 PM',
    checkOut: '06:00 PM',
    totalHours: '8h 56m',
    status: 'Present',
    overtime: null,
  },
  {
    id: 'att-007',
    employeeId: 'EMP-2026-007',
    name: 'Nivad Chandran',
    department: 'Development',
    role: 'Fullstack Developer',
    date: TODAY,
    morningIn: '09:28 AM',
    lunchOut: '01:00 PM',
    lunchIn: '01:55 PM',
    checkOut: null,
    totalHours: null,
    status: 'Late',
    overtime: null,
    note: 'Arrived 28 min late',
  },
  {
    id: 'att-008',
    employeeId: 'EMP-2026-008',
    name: 'Salman Faris',
    department: 'Development',
    role: 'Backend Engineer',
    date: TODAY,
    morningIn: null,
    lunchOut: null,
    lunchIn: null,
    checkOut: null,
    totalHours: null,
    status: 'Absent',
    overtime: null,
  },
  {
    id: 'att-009',
    employeeId: 'EMP-2026-009',
    name: 'Ananya Nair',
    department: 'HR',
    role: 'Recruiting Lead',
    date: TODAY,
    morningIn: '09:10 AM',
    lunchOut: '01:20 PM',
    lunchIn: '02:15 PM',
    checkOut: '03:05 PM',
    totalHours: '4h 40m',
    status: 'Half Day',
    overtime: null,
    note: 'Left early — personal reasons',
  },
  {
    id: 'att-010',
    employeeId: 'EMP-2026-010',
    name: 'Rahul Varma',
    department: 'Sales',
    role: 'Sales Executive',
    date: TODAY,
    morningIn: '08:50 AM',
    lunchOut: '01:00 PM',
    lunchIn: '02:00 PM',
    checkOut: '07:00 PM',
    totalHours: '10h 10m',
    status: 'Present',
    overtime: '2h 10m',
  },
  {
    id: 'att-011',
    employeeId: 'EMP-2026-011',
    name: 'Sneha Patel',
    department: 'Design',
    role: 'Product Designer',
    date: TODAY,
    morningIn: '09:15 AM',
    lunchOut: '01:05 PM',
    lunchIn: '02:00 PM',
    checkOut: '06:10 PM',
    totalHours: '8h 50m',
    status: 'Present',
    overtime: null,
  },
  {
    id: 'att-012',
    employeeId: 'EMP-2026-012',
    name: 'Aswin Kumar',
    department: 'Sales',
    role: 'BDE Manager',
    date: TODAY,
    morningIn: null,
    lunchOut: null,
    lunchIn: null,
    checkOut: null,
    totalHours: null,
    status: 'On Leave',
    overtime: null,
    note: 'Sick leave approved',
  },
  {
    id: 'att-013',
    employeeId: 'EMP-2026-013',
    name: 'Emily Watson',
    department: 'Management',
    role: 'Operations Chief',
    date: TODAY,
    morningIn: '08:45 AM',
    lunchOut: '12:55 PM',
    lunchIn: '01:55 PM',
    checkOut: '06:30 PM',
    totalHours: '9h 45m',
    status: 'Present',
    overtime: '1h 45m',
  },
  {
    id: 'att-014',
    employeeId: 'EMP-2026-014',
    name: 'Karthik Raja',
    department: 'Development',
    role: 'DevOps Specialist',
    date: TODAY,
    morningIn: '09:35 AM',
    lunchOut: '01:00 PM',
    lunchIn: '02:00 PM',
    checkOut: null,
    totalHours: null,
    status: 'Late',
    overtime: null,
    note: 'Arrived 35 min late',
  },
  {
    id: 'att-015',
    employeeId: 'EMP-2026-015',
    name: 'Maria Joseph',
    department: 'Sales',
    role: 'Account Manager',
    date: TODAY,
    morningIn: '09:05 AM',
    lunchOut: null,
    lunchIn: null,
    checkOut: null,
    totalHours: null,
    status: 'Present',
    overtime: null,
    note: 'Working through lunch',
  },
  {
    id: 'att-016',
    employeeId: 'EMP-2026-016',
    name: 'Krishnapriya M',
    department: 'HR',
    role: 'Payroll Analyst',
    date: TODAY,
    morningIn: '09:00 AM',
    lunchOut: '01:10 PM',
    lunchIn: '02:05 PM',
    checkOut: '06:00 PM',
    totalHours: '8h 45m',
    status: 'Present',
    overtime: null,
  },
  {
    id: 'att-017',
    employeeId: 'EMP-2026-017',
    name: 'Arun Menon',
    department: 'Sales',
    role: 'Pre-Sales Consultant',
    date: TODAY,
    morningIn: '09:22 AM',
    lunchOut: '01:00 PM',
    lunchIn: '01:58 PM',
    checkOut: '06:05 PM',
    totalHours: '8h 21m',
    status: 'Late',
    overtime: null,
    note: 'Traffic delay',
  },
  {
    id: 'att-018',
    employeeId: 'EMP-2026-018',
    name: 'Fathima Rizwan',
    department: 'Management',
    role: 'Executive Assistant',
    date: TODAY,
    morningIn: '09:01 AM',
    lunchOut: '01:00 PM',
    lunchIn: '02:00 PM',
    checkOut: '06:00 PM',
    totalHours: '9h 00m',
    status: 'Present',
    overtime: null,
  },
];

// ─── Derived Stats ────────────────────────────────────────────────────────────

export function computeAttendanceStats(
  records: AttendanceRecord[],
  totalEmployees: number,
  selectedDate: string
): AttendanceStats {
  const todayRecords = records.filter(r => r.date === selectedDate);

  // Leave-aware, OVERLAPPING dimensions (cards intentionally do not sum to Total):
  //  • On Leave  = any approved leave (full or half day)
  //  • Present   = worked a normal day OR worked the working-half of a half-day leave
  //  • Absent    = neither on leave nor present (fully absent)
  //  • Late      = morning arrival after 10:00 AM (full-day/first-half leave excluded)
  const LEAVE_STATUSES = new Set(['Full Day Leave', 'Half Day Leave', 'On Leave', 'Half Day']);
  const PRESENT_WORKING = new Set(['Present', 'Late', 'Late After Lunch']);
  const HALF_LEAVE_STATUSES = new Set(['Half Day Leave', 'Half Day']);

  let present = 0;
  let onLeave = 0;
  let absent = 0;
  let late = 0;
  for (const r of todayRecords) {
    const isLeave = LEAVE_STATUSES.has(r.status);
    const isPresentWorking = PRESENT_WORKING.has(r.status);
    const isHalfLeaveWorked = HALF_LEAVE_STATUSES.has(r.status) && hasWorkingHalfPunch(r);
    if (isLeave) onLeave++;
    if (isPresentWorking || isHalfLeaveWorked) present++;
    if (!isLeave && !isPresentWorking) absent++;
    if (isMorningLateArrival(r)) late++;
  }

  // Compute average hours from records that have totalHours on selectedDate
  const hours = todayRecords
    .filter(r => r.totalHours)
    .map(r => {
      const match = r.totalHours!.match(/(\d+)h\s*(\d+)m/);
      if (!match) return 0;
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    });
  const avgMinutes = hours.length > 0 ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : 0;
  const avgHours = `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`;

  return {
    totalEmployees,
    presentToday: present,
    absentToday: absent,
    lateArrivals: late,
    onLeave,
    averageHours: avgHours,
  };
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

export const ATTENDANCE_DEPARTMENTS = [
  'All',
  'Development',
  'Design',
  'HR',
  'Management',
  'Sales',
];

export const ATTENDANCE_STATUSES = [
  'All',
  'Present',
  'Absent',
  'Late',
  'Late After Lunch',
  'Full Day Leave',
  'Half Day Leave',
];
