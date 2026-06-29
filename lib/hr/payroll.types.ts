export interface PayrollRecord {
  id: string;
  employeeId: number;
  employeeCode: string;
  name: string;
  role: string;
  basicSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  month: string; // Format: "June 2026"
  status: 'Pending' | 'Paid';
  createdAt: string;
}
