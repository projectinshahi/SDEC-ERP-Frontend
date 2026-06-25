import { LeaveRequest, LeaveBalance, LeaveStats } from './leave.types';

export const TODAY = '2026-06-24';

export const LEAVE_DEPARTMENTS = ['All', 'Management', 'Development', 'Design', 'HR', 'Sales'];
export const LEAVE_TYPES = ['All', 'Casual Leave', 'Sick Leave', 'Paid Leave', 'Emergency Leave'];
export const LEAVE_STATUSES = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

export const MOCK_EMPLOYEES = [
  { id: 'EMP-2026-001', name: 'Jaseem K M', department: 'Management', role: 'Managing Director' },
  { id: 'EMP-2026-002', name: 'Michal Davis', department: 'Development', role: 'Lead Architect' },
  { id: 'EMP-2026-003', name: 'Dimah Al-Sabah', department: 'Development', role: 'Frontend Engineer' },
  { id: 'EMP-2026-004', name: 'Radha Sharma', department: 'Design', role: 'UI/UX Designer' },
  { id: 'EMP-2026-005', name: 'Sinan Tariq', department: 'Development', role: 'Software Engineer' },
  { id: 'EMP-2026-006', name: 'Hiba Fathima', department: 'HR', role: 'HR Generalist' },
  { id: 'EMP-2026-007', name: 'Nivad Chandran', department: 'Development', role: 'Fullstack Dev' },
  { id: 'EMP-2026-008', name: 'Salman Faris', department: 'Development', role: 'Backend Engineer' },
  { id: 'EMP-2026-009', name: 'Ananya Nair', department: 'HR', role: 'Recruiting Lead' },
  { id: 'EMP-2026-010', name: 'Rahul Varma', department: 'Sales', role: 'Sales Executive' },
  { id: 'EMP-2026-011', name: 'Sneha Patel', department: 'Design', role: 'Product Designer' },
  { id: 'EMP-2026-012', name: 'Aswin Kumar', department: 'Sales', role: 'BDE Manager' },
  { id: 'EMP-2026-013', name: 'Emily Watson', department: 'Management', role: 'Operations Chief' },
  { id: 'EMP-2026-014', name: 'Karthik Raja', department: 'Development', role: 'DevOps Specialist' },
  { id: 'EMP-2026-015', name: 'Maria Joseph', department: 'Sales', role: 'Account Manager' },
];

export const MOCK_LEAVE_RECORDS: LeaveRequest[] = [
  {
    id: 'LV-2026-001',
    employeeId: 'EMP-2026-004',
    employeeName: 'Radha Sharma',
    department: 'Design',
    leaveType: 'Casual Leave',
    startDate: '2026-06-24',
    endDate: '2026-06-26',
    days: 3,
    reason: 'Family function in hometown',
    status: 'Approved',
    appliedDate: '2026-06-20',
    approvedBy: 'Hiba Fathima',
    approvedDate: '2026-06-21',
  },
  {
    id: 'LV-2026-002',
    employeeId: 'EMP-2026-003',
    employeeName: 'Dimah Al-Sabah',
    department: 'Development',
    leaveType: 'Sick Leave',
    startDate: '2026-06-24',
    endDate: '2026-06-24',
    days: 1,
    reason: 'Severe dental issues and dental clinic visit',
    status: 'Approved',
    appliedDate: '2026-06-23',
    approvedBy: 'Hiba Fathima',
    approvedDate: '2026-06-23',
  },
  {
    id: 'LV-2026-003',
    employeeId: 'EMP-2026-005',
    employeeName: 'Sinan Tariq',
    department: 'Development',
    leaveType: 'Casual Leave',
    startDate: '2026-06-29',
    endDate: '2026-07-02',
    days: 4,
    reason: 'Moving to a new apartment, need time for packing and shifting',
    status: 'Pending',
    appliedDate: '2026-06-22',
  },
  {
    id: 'LV-2026-004',
    employeeId: 'EMP-2026-006',
    employeeName: 'Hiba Fathima',
    department: 'HR',
    leaveType: 'Casual Leave',
    startDate: '2026-07-03',
    endDate: '2026-07-03',
    days: 1,
    reason: 'Personal administrative work',
    status: 'Pending',
    appliedDate: '2026-06-24',
  },
  {
    id: 'LV-2026-005',
    employeeId: 'EMP-2026-007',
    employeeName: 'Nivad Chandran',
    department: 'Development',
    leaveType: 'Paid Leave',
    startDate: '2026-06-25',
    endDate: '2026-06-26',
    days: 2,
    reason: 'Attending a technical conference in Bangalore',
    status: 'Pending',
    appliedDate: '2026-06-22',
    isUrgent: true, // Urgent flag for panel
  },
  {
    id: 'LV-2026-006',
    employeeId: 'EMP-2026-002',
    employeeName: 'Michal Davis',
    department: 'Development',
    leaveType: 'Emergency Leave',
    startDate: '2026-06-24',
    endDate: '2026-06-25',
    days: 2,
    reason: 'Family medical emergency',
    status: 'Approved',
    appliedDate: '2026-06-24',
    approvedBy: 'Jaseem K M',
    approvedDate: '2026-06-24',
  },
  {
    id: 'LV-2026-007',
    employeeId: 'EMP-2026-010',
    employeeName: 'Rahul Varma',
    department: 'Sales',
    leaveType: 'Paid Leave',
    startDate: '2026-06-15',
    endDate: '2026-06-19',
    days: 5,
    reason: 'Annual family vacation',
    status: 'Approved',
    appliedDate: '2026-06-05',
    approvedBy: 'Hiba Fathima',
    approvedDate: '2026-06-08',
  },
  {
    id: 'LV-2026-008',
    employeeId: 'EMP-2026-011',
    employeeName: 'Sneha Patel',
    department: 'Design',
    leaveType: 'Sick Leave',
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    days: 3,
    reason: 'High fever and viral flu',
    status: 'Approved',
    appliedDate: '2026-06-09',
    approvedBy: 'Hiba Fathima',
    approvedDate: '2026-06-09',
  },
  {
    id: 'LV-2026-009',
    employeeId: 'EMP-2026-012',
    employeeName: 'Aswin Kumar',
    department: 'Sales',
    leaveType: 'Casual Leave',
    startDate: '2026-07-06',
    endDate: '2026-07-07',
    days: 2,
    reason: 'Sister marriage ceremony',
    status: 'Pending',
    appliedDate: '2026-06-23',
  },
  {
    id: 'LV-2026-010',
    employeeId: 'EMP-2026-014',
    employeeName: 'Karthik Raja',
    department: 'Development',
    leaveType: 'Paid Leave',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    days: 5,
    reason: 'Personal chores and travel',
    status: 'Rejected',
    appliedDate: '2026-05-20',
    approvedBy: 'Jaseem K M',
    approvedDate: '2026-05-22',
    rejectReason: 'Client deliverable scheduled during the same week. Please reschedule.',
  },
  {
    id: 'LV-2026-011',
    employeeId: 'EMP-2026-015',
    employeeName: 'Maria Joseph',
    department: 'Sales',
    leaveType: 'Casual Leave',
    startDate: '2026-06-18',
    endDate: '2026-06-18',
    days: 1,
    reason: 'Banking work and driver license renewal',
    status: 'Cancelled',
    appliedDate: '2026-06-16',
  },
  {
    id: 'LV-2026-012',
    employeeId: 'EMP-2026-008',
    employeeName: 'Salman Faris',
    department: 'Development',
    leaveType: 'Sick Leave',
    startDate: '2026-06-25',
    endDate: '2026-06-25',
    days: 1,
    reason: 'Severe food poisoning',
    status: 'Pending',
    appliedDate: '2026-06-24',
    isUrgent: true,
  }
];

export const DEFAULT_BALANCES: Record<string, LeaveBalance[]> = {
  // Radha Sharma
  'EMP-2026-004': [
    { leaveType: 'Casual Leave', allocated: 12, used: 3, pending: 0, remaining: 9 },
    { leaveType: 'Sick Leave', allocated: 8, used: 2, pending: 0, remaining: 6 },
    { leaveType: 'Paid Leave', allocated: 15, used: 0, pending: 0, remaining: 15 },
    { leaveType: 'Emergency Leave', allocated: 5, used: 0, pending: 0, remaining: 5 },
  ],
  // Dimah Al-Sabah
  'EMP-2026-003': [
    { leaveType: 'Casual Leave', allocated: 12, used: 4, pending: 0, remaining: 8 },
    { leaveType: 'Sick Leave', allocated: 8, used: 1, pending: 0, remaining: 7 },
    { leaveType: 'Paid Leave', allocated: 15, used: 5, pending: 0, remaining: 10 },
    { leaveType: 'Emergency Leave', allocated: 5, used: 0, pending: 0, remaining: 5 },
  ],
  // Sinan Tariq
  'EMP-2026-005': [
    { leaveType: 'Casual Leave', allocated: 12, used: 2, pending: 4, remaining: 6 },
    { leaveType: 'Sick Leave', allocated: 8, used: 0, pending: 0, remaining: 8 },
    { leaveType: 'Paid Leave', allocated: 15, used: 0, pending: 0, remaining: 15 },
    { leaveType: 'Emergency Leave', allocated: 5, used: 0, pending: 0, remaining: 5 },
  ],
};

// Generates a standard set of leave balances for any employee ID
export function getEmployeeBalances(employeeId: string): LeaveBalance[] {
  if (DEFAULT_BALANCES[employeeId]) {
    return DEFAULT_BALANCES[employeeId];
  }
  // Default fallback for any other employee
  return [
    { leaveType: 'Casual Leave', allocated: 12, used: 2, pending: 0, remaining: 10 },
    { leaveType: 'Sick Leave', allocated: 8, used: 1, pending: 0, remaining: 7 },
    { leaveType: 'Paid Leave', allocated: 15, used: 3, pending: 0, remaining: 12 },
    { leaveType: 'Emergency Leave', allocated: 5, used: 0, pending: 0, remaining: 5 },
  ];
}

// Compute Leave Stats from request list
export function computeLeaveStats(records: LeaveRequest[], selectedDate: string = TODAY): LeaveStats {
  const totalRequests = records.length;
  const pendingRequests = records.filter(r => r.status === 'Pending').length;
  const approvedRequests = records.filter(r => r.status === 'Approved').length;
  const rejectedRequests = records.filter(r => r.status === 'Rejected').length;

  // Employees On Leave Today: Status is Approved, and selectedDate is between startDate and endDate
  const employeesOnLeaveToday = records.filter(r => {
    if (r.status !== 'Approved') return false;
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const current = new Date(selectedDate);
    return current >= start && current <= end;
  }).length;

  // Approval Rate = Approved / (Approved + Rejected) * 100
  const completedDecisions = approvedRequests + rejectedRequests;
  const approvalRate = completedDecisions > 0 
    ? Math.round((approvedRequests / completedDecisions) * 100 * 10) / 10 
    : 100; // default to 100 if no decisions made yet

  return {
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    employeesOnLeaveToday,
    approvalRate,
  };
}
