import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatINR } from '@/lib/utils/currency';
import type { ExpenseReport } from '@/lib/api/marketingFinance';

/**
 * MK-004.6 — the PDF half of the per-client expense report.
 *
 * Built with jsPDF + jspdf-autotable, the app's existing PDF-table convention
 * (see lib/utils/exportLeadReport.ts). NOT html2canvas: this codebase's Tailwind
 * palette uses oklch(), which html2canvas cannot parse.
 *
 * CRITICAL: every number drawn here comes straight off the `report` the SERVER
 * built. Nothing is recomputed — no re-summing of rows, no re-deriving of
 * percentages — so the PDF, the Excel workbook and the on-screen dashboard are
 * three renderings of one calculation rather than three calculations.
 */

const M = 40;                              // page margin
const C = { primary: [15, 118, 110] as [number, number, number],
            slate: [71, 85, 105] as [number, number, number] };

export function buildExpenseReportPdf(report: ExpenseReport): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth() - M * 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.primary);
  doc.text(`Expense report — ${report.client.name}`, M, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.slate);
  const period = report.range.from || report.range.to
    ? `${report.range.from ?? 'start'} to ${report.range.to ?? 'today'}`
    : 'All dates';
  doc.text(
    [
      `Period: ${period}`,
      `Scope: ${report.scope}`,
      `Generated: ${report.generatedAt.slice(0, 19).replace('T', ' ')} UTC`,
    ].join('     •     '),
    M, 62,
  );

  /* Line items. An empty report still produces a real document with headers and
   * a zero total, rather than a blank or broken page. */
  autoTable(doc, {
    startY: 78,
    head: [['Date', 'Category', 'Title', 'Project', 'Vendor', 'Description', 'Amount']],
    body: report.rows.length
      ? report.rows.map((r) => [
        r.date ?? '', r.category, r.title, r.projectName ?? '—',
        r.vendor ?? '—', r.notes ?? '', formatINR(r.amount),
      ])
      : [['—', '—', 'No approved expenses in this period.', '—', '—', '', formatINR(0)]],
    foot: [['', '', '', '', '', 'Grand total', formatINR(report.grandTotal)]],
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: C.primary },
    footStyles: { fillColor: [241, 245, 249], textColor: C.slate, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60 }, 1: { cellWidth: 80 }, 2: { cellWidth: 150 },
      3: { cellWidth: 100 }, 4: { cellWidth: 90 }, 6: { halign: 'right', cellWidth: 85 },
    },
    margin: { left: M, right: M },
    tableWidth: W,
  });

  // Category totals — the same array the chart and the spreadsheet use.
  const afterRows = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  if (report.categories.length) {
    autoTable(doc, {
      startY: afterRows + 18,
      head: [['Category', 'Expenses', 'Amount', 'Share']],
      body: report.categories.map((c) => [c.name, String(c.count), formatINR(c.amount), `${c.percent}%`]),
      foot: [['Grand total', String(report.count), formatINR(report.grandTotal), report.count ? '100%' : '—']],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: C.slate },
      footStyles: { fillColor: [241, 245, 249], textColor: C.slate, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: M, right: M },
      tableWidth: 420,
    });
  }

  // Page numbers, added last so the total count is known.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...C.slate);
    doc.text(
      `Page ${i} of ${pages}`,
      doc.internal.pageSize.getWidth() - M,
      doc.internal.pageSize.getHeight() - 16,
      { align: 'right' },
    );
  }
  return doc;
}

export function downloadExpenseReportPdf(report: ExpenseReport): void {
  const safe = report.client.name.replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase();
  buildExpenseReportPdf(report).save(
    `expenses-${safe}-${report.range.from ?? 'all'}-${report.range.to ?? 'all'}.pdf`,
  );
}
