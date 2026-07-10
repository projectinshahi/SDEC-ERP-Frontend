import { jsPDF } from 'jspdf';
import { ApiAppraisal } from './performance.types';

/**
 * Generate a formal computer-generated PDF Appraisal Report.
 */
export function generateAppraisalPdf(appraisal: ApiAppraisal) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header color block (matching violet/indigo payslip report style)
  doc.setFillColor(109, 40, 217); // Violet-700
  doc.rect(0, 0, 210, 36, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('', 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Human Resources — Performance Appraisal Statement', 15, 22);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 155, 14);

  // Profile Details Header
  doc.setTextColor(31, 41, 55); // Dark Slate
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE PROFILE & APPRAISAL INFO', 15, 48);

  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.line(15, 51, 195, 51);

  // Profile metadata fields
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  doc.text('Employee Code:', 15, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(appraisal.employee_code || '—', 52, 59);

  doc.setFont('helvetica', 'normal');
  doc.text('Employee Name:', 15, 66);
  doc.setFont('helvetica', 'bold');
  doc.text(appraisal.employee_name || '—', 52, 66);

  doc.setFont('helvetica', 'normal');
  doc.text('Designation & Dept:', 15, 73);
  doc.setFont('helvetica', 'bold');
  doc.text(`${appraisal.designation || '—'} / ${appraisal.department || '—'}`, 52, 73);

  doc.setFont('helvetica', 'normal');
  doc.text('Review Cycle:', 15, 80);
  doc.setFont('helvetica', 'bold');
  doc.text(appraisal.cycle_title || '—', 52, 80);

  doc.setFont('helvetica', 'normal');
  doc.text('Evaluator Name:', 15, 87);
  doc.setFont('helvetica', 'bold');
  doc.text(appraisal.manager_name || 'Unassigned', 52, 87);

  // Overall Score Box
  const rating = appraisal.overall_rating ?? appraisal.final_rating ?? 0;
  let grade = 'Poor';
  let badgeColor = [239, 68, 68]; // Red
  if (rating >= 4.5) { grade = 'Outstanding'; badgeColor = [16, 185, 129]; } // Emerald
  else if (rating >= 3.5) { grade = 'Excellent'; badgeColor = [59, 130, 246]; } // Blue
  else if (rating >= 2.5) { grade = 'Good'; badgeColor = [245, 158, 11]; } // Amber
  else if (rating >= 1.5) { grade = 'Needs Improvement'; badgeColor = [107, 114, 128]; } // Gray

  doc.setFillColor(249, 250, 251); // Gray-50
  doc.rect(135, 55, 60, 36, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(135, 55, 60, 36, 'S');

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERALL SCORE', 140, 61);

  doc.setTextColor(109, 40, 217); // Violet
  doc.setFontSize(22);
  doc.text(`${rating.toFixed(2)}`, 140, 72);
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('/ 5.00', 162, 72);

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.rect(140, 78, 50, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(grade.toUpperCase(), 165, 82.2, { align: 'center' });

  // Table Details
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CATEGORY RATINGS BREAKDOWN', 15, 102);
  doc.line(15, 105, 195, 105);

  // Headers
  doc.setFillColor(249, 250, 251);
  doc.rect(15, 110, 180, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Performance Category', 20, 115.5);
  doc.text('Self Score', 130, 115.5);
  doc.text('Manager Score', 165, 115.5);

  // Values table
  const cats = [
    { label: 'Technical Skills', self: appraisal.self_rating_tech, mgr: appraisal.manager_rating_tech },
    { label: 'Communication', self: appraisal.self_rating_comm, mgr: appraisal.manager_rating_comm },
    { label: 'Teamwork', self: appraisal.self_rating_team, mgr: appraisal.manager_rating_team },
    { label: 'Productivity', self: appraisal.self_rating_prod, mgr: appraisal.manager_rating_prod },
    { label: 'Problem Solving', self: appraisal.self_rating_solve, mgr: appraisal.manager_rating_solve },
    { label: 'Leadership (Optional)', self: appraisal.self_rating_lead, mgr: appraisal.manager_rating_lead },
  ];

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  let y = 124;
  for (const c of cats) {
    doc.setFont('helvetica', 'normal');
    doc.text(c.label, 20, y);
    doc.text(c.self != null && c.self > 0 ? String(c.self) : '—', 138, y, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(c.mgr != null && c.mgr > 0 ? String(c.mgr) : '—', 178, y, { align: 'center' });
    doc.setDrawColor(243, 244, 246);
    doc.line(15, y + 2.5, 195, y + 2.5);
    y += 8;
  }

  // Written Evaluation
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('WRITTEN FEEDBACK & EVALUATION NOTES', 15, 180);
  doc.line(15, 183, 195, 183);

  // Strengths
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Strengths & Accomplishments:', 15, 191);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const strengthsText = appraisal.manager_scores?.strengths || 'No strengths notes recorded.';
  const strengthsLines = doc.splitTextToSize(strengthsText, 175);
  doc.text(strengthsLines, 15, 196);

  let nextY = 196 + (strengthsLines.length * 4.5) + 4;

  // Improvement
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Areas of Improvement:', 15, nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const improvementText = appraisal.manager_scores?.improvement_areas || 'No improvement areas recorded.';
  const improvementLines = doc.splitTextToSize(improvementText, 175);
  doc.text(improvementLines, 15, nextY + 5);

  nextY = nextY + 5 + (improvementLines.length * 4.5) + 4;

  // Recommendation
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Promotion Recommendation:', 15, nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const recommendationText = appraisal.manager_scores?.promotion_recommendation || 'No recommendation details recorded.';
  const recommendationLines = doc.splitTextToSize(recommendationText, 175);
  doc.text(recommendationLines, 15, nextY + 5);

  // Footer / Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Note: This is an official performance appraisal review report signed off by SDEC HR management.', 15, 280);

  doc.save(`appraisal_report_${appraisal.employee_code || appraisal.employee_name}_${appraisal.cycle_title.replace(/\s+/g, '_')}.pdf`);
}
