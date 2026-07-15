import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import { PayrollRecord } from './payroll.types';

/**
 * Generate a formal computer-generated PDF Payslip.
 */
export function generatePayslipPdf(record: PayrollRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header color block
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, 210, 36, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Shahi Solutions Pvt Ltd', 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('HR & Payroll Department — Employee Payslip', 15, 24);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 155, 16);

  // Profile Details Header
  doc.setTextColor(31, 41, 55); // Dark Slate
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE PROFILE & STATEMENT', 15, 52);

  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.line(15, 55, 195, 55);

  // Profile metadata fields
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  
  doc.text('Employee Code:', 15, 64);
  doc.setFont('helvetica', 'bold');
  doc.text(record.employeeCode, 52, 64);

  doc.setFont('helvetica', 'normal');
  doc.text('Employee Name:', 15, 72);
  doc.setFont('helvetica', 'bold');
  doc.text(record.name, 52, 72);

  doc.setFont('helvetica', 'normal');
  doc.text('Designation:', 15, 80);
  doc.setFont('helvetica', 'bold');
  doc.text(record.role, 52, 80);

  doc.setFont('helvetica', 'normal');
  doc.text('Salary Month:', 15, 88);
  doc.setFont('helvetica', 'bold');
  doc.text(record.month, 52, 88);

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Status:', 15, 96);
  doc.setFont('helvetica', 'bold');
  if (record.status === 'Paid') {
    doc.setTextColor(16, 185, 129); // Emerald-500
  } else {
    doc.setTextColor(245, 158, 11); // Amber-500
  }
  doc.text(record.status, 52, 96);

  // Table Details
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SALARY COMPUTATION DETAILS', 15, 114);
  doc.line(15, 117, 195, 117);

  // Headers
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.rect(15, 122, 180, 8, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text('Earnings / Deductions Description', 20, 127);
  doc.text('Amount (INR)', 155, 127);

  // Values
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  doc.text('Basic Salary (Standard Base)', 20, 138);
  doc.text(`Rs. ${record.basicSalary.toLocaleString('en-IN')}`, 155, 138);

  doc.text('Bonus & Allowances', 20, 146);
  doc.text(`+ Rs. ${record.bonus.toLocaleString('en-IN')}`, 155, 146);

  doc.text('Deductions & Losses', 20, 154);
  doc.text(`- Rs. ${record.deduction.toLocaleString('en-IN')}`, 155, 154);

  doc.setDrawColor(243, 244, 246);
  doc.line(15, 160, 195, 160);

  // Net Salary
  doc.setFont('helvetica', 'bold');
  doc.text('Net Take-Home Salary', 20, 168);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.setFontSize(10.5);
  doc.text(`Rs. ${record.netSalary.toLocaleString('en-IN')}`, 155, 168);

  // Bottom note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175); // Gray-400
  doc.text('Note: This is a system-generated electronic payslip record and does not require a signature.', 15, 255);

  doc.save(`payslip_${record.employeeCode}_${record.month.replace(' ', '_')}.pdf`);
}

/**
 * Export records as CSV document.
 */
export function exportToCsv(records: PayrollRecord[]) {
  if (records.length === 0) return;

  const headers = [
    'Employee Code',
    'Name',
    'Designation',
    'Month',
    'Basic Salary',
    'Bonus',
    'Deduction',
    'Net Salary',
    'Status',
  ];

  const csvRows = [
    headers.join(','),
    ...records.map(r => [
      `"${r.employeeCode}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.role.replace(/"/g, '""')}"`,
      `"${r.month}"`,
      r.basicSalary,
      r.bonus,
      r.deduction,
      r.netSalary,
      `"${r.status}"`,
    ].join(',')),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payroll_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export records as Excel document using exceljs.
 */
export async function exportToExcel(records: PayrollRecord[]) {
  if (records.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll List');

  worksheet.columns = [
    { header: 'Employee Code', key: 'employeeCode', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Designation', key: 'role', width: 25 },
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Basic Salary', key: 'basicSalary', width: 15 },
    { header: 'Bonus', key: 'bonus', width: 12 },
    { header: 'Deduction', key: 'deduction', width: 12 },
    { header: 'Net Salary', key: 'netSalary', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  records.forEach(r => worksheet.addRow(r));

  // Style header row
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

/**
 * Export records tabular report as PDF using jsPDF.
 */
export function exportToPdf(records: PayrollRecord[]) {
  if (records.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Employee Payroll Master Report', 15, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 15, 20);

  // Table Headers
  doc.setFillColor(243, 244, 246);
  doc.rect(15, 25, 267, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 110, 120);
  doc.text('Emp Code', 20, 30.5);
  doc.text('Name', 45, 30.5);
  doc.text('Designation', 95, 30.5);
  doc.text('Month', 150, 30.5);
  doc.text('Basic (INR)', 180, 30.5);
  doc.text('Bonus (INR)', 210, 30.5);
  doc.text('Deduction', 235, 30.5);
  doc.text('Net Salary', 260, 30.5);

  doc.setTextColor(30, 40, 50);
  doc.setFont('helvetica', 'normal');
  let y = 39;
  records.forEach(r => {
    if (y > 185) {
      doc.addPage();
      // Draw headers again
      doc.setFillColor(243, 244, 246);
      doc.rect(15, 25, 267, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Emp Code', 20, 30.5);
      doc.text('Name', 45, 30.5);
      doc.text('Designation', 95, 30.5);
      doc.text('Month', 150, 30.5);
      doc.text('Basic (INR)', 180, 30.5);
      doc.text('Bonus (INR)', 210, 30.5);
      doc.text('Deduction', 235, 30.5);
      doc.text('Net Salary', 260, 30.5);
      doc.setFont('helvetica', 'normal');
      y = 39;
    }
    doc.text(r.employeeCode, 20, y);
    doc.text(r.name.substring(0, 22), 45, y);
    doc.text(r.role.substring(0, 22), 95, y);
    doc.text(r.month, 150, y);
    doc.text(r.basicSalary.toLocaleString('en-IN'), 180, y);
    doc.text(r.bonus.toLocaleString('en-IN'), 210, y);
    doc.text(r.deduction.toLocaleString('en-IN'), 235, y);
    doc.text(r.netSalary.toLocaleString('en-IN'), 260, y);
    y += 8.5;
  });

  doc.save(`payroll_report_${new Date().toISOString().split('T')[0]}.pdf`);
}
