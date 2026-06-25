export interface EmployeeAttendance {
  id: string;
  name: string;
  department: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Absent' | 'Late';
  avatar?: string;
}

export interface LeaveRequest {
  id: string;
  name: string;
  role: string;
  leaveType: string;
  dateRange: string;
  days: number;
  avatar?: string;
}

export interface InterviewSchedule {
  id: string;
  candidateName: string;
  role: string;
  dateTime: string;
}

export interface RecruitmentStage {
  stage: string;
  count: number;
  color: string;
}

export interface PayrollRecord {
  id: string;
  month: string;
  totalEmployees: number;
  processed: number;
  pending: number;
  totalAmount: string;
  status: 'Processed' | 'In Progress' | 'Pending';
}

export const MOCK_ATTENDANCE: EmployeeAttendance[] = [
  { id: '1', name: 'Jaseem', department: 'Management', checkIn: '09:05 AM', checkOut: '-', status: 'Present' },
  { id: '2', name: 'Michal', department: 'Development', checkIn: '09:10 AM', checkOut: '-', status: 'Present' },
  { id: '3', name: 'Dimah', department: 'Development', checkIn: '08:57 AM', checkOut: '-', status: 'Present' },
  { id: '4', name: 'Radha', department: 'Design', checkIn: '09:18 AM', checkOut: '-', status: 'Late' },
  { id: '5', name: 'Sinan', department: 'Development', checkIn: '-', checkOut: '-', status: 'Absent' },
  { id: '6', name: 'Hiba', department: 'HR', checkIn: '09:02 AM', checkOut: '-', status: 'Present' },
  { id: '7', name: 'Nivad', department: 'Development', checkIn: '09:25 AM', checkOut: '-', status: 'Late' },
  { id: '8', name: 'Salman', department: 'Development', checkIn: '-', checkOut: '-', status: 'Absent' },
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: '1', name: 'Radha', role: 'UI/UX Designer', leaveType: 'Casual Leave', dateRange: '24 Jun - 26 Jun 2026', days: 3 },
  { id: '2', name: 'Mishaj', role: 'Frontend Developer', leaveType: 'Sick Leave', dateRange: '25 Jun 2026', days: 1 },
  { id: '3', name: 'Sinan', role: 'Software Engineer', leaveType: 'Casual Leave', dateRange: '29 Jun - 02 Jul 2026', days: 4 },
  { id: '4', name: 'Hiba', role: 'HR Generalist', leaveType: 'Casual Leave', dateRange: '03 Jul 2026', days: 1 },
];

export const MOCK_INTERVIEWS: InterviewSchedule[] = [
  { id: '1', candidateName: 'Arjun Nair', role: 'Frontend Developer', dateTime: '23 Jun 2026 11:00 AM' },
  { id: '2', candidateName: 'Rushana P', role: 'HR Executive', dateTime: '23 Jun 2026 2:00 PM' },
  { id: '3', candidateName: 'Vishnu R', role: 'Backend Developer', dateTime: '24 Jun 2026 10:30 AM' },
];

export const MOCK_RECRUITMENT_PIPELINE: RecruitmentStage[] = [
  { stage: 'Application', count: 23, color: 'bg-blue-500' },
  { stage: 'Screening', count: 14, color: 'bg-amber-500' },
  { stage: 'Interview', count: 11, color: 'bg-purple-500' },
  { stage: 'Offer', count: 5, color: 'bg-emerald-500' },
  { stage: 'Hired', count: 3, color: 'bg-indigo-500' },
];

export const MOCK_PAYROLL: PayrollRecord[] = [
  { id: '1', month: 'June 2026', totalEmployees: 48, processed: 36, pending: 12, totalAmount: '₹8,45,000', status: 'In Progress' }
];

export const MOCK_ATTENDANCE_SUMMARY = [
  { name: 'Present', value: 35, percentage: '72.9%', color: '#10b981' },
  { name: 'Absent', value: 6, percentage: '12.5%', color: '#ef4444' },
  { name: 'Late', value: 4, percentage: '8.3%', color: '#f97316' },
  { name: 'On Leave', value: 3, percentage: '6.3%', color: '#3b82f6' },
];
