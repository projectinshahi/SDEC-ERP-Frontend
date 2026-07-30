import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import { PayrollRecord } from './payroll.types';
import { amount, round2, dayFmt } from './payrollFormat';

/**
 * Generate a formal computer-generated PDF Payslip with the full snapshot
 * breakdown. Legacy records (no attendance snapshot) fall back to the simple view.
 */
export function generatePayslipPdf(record: PayrollRecord) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isLegacy = record.officeWorkingDays <= 0;

  // Header block
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Shahi Solutions Pvt Ltd', 15, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('HR & Payroll Department — Employee Payslip', 15, 24);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 150, 16);

  // Profile
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE PROFILE & STATEMENT', 15, 50);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 53, 195, 53);

  const profile: [string, string][] = [
    ['Employee Code:', record.employeeCode],
    ['Employee Name:', record.name],
    ['Designation:', record.role],
    ['Salary Month:', record.month],
    ['Payment Status:', record.status],
  ];
  doc.setFontSize(9.5);
  let y = 61;
  profile.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(k, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(v), 52, y);
    y += 7;
  });

  // Line renderer for the computation section
  const section = (title: string) => {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 55);
    doc.text(title, 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
  };
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(bold ? 31 : 55, bold ? 41 : 65, bold ? 55 : 81);
    doc.text(label, 20, y);
    doc.text(value, 150, y);
    y += 7;
  };

  if (isLegacy) {
    section('SALARY COMPUTATION');
    row('Basic Salary', `Rs. ${amount(record.basicSalary)}`);
    row('Bonus & Allowances', `+ Rs. ${amount(record.bonus)}`);
    row('Deductions', `- Rs. ${amount(record.deduction)}`);
  } else {
    section('ATTENDANCE');
    row('Calendar Days', dayFmt(record.calendarDays));
    row('Office Working Days', dayFmt(record.officeWorkingDays));
    row('Employee Worked Days', dayFmt(record.workedDays));
    row('Loss Of Pay', dayFmt(record.lop));
    row('Paid Leave Days / Unpaid Leave Days', `${dayFmt(record.paidLeaveDays)} / ${dayFmt(record.unpaidLeaveDays)}`);

    section('EARNINGS');
    row('Basic Salary', `Rs. ${amount(record.basicSalary)}`);
    row('Dearness Allowance', `Rs. ${amount(record.da)}`);
    row('Payable Basic Salary', `Rs. ${amount(record.payableBasic)}`);
    row('Payable Dearness Allowance', `Rs. ${amount(record.payableDa)}`);
    row('Gross Salary', `Rs. ${amount(record.gross)}`, true);

    section('DEDUCTIONS');
    row('Fine', `- Rs. ${amount(record.fine)}`);
    row('Special Allowance', `- Rs. ${amount(record.specialAllowance)}`);
    row('Employee State Insurance', `- Rs. ${amount(record.esi)}`);
    row('Provident Fund', `- Rs. ${amount(record.pf)}`);
    row('Total Deductions', `- Rs. ${amount(record.totalDeductions)}`, true);

    section('ADDITIONS');
    row('Bonus', `+ Rs. ${amount(record.bonus)}`);
    row('Incentive', `+ Rs. ${amount(record.incentive)}`);
    row('Arrears', `+ Rs. ${amount(record.arrears)}`);
  }

  // Net
  y += 2;
  doc.setDrawColor(243, 244, 246);
  doc.line(15, y, 195, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text('Net Take-Home Salary', 20, y);
  doc.setTextColor(79, 70, 229);
  doc.text(`Rs. ${amount(record.netSalary)}`, 150, y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Note: This is a system-generated electronic payslip record and does not require a signature.', 15, 285);

  doc.save(`payslip_${record.employeeCode}_${record.month.replace(' ', '_')}.pdf`);
}

/** Full snapshot columns shared by CSV + Excel. */
const FULL_COLUMNS: { header: string; get: (r: PayrollRecord) => string | number }[] = [
  { header: 'Employee', get: (r) => r.name },
  { header: 'Employee Code', get: (r) => r.employeeCode },
  { header: 'Designation', get: (r) => r.role },
  { header: 'Department', get: (r) => r.department },
  { header: 'Month', get: (r) => r.month },
  { header: 'Calendar Days', get: (r) => r.calendarDays },
  { header: 'Office Working Days', get: (r) => r.officeWorkingDays },
  { header: 'Worked Days', get: (r) => r.workedDays },
  { header: 'Paid Leave Days', get: (r) => r.paidLeaveDays },
  { header: 'Unpaid Leave Days', get: (r) => r.unpaidLeaveDays },
  { header: 'Loss Of Pay', get: (r) => r.lop },
  { header: 'Basic Salary', get: (r) => round2(r.basicSalary) },
  { header: 'Dearness Allowance', get: (r) => round2(r.da) },
  { header: 'Payable Basic', get: (r) => round2(r.payableBasic) },
  { header: 'Payable DA', get: (r) => round2(r.payableDa) },
  { header: 'Bonus', get: (r) => round2(r.bonus) },
  { header: 'Incentive', get: (r) => round2(r.incentive) },
  { header: 'Arrears', get: (r) => round2(r.arrears) },
  { header: 'Special Allowance', get: (r) => round2(r.specialAllowance) },
  { header: 'Fine', get: (r) => round2(r.fine) },
  { header: 'Provident Fund', get: (r) => round2(r.pf) },
  { header: 'ESI', get: (r) => round2(r.esi) },
  { header: 'Total Deductions', get: (r) => round2(r.officeWorkingDays > 0 ? r.totalDeductions : r.deduction) },
  { header: 'Gross Salary', get: (r) => round2(r.gross) },
  { header: 'Net Salary', get: (r) => round2(r.netSalary) },
  { header: 'Status', get: (r) => r.status },
];

/** Export records as CSV. */
export function exportToCsv(records: PayrollRecord[]) {
  if (records.length === 0) return;
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    FULL_COLUMNS.map((c) => c.header).join(','),
    ...records.map((r) => FULL_COLUMNS.map((c) => esc(c.get(r))).join(',')),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payroll_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Export records as Excel via exceljs. */
export async function exportToExcel(records: PayrollRecord[]) {
  if (records.length === 0) return;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll List');
  worksheet.columns = FULL_COLUMNS.map((c) => ({ header: c.header, key: c.header, width: 16 }));
  records.forEach((r) => {
    const row: Record<string, string | number> = {};
    FULL_COLUMNS.forEach((c) => { row[c.header] = c.get(r); });
    worksheet.addRow(row);
  });
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `payroll_report_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/** Export a compact tabular PDF report (high-value columns; full detail lives in payslips/Excel). */
export function exportToPdf(records: PayrollRecord[]) {
  if (records.length === 0) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Employee Payroll Master Report', 15, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 15, 20);

  const cols: [string, number][] = [
    ['Emp Code', 20], ['Name', 45], ['Month', 95], ['Worked/OWD', 130],
    ['Gross', 165], ['Deductions', 205], ['Net Salary', 245], ['Status', 280],
  ];
  const header = () => {
    doc.setFillColor(243, 244, 246);
    doc.rect(15, 25, 267, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 110, 120);
    cols.forEach(([label, x]) => doc.text(label, x, 30.5));
    doc.setTextColor(30, 40, 50);
    doc.setFont('helvetica', 'normal');
  };
  header();

  let y = 39;
  records.forEach((r) => {
    if (y > 185) { doc.addPage(); header(); y = 39; }
    const ded = r.officeWorkingDays > 0 ? r.totalDeductions : r.deduction;
    const worked = r.officeWorkingDays > 0 ? `${dayFmt(r.workedDays)}/${dayFmt(r.officeWorkingDays)}` : '—';
    doc.text(r.employeeCode, 20, y);
    doc.text(r.name.substring(0, 24), 45, y);
    doc.text(r.month, 95, y);
    doc.text(worked, 130, y);
    doc.text(r.officeWorkingDays > 0 ? amount(r.gross) : '—', 165, y);
    doc.text(amount(ded), 205, y);
    doc.text(amount(r.netSalary), 245, y);
    doc.text(r.status, 280, y);
    y += 8.5;
  });

  doc.save(`payroll_report_${new Date().toISOString().split('T')[0]}.pdf`);
}
