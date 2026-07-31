import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Lead, LeadStage } from '@/lib/types/lead';
import type { BdePipelineOwner } from '@/lib/types/salesReports';
import { formatINR } from '@/lib/utils/currency';
import { temperatureLabel } from '@/lib/data/leadTemperature';

interface ReportFilters {
  searchQuery?: string;
  source?: string;
  status?: string;
  stage?: string;
  owner?: string;
  /** Resolved owner display name (falls back to `owner` id, then "All Owners"). */
  ownerName?: string;
  temperature?: string;
  location?: string;
  district?: string;
  dateRange?: { from?: string; to?: string };
}

const fmtD = (s: string) => format(new Date(s), 'dd MMM yyyy');

/* ── Shared report formatting ────────────────────────────────────────────────
 * ONE definition of the lead listing and the applied-filter summary, consumed by
 * BOTH the PDF and the Excel export. A new column or filter is added here once
 * and appears, formatted identically, in every format — future report templates
 * reuse the same helpers rather than restating the columns.
 */

/** Dates: one format everywhere. Never `toLocaleDateString`, which varies by machine. */
export const reportDate = (v?: string | null): string =>
  v && !Number.isNaN(new Date(v).getTime()) ? format(new Date(v), 'dd MMM yyyy') : '—';

const dash = (v?: string | null) => (v && String(v).trim() ? String(v) : '—');

/**
 * Money for the PDF. jsPDF's built-in Helvetica is WinAnsi (cp1252) and has no
 * '₹' (U+20B9): it writes the codepoint's two bytes literally, so "₹25,00,000"
 * lands in the file as " ¹25,00,000". Verified against the installed jsPDF.
 *
 * So the PDF prints "Rs." — the standard fallback in Indian business documents —
 * while the SCREEN and the Excel export keep the real ₹ glyph, which they render
 * correctly. Grouping and the value itself still come from formatINR, so there is
 * one formatter and no chance of the PDF disagreeing with the UI.
 *
 * ponytail: swap the glyph, don't embed a font. Embedding a Unicode TTF would add
 * a few hundred KB of base64 to the bundle — do that only if '₹' becomes a hard
 * branding requirement in the PDF itself.
 */
const pdfINR = (v: number | string | null | undefined): string =>
  formatINR(v).replace('₹', 'Rs. ');

export interface LeadColumn {
  header: string;
  /** Display value — already formatted (used verbatim by the PDF). */
  text: (l: Lead) => string;
  /** Raw value for Excel, so numbers/dates stay sortable cells, not strings. */
  raw?: (l: Lead) => string | number | Date | null;
  align?: 'left' | 'right';
  /** Relative width hint, in characters (Excel column width / PDF cell width). */
  width: number;
}

export const LEAD_COLUMNS: LeadColumn[] = [
  { header: 'Lead Name', text: (l) => dash(l.title), width: 26 },
  { header: 'Company', text: (l) => dash(l.customer?.company), width: 22 },
  { header: 'District', text: (l) => dash(l.district), width: 16 },
  { header: 'Contact', text: (l) => dash(l.customer?.name), width: 18 },
  { header: 'Phone', text: (l) => dash(l.customer?.phone), width: 16 },
  { header: 'Email', text: (l) => dash(l.customer?.email), width: 26 },
  { header: 'Source', text: (l) => dash(l.source), width: 14 },
  {
    header: 'Value',
    text: (l) => formatINR(Number(l.leadValue || 0)),
    // A real number in Excel: it sums, sorts and formats as currency there.
    raw: (l) => Number(l.leadValue || 0),
    align: 'right',
    width: 14,
  },
  { header: 'Assigned To', text: (l) => l.owner?.name || 'Unassigned', width: 18 },
  { header: 'Stage', text: (l) => dash(l.stage), width: 12 },
  { header: 'Lead Status', text: (l) => temperatureLabel(l.temperature), width: 13 },
  {
    header: 'Created',
    text: (l) => reportDate(l.createdAt),
    raw: (l) => (l.createdAt ? new Date(l.createdAt) : null),
    width: 14,
  },
];

/** The applied-filter summary — identical wording in every export format. */
export function buildFilterLines(filters: ReportFilters): string[] {
  const dr = filters.dateRange;
  const dateStr = dr && (dr.from || dr.to)
    ? (dr.from && dr.to && dr.from === dr.to ? fmtD(dr.from) : `${dr.from ? fmtD(dr.from) : '…'} – ${dr.to ? fmtD(dr.to) : '…'}`)
    : 'All Dates';
  const f: string[] = [`Owner: ${filters.ownerName || (filters.owner && filters.owner !== 'all' ? filters.owner : 'All Owners')}`];
  if (filters.stage && filters.stage !== 'all') f.push(`Stage: ${filters.stage}`);
  if (filters.temperature && filters.temperature !== 'all') f.push(`Lead Status: ${temperatureLabel(filters.temperature as any)}`);
  if (filters.source && filters.source !== 'all') f.push(`Source: ${filters.source}`);
  if (filters.district && filters.district !== 'all') f.push(`District: ${filters.district}`);
  if (filters.location) f.push(`Company / Location: ${filters.location}`);
  if (filters.searchQuery) f.push(`Search: "${filters.searchQuery}"`);
  f.push(`Date Range: ${dateStr}`);
  return f;
}

export async function exportLeadReport(
  leads: Lead[],
  stages: LeadStage[],
  filters: ReportFilters,
  /** Existing per-BDE computation (fetchPipelineReport().bdePipeline) — reused,
   *  not recomputed. Restricted below to the opportunities in THIS export. */
  bdePipeline?: BdePipelineOwner[],
) {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 40;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Pipeline Report', 40, cursorY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);

  // Applied Filters — shared with the Excel export so both state them identically.
  const f = buildFilterLines(filters);

  let y = cursorY + 15;
  doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy')}`, 40, y); y += 18;
  doc.setFont('helvetica', 'bold'); doc.text('Applied Filters', 40, y); y += 14;
  doc.setFont('helvetica', 'normal');
  for (const ln of doc.splitTextToSize(f.join('   |   '), pageWidth - 80)) { doc.text(ln, 40, y); y += 13; }
  cursorY = y + 12;

  // Canonical funnel-STAGE KPIs (stage = single source of truth, matching the board
  // and the table filter). WON/HOLD/LOST are pipeline stages; `converted` = the
  // opportunity left the pipeline (became a deal).
  const stageIs = (l: Lead, name: string) => (l.stage || '').toUpperCase() === name;
  const kpis = {
    total: leads.length,
    won: leads.filter((l) => stageIs(l, 'WON')).length,
    hold: leads.filter((l) => stageIs(l, 'HOLD')).length,
    lost: leads.filter((l) => stageIs(l, 'LOST')).length,
    converted: leads.filter((l) => (l.status || '').toLowerCase() === 'converted').length,
  };
  const conversionRate = kpis.total > 0 ? ((kpis.converted / kpis.total) * 100).toFixed(1) : '0.0';

  // Draw KPI Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Summary KPIs', 40, cursorY);
  cursorY += 20;

  const kpiData = [
    ['Total Opportunities', kpis.total.toString()],
    ['Won', kpis.won.toString()],
    ['Hold', kpis.hold.toString()],
    ['Lost', kpis.lost.toString()],
    ['Converted', kpis.converted.toString()],
    ['Conversion Rate', `${conversionRate}%`]
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [['Metric', 'Value']],
    body: kpiData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [63, 131, 248] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 150 }, 1: { cellWidth: 100 } },
    margin: { left: 40 }
  });
  cursorY = (doc as any).lastAutoTable.finalY + 30;

  // Calculate Source Analytics
  const sourceMap: Record<string, { total: number; converted: number }> = {};
  leads.forEach((l) => {
    const src = l.source || 'Other';
    if (!sourceMap[src]) sourceMap[src] = { total: 0, converted: 0 };
    sourceMap[src].total++;
    if (l.status === 'converted') sourceMap[src].converted++;
  });

  const sourceData = Object.entries(sourceMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([src, stats]) => [
      src,
      stats.total.toString(),
      stats.converted.toString(),
      `${((stats.converted / Math.max(stats.total, 1)) * 100).toFixed(1)}%`
    ]);

  // Check page break
  if (cursorY > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    cursorY = 40;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Lead Source Analytics', 40, cursorY);
  cursorY += 20;

  autoTable(doc, {
    startY: cursorY,
    head: [['Source', 'Total Leads', 'Converted', 'Conversion Rate']],
    body: sourceData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [16, 185, 129] }, // emerald
    margin: { left: 40 }
  });
  cursorY = (doc as any).lastAutoTable.finalY + 30;

  // Calculate Pipeline Analytics
  const stageMap: Record<string, { count: number; value: number }> = {};
  stages.forEach(s => stageMap[s.name] = { count: 0, value: 0 });

  leads.forEach((l) => {
    // Treat null/unknown stages safely
    const stg = l.stage || (stages[0]?.name ?? 'Unknown');
    if (!stageMap[stg]) stageMap[stg] = { count: 0, value: 0 };
    stageMap[stg].count++;
    stageMap[stg].value += Number(l.leadValue || 0);
  });

  const pipelineData = Object.entries(stageMap).map(([stg, stats]) => [
    stg,
    stats.count.toString(),
    `${((stats.count / Math.max(kpis.total, 1)) * 100).toFixed(1)}%`,
    pdfINR(stats.value)
  ]);

  if (cursorY > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    cursorY = 40;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Pipeline Summary', 40, cursorY);
  cursorY += 20;

  autoTable(doc, {
    startY: cursorY,
    head: [['Stage', 'Leads', 'Pipeline %', 'Total Value']],
    body: pipelineData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [245, 158, 11] }, // amber
    margin: { left: 40 }
  });
  cursorY = (doc as any).lastAutoTable.finalY + 30;

  // The Detailed Lead Listing was removed from the PDF: this is a management
  // summary, and the row-level data now lives in the Excel export (same filtered
  // dataset, via LEAD_COLUMNS). No query or calculation changed — `leads` still
  // drives the KPIs, source analytics and the stage summary above.

  // ── BDE Performance Summary (appended) ───────────────────────────────────
  // Reuses the existing per-BDE computation (KPIs + checklist), restricted to the
  // opportunities in THIS filtered export. Activity/checklist data isn't on the
  // client-side lead rows, so it comes from the already-computed `bdePipeline`.
  // ponytail: the daily "…Yesterday" KPIs are the backend's owner/period figures
  // (respect the report scope + export date range); only the Pipeline Status and
  // checklist rows are re-narrowed to the board's filtered set. Fine for a daily
  // summary; wire the board's stage/source filters through if exact parity matters.
  if (bdePipeline && bdePipeline.length) {
    const exportedIds = new Set(leads.map((l) => l.id));
    const pageH = doc.internal.pageSize.getHeight();
    const gap = (extra = 0) => { if (cursorY > pageH - 90 - extra) { doc.addPage(); cursorY = 40; } };

    gap(30);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('BDE Performance Summary', 40, cursorY); cursorY += 22;

    for (const bde of bdePipeline) {
      const rows = bde.leads.filter((l) => exportedIds.has(l.leadId));
      const k = bde.kpis;
      if (rows.length === 0 || !k) continue; // only BDEs with opportunities in this export

      gap();
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
      doc.text(`BDE : ${bde.name}`, 40, cursorY); cursorY += 8;

      autoTable(doc, {
        startY: cursorY,
        head: [['Metric', 'Value']],
        body: [
          ['New Leads Added Yesterday', String(k.newLeadsYesterday)],
          ['NQL', String(k.nql)], ['MQL', String(k.mql)],
          ['Meaningful Conversations Yesterday', String(k.meaningfulConversationsYesterday)],
          ['SQL', String(k.sql)],
          ['Discovery Meetings Conducted Yesterday', String(k.discoveryMeetingsYesterday)],
          ['PQL', String(k.pql)],
          ['Proposals Sent Yesterday', String(k.proposalsSentYesterday)],
          ['Proposal Value Yesterday', pdfINR(k.proposalValueYesterday)],
          ['Negotiations Active Yesterday', String(k.negotiationsActiveYesterday)],
          ['SAL', String(k.sal)], ['WON', String(k.won)],
          ['WON Revenue Yesterday', pdfINR(k.wonRevenueYesterday)],
          ['HOLD', String(k.hold)], ['LOST', String(k.lost)],
          ['Next-Day Meetings Scheduled Today', String(k.nextDayMeetingsToday)],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 240 }, 1: { cellWidth: 100, halign: 'right' } },
        margin: { left: 40 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 14;

      // Pipeline Status — current stage distribution, narrowed to this export.
      const statusBody = stages
        .map((s) => [s.name, rows.filter((r) => r.stage === s.name).length] as [string, number])
        .filter(([, c]) => c > 0)
        .map(([name, c]) => [name, String(c)]);
      gap();
      autoTable(doc, {
        startY: cursorY,
        head: [['Pipeline Stage', 'Count']],
        body: statusBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [245, 158, 11] },
        columnStyles: { 0: { cellWidth: 240 }, 1: { cellWidth: 100, halign: 'right' } },
        margin: { left: 40 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 24;
    }
  }

  // Page numbers previously rode on the listing table's didDrawPage hook, which
  // died with it. Stamp every page here instead, so pagination survives whatever
  // sections the report ends up with.
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 40, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`Sales_Leads_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}

/**
 * Excel export — the SAME filtered dataset, columns and filter summary as the PDF.
 * Callers pass exactly what they passed to `exportLeadReport`, so the two formats
 * cannot disagree about what was exported.
 *
 * exceljs is imported dynamically: it is large, and nothing should pay for it
 * until someone actually asks for a spreadsheet.
 */
export async function exportLeadWorkbook(leads: Lead[], filters: ReportFilters) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('Pipeline', {
    views: [{ state: 'frozen', ySplit: 4 }], // header rows stay put while scrolling
  });

  // ── Report header: title, generated date, applied filters ────────────────
  ws.mergeCells(1, 1, 1, LEAD_COLUMNS.length);
  const title = ws.getCell('A1');
  title.value = 'Pipeline Report';
  title.font = { size: 16, bold: true };
  title.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, LEAD_COLUMNS.length);
  ws.getCell('A2').value = `Generated on: ${reportDate(new Date().toISOString())}`;
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF6B7280' } };

  ws.mergeCells(3, 1, 3, LEAD_COLUMNS.length);
  ws.getCell('A3').value = `Applied Filters — ${buildFilterLines(filters).join('   |   ')}`;
  ws.getCell('A3').font = { size: 10, color: { argb: 'FF6B7280' } };
  ws.getCell('A3').alignment = { wrapText: true, vertical: 'top' };

  // ── Column headers ───────────────────────────────────────────────────────
  const headerRow = ws.getRow(4);
  LEAD_COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    cell.alignment = { horizontal: c.align ?? 'left', vertical: 'middle' };
  });
  headerRow.height = 20;

  // ── Rows. `raw` keeps numbers and dates as real cells so Excel can sum,
  //    sort and filter them; everything else uses the shared display text. ──
  for (const l of leads) {
    const row = ws.addRow(LEAD_COLUMNS.map((c) => (c.raw ? c.raw(l) : c.text(l))));
    LEAD_COLUMNS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.alignment = { horizontal: c.align ?? 'left', vertical: 'middle' };
      if (c.header === 'Value') cell.numFmt = '₹#,##0';
      if (c.header === 'Created') cell.numFmt = 'dd mmm yyyy';
    });
  }

  LEAD_COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });
  // Native column filters over the data range — no merged cells in it, so they work.
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: LEAD_COLUMNS.length } };

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sales_Leads_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
