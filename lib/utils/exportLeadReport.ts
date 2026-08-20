import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Lead, LeadStage } from '@/lib/types/lead';
import type { BdePipelineOwner } from '@/lib/types/salesReports';
import type { SalesPerformanceReport } from '@/lib/api/salesReports';
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

/**
 * Builds the Sales Performance Report jsPDF document and returns it (no download).
 * Split from `exportLeadReport` so the exact render can be exercised headlessly.
 */
export function buildLeadReportDoc(
  leads: Lead[],
  stages: LeadStage[],
  filters: ReportFilters,
  /** Existing per-BDE computation (fetchPipelineReport().bdePipeline) — reused,
   *  not recomputed. Restricted below to the opportunities in THIS export. */
  bdePipeline?: BdePipelineOwner[],
  /** Single filter-aware payload (getSalesPerformanceReport) — the source of truth
   *  for Target/Achievement, Forecast, Trend and Insights. Absent → those sections
   *  are skipped (rest of the report is unaffected). */
  report?: SalesPerformanceReport,
): jsPDF {
  // ─────────────────────────────────────────────────────────────────────────
  // Founder Sales Control Report — dashboard-style presentation of the SAME
  // filter-aware payload (report) + filtered leads. No metric is recomputed a
  // second way; anything the data can't support renders as N/A (never faked).
  // ─────────────────────────────────────────────────────────────────────────
  const doc = new jsPDF('p', 'pt', 'a4');
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 40;
  const W = PW - M * 2;
  let y = 46;

  // Palette (adapts the ERP blue; kept light for print-friendliness).
  const C = {
    primary: [37, 99, 235] as [number, number, number],
    ink: [17, 24, 39] as [number, number, number],
    sub: [107, 114, 128] as [number, number, number],
    line: [226, 232, 240] as [number, number, number],
    card: [248, 250, 252] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],
    red: [225, 29, 72] as [number, number, number],
    amber: [217, 119, 6] as [number, number, number],
    teal: [13, 148, 136] as [number, number, number],
    indigo: [79, 70, 229] as [number, number, number],
    violet: [124, 58, 237] as [number, number, number],
    slate: [71, 85, 105] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const brk = (need: number) => { if (y + need > PH - 40) { doc.addPage(); y = 46; } };

  // Currency: compact ₹ (Rs. — jsPDF Helvetica has no ₹ glyph) for cards/blocks;
  // pdfINR (grouped) inside tables. One family, consistent everywhere.
  const inrC = (v: number | null | undefined): string => {
    if (v == null) return 'N/A';
    const n = Number(v) || 0, a = Math.abs(n);
    if (a >= 1e7) return `Rs. ${(n / 1e7).toFixed(2)}Cr`;
    if (a >= 1e5) return `Rs. ${(n / 1e5).toFixed(2)}L`;
    return pdfINR(n);
  };
  const pctS = (v: number | null | undefined) => (v == null ? 'N/A' : `${v}%`);

  // Consistent vertical rhythm: ONE place owns the gap above every section, and the
  // heading reserves `reserve` px so it never lands alone at a page foot (a break
  // here carries the whole section forward). Sections end at their content bottom and
  // let SECTION_GAP do the spacing — so the inter-section rhythm is uniform.
  const SECTION_GAP = 18;
  const sectionTitle = (text: string, accent: [number, number, number] = C.primary, reserve = 62) => {
    y += SECTION_GAP;
    brk(reserve);
    fill(accent); doc.roundedRect(M, y - 1, 4, 15, 1.5, 1.5, 'F');
    ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
    doc.text(text, M + 12, y + 11);
    y += 26;
  };

  interface Card { label: string; value: string; sub?: string; tone?: [number, number, number]; subTone?: [number, number, number] }
  const cardGrid = (items: Card[], cols: number, cardH = 56) => {
    const gap = 10; const cw = (W - gap * (cols - 1)) / cols;
    for (let i = 0; i < items.length; i += cols) {
      brk(cardH + 8);
      const rowY = y;
      for (let j = 0; j < cols && i + j < items.length; j++) {
        const it = items[i + j]; const x = M + j * (cw + gap);
        fill(C.card); stroke(C.line); doc.setLineWidth(0.7);
        doc.roundedRect(x, rowY, cw, cardH, 6, 6, 'FD');
        if (it.tone) { fill(it.tone); doc.roundedRect(x, rowY, 3.5, cardH, 1.5, 1.5, 'F'); }
        ink(C.sub); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(it.label.toUpperCase(), x + 11, rowY + 15, { maxWidth: cw - 18 });
        ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(13.5);
        doc.text(it.value, x + 11, rowY + 34, { maxWidth: cw - 16 });
        if (it.sub) {
          ink(it.subTone || C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
          doc.text(it.sub, x + 11, rowY + 48, { maxWidth: cw - 16 });
        }
      }
      // Gap BETWEEN card rows only; the last row ends at the true content bottom so
      // SECTION_GAP (not a baked-in trailing) sets the space to the next section.
      y = rowY + cardH + (i + cols < items.length ? 9 : 0);
    }
  };

  // ── Header ────────────────────────────────────────────────────────────────
  fill(C.primary); doc.rect(0, 0, PW, 5, 'F');
  ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('Founder Sales Control Report', M, y);
  y += 16;
  ink(C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, M, y + 2);
  y += 15;
  const filterLines = doc.splitTextToSize('Filters —  ' + buildFilterLines(filters).join('    |    '), W);
  ink(C.slate); doc.setFontSize(8.5);
  for (const ln of filterLines) { doc.text(ln, M, y); y += 11; }
  y += 6;
  stroke(C.line); doc.setLineWidth(0.7); doc.line(M, y, M + W, y);

  if (!report) {
    // Degraded fallback (backend report unreachable): still give a real snapshot
    // from the filtered leads rather than an empty page.
    ink(C.amber); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Live report metrics are temporarily unavailable — showing a basic pipeline snapshot.', M, y); y += 20;
    const bySrc: Record<string, number> = {};
    for (const l of leads) { const s = l.source || 'Other'; bySrc[s] = (bySrc[s] || 0) + 1; }
    autoTable(doc, {
      startY: y, head: [['Source', 'Leads']],
      body: Object.entries(bySrc).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, String(c)]),
      theme: 'striped', styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: C.primary }, margin: { left: M },
    });
    return doc;
  }

  const s = report.summary;

  // ── 1 · Overall Performance KPI cards ──────────────────────────────────────
  sectionTitle('Overall Performance', C.primary, 92); // keep heading with the first card row
  cardGrid([
    { label: 'Sales Target', value: s.targetAvailable ? inrC(s.target) : 'N/A', tone: C.indigo },
    { label: 'WON Revenue', value: inrC(s.wonRevenue), sub: s.achievementPercentage != null ? `${s.achievementPercentage}% achieved` : undefined, subTone: C.green, tone: C.green },
    { label: 'Target Achievement', value: pctS(s.achievementPercentage), tone: C.teal },
    { label: 'Target Gap', value: s.targetGap != null ? inrC(s.targetGap) : 'N/A', tone: C.amber },
    { label: 'Active Pipeline', value: inrC(s.activePipeline), sub: `${s.activeOpportunities} opportunities`, tone: C.primary },
    { label: 'Weighted Forecast', value: report.forecast.available ? inrC(report.forecast.weightedForecast) : 'N/A', sub: report.forecast.available ? undefined : 'no lead-level probability', tone: C.violet },
    { label: 'Overall Conversion', value: `${s.overallConversion}%`, sub: `${s.converted} converted`, tone: C.indigo },
    { label: 'Average Deal Value', value: inrC(s.avgDealValue), sub: `${s.totalOpportunities} in scope`, tone: C.slate },
  ], 4, 58);

  // ── 2 · Founder Action & Alerts ────────────────────────────────────────────
  sectionTitle('Founder Action & Alerts', C.red);
  if (report.insights.length === 0) {
    brk(30);
    fill([236, 253, 245]); stroke([167, 243, 208]); doc.setLineWidth(0.7);
    doc.roundedRect(M, y, W, 24, 5, 5, 'FD');
    ink(C.green); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('All clear — no action items surfaced from the current data.', M + 12, y + 15);
    y += 24;
  } else {
    report.insights.forEach((insn, idx) => {
      const dot = insn.severity === 'high' ? C.red : insn.severity === 'medium' ? C.amber : C.slate;
      const lines = doc.splitTextToSize(insn.message, W - 40);
      const h = 12 + lines.length * 11;
      if (idx > 0) y += 6; // gap BETWEEN alert boxes only — none after the last
      brk(h);
      fill([249, 250, 251]); stroke(C.line); doc.setLineWidth(0.7);
      doc.roundedRect(M, y, W, h, 5, 5, 'FD');
      fill(dot); doc.circle(M + 12, y + h / 2, 3, 'F');
      ink(C.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      let ty = y + 15;
      for (const ln of lines) { doc.text(ln, M + 24, ty); ty += 11; }
      y += h;
    });
  }

  // ── 3 · Selected-Period Execution ──────────────────────────────────────────
  const ex = report.execution;
  sectionTitle('Selected Period Execution', C.teal, 92); // keep heading with the first card row
  cardGrid([
    { label: 'New Leads Added', value: String(ex.newLeads), tone: C.teal },
    { label: 'Meaningful Conversations', value: String(ex.meaningfulConversations), tone: C.teal },
    { label: 'Discovery Meetings', value: String(ex.discoveryMeetings), tone: C.teal },
    { label: 'Proposals Sent', value: String(ex.proposalsSent), tone: C.teal },
    { label: 'Proposal Value', value: inrC(ex.proposalValue), tone: C.indigo },
    { label: 'Meetings Scheduled', value: String(ex.meetingsScheduled), tone: C.teal },
    { label: 'WON Revenue', value: inrC(s.wonRevenue), tone: C.green },
  ], 4, 50);

  // ── 4 · Pipeline Funnel & Stage Conversion (horizontal bars) ───────────────
  // The conversion funnel = the NQL→WON progression only (HOLD/LOST are terminal
  // outcomes, detailed in the "Hold & Lost Outcomes" section below — not funnel
  // stages). An ALL total row closes it. Counts/values/conversions come straight
  // from the filtered payload; ALL is terminal so it shows no conversion.
  sectionTitle('Pipeline Funnel & Stage Conversion', C.amber, 120); // keep heading with the funnel start
  const funnelRows = report.funnel;
  const stageColors: Record<string, [number, number, number]> = {
    NQL: [99, 102, 241], MQL: [59, 130, 246], SQL: [14, 165, 233], PQL: [6, 182, 212], SAL: [20, 184, 166], WON: [16, 185, 129],
  };
  const maxOpp = Math.max(...funnelRows.map((fst) => fst.opportunities), 1);
  const barX = M + 46;
  const barMax = 210;
  const numX = barX + barMax + 12;
  brk(16);
  ink(C.sub); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
  doc.text('STAGE', M, y); doc.text('OPPS', numX, y); doc.text('VALUE', numX + 70, y); doc.text('CONV →', numX + 150, y);
  y += 10;
  for (const fst of funnelRows) {
    brk(20);
    const col = stageColors[fst.stage] || C.primary;
    ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(fst.stage, M, y + 11);
    fill(C.line); doc.roundedRect(barX, y + 3, barMax, 12, 3, 3, 'F');
    const bw = Math.max(3, (fst.opportunities / maxOpp) * barMax);
    fill(col); doc.roundedRect(barX, y + 3, bw, 12, 3, 3, 'F');
    ink(C.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(String(fst.opportunities), numX, y + 12);
    doc.text(inrC(fst.value), numX + 70, y + 12);
    ink(fst.conversionToNext != null ? C.green : C.sub);
    doc.text(fst.conversionToNext != null ? `${fst.conversionToNext}%` : '—', numX + 150, y + 12);
    y += 19;
  }
  // ALL / total row — reconciles to the filtered dataset (summary totals).
  brk(24);
  stroke(C.line); doc.setLineWidth(0.8); doc.line(M, y + 1, M + W, y + 1); y += 6;
  ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text('ALL', M, y + 10);
  doc.text(String(s.totalOpportunities), numX, y + 10);
  doc.text(inrC(s.totalValue), numX + 70, y + 10);
  ink(C.sub); doc.setFont('helvetica', 'normal'); doc.text('total', numX + 150, y + 10);
  y += 14;

  // ── 5 · Hold & Lost blocks (two distinct colored containers) ───────────────
  sectionTitle('Hold & Lost Outcomes', C.red, 150); // keep the two blocks with the heading
  const blockW = (W - 12) / 2;
  const hl = report.holdLost;
  const rate = (n: number) => (s.totalOpportunities > 0 ? `${Math.round((n / s.totalOpportunities) * 1000) / 10}%` : '0%');
  const drawHL = (x: number, title: string, tint: [number, number, number], border: [number, number, number], data: any) => {
    const reasons = (data.reasons || []).slice(0, 3);
    const h = 78 + reasons.length * 11;
    fill(tint); stroke(border); doc.setLineWidth(0.8);
    doc.roundedRect(x, y, blockW, h, 6, 6, 'FD');
    ink(border); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(title, x + 12, y + 18);
    ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(String(data.count), x + 12, y + 40);
    ink(C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`opportunities  ·  ${rate(data.count)} of pipeline`, x + 12, y + 52);
    ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(inrC(data.value), x + 12, y + 68);
    ink(C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('total value', x + 12, y + 76);
    if (reasons.length) {
      ink(C.slate); doc.setFontSize(7.5);
      let ry = y + 68;
      const rx = x + blockW / 2;
      doc.setFont('helvetica', 'bold'); doc.text('Top reasons', rx, y + 40);
      doc.setFont('helvetica', 'normal');
      for (const r of reasons) { doc.text(`• ${r.reason} (${r.count})`, rx, ry, { maxWidth: blockW / 2 - 16 }); ry += 11; }
    }
    return h;
  };
  brk(120);
  const hHold = drawHL(M, 'ON HOLD', [255, 251, 235], C.amber, hl.hold);
  const hLost = drawHL(M + blockW + 12, 'LOST', [254, 242, 242], C.red, hl.lost);
  y += Math.max(hHold, hLost);

  // ── 4b · Pipeline Funnel – Value Range (ALL vs ₹2L+) ───────────────────────
  // SEPARATE section (the funnel above is untouched). Two views of the SAME
  // filtered dataset: every opportunity (ALL) and only those worth ≥ the backend's
  // configurable threshold (₹2L+), whose funnel is RECOMPUTED server-side over that
  // subset — never the all-funnel relabelled. Same compact row + bar style as above.
  sectionTitle('Pipeline Funnel – Value Range', C.violet, 120); // keep heading with the first view
  const vr = report.funnelValueRange;
  const drawSubFunnel = (
    label: string,
    view: { funnel: { stage: string; opportunities: number; value: number; conversionToNext: number | null }[]; totalOpportunities: number; totalValue: number },
  ) => {
    brk(30);
    // View sub-header (ALL / ₹2L+) with its own totals.
    fill(C.violet); doc.roundedRect(M, y, 3.5, 13, 1.5, 1.5, 'F');
    ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(label, M + 9, y + 10);
    ink(C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(`${view.totalOpportunities} opportunities  ·  ${inrC(view.totalValue)}`, M + 70, y + 10);
    y += 18;
    // Column headers.
    ink(C.sub); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text('STAGE', M, y); doc.text('OPPS', numX, y); doc.text('VALUE', numX + 70, y); doc.text('CONV →', numX + 150, y);
    y += 10;
    const maxO = Math.max(...view.funnel.map((f) => f.opportunities), 1);
    for (const fst of view.funnel) {
      brk(20);
      const col = stageColors[fst.stage] || C.primary;
      ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(fst.stage, M, y + 11);
      fill(C.line); doc.roundedRect(barX, y + 3, barMax, 12, 3, 3, 'F');
      const bw = Math.max(3, (fst.opportunities / maxO) * barMax);
      fill(col); doc.roundedRect(barX, y + 3, bw, 12, 3, 3, 'F');
      ink(C.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text(String(fst.opportunities), numX, y + 12);
      doc.text(inrC(fst.value), numX + 70, y + 12);
      ink(fst.conversionToNext != null ? C.green : C.sub);
      doc.text(fst.conversionToNext != null ? `${fst.conversionToNext}%` : '—', numX + 150, y + 12);
      y += 19;
    }
    // Per-view total row.
    brk(22);
    stroke(C.line); doc.setLineWidth(0.8); doc.line(M, y + 1, M + W, y + 1); y += 6;
    ink(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('TOTAL', M, y + 10);
    doc.text(String(view.totalOpportunities), numX, y + 10);
    doc.text(inrC(view.totalValue), numX + 70, y + 10);
    ink(C.sub); doc.setFont('helvetica', 'normal'); doc.text('—', numX + 150, y + 10);
    y += 20;
  };
  drawSubFunnel('ALL', vr.all);
  y += 8;
  drawSubFunnel(`Rs. 2L+  (>= ${inrC(vr.threshold)})`, vr.highValue);

  // ── 6 · Team / BDE Performance (table; totals reconcile to summary) ─────────
  if (report.teamPerformance.length) {
    sectionTitle('Team / BDE Performance', C.indigo, 100); // keep heading with the table head + first rows
    const statusFor = (t: any) => {
      if (t.achievement == null) return 'N/A';
      return t.achievement >= 80 ? 'On Track' : t.achievement >= 50 ? 'Watch' : 'At Risk';
    };
    const teamBody = report.teamPerformance.map((t: any) => [
      t.name, t.target != null ? pdfINR(t.target) : 'N/A', pdfINR(t.wonRevenue),
      t.achievement != null ? `${t.achievement}%` : 'N/A', pdfINR(t.activePipeline), `${t.conversion}%`, statusFor(t),
    ]);
    const totWon = report.teamPerformance.reduce((a: number, t: any) => a + t.wonRevenue, 0);
    const totActive = report.teamPerformance.reduce((a: number, t: any) => a + t.activePipeline, 0);
    const totTarget = report.teamPerformance.reduce((a: number, t: any) => a + (t.target || 0), 0);
    teamBody.push(['TOTAL', totTarget ? pdfINR(totTarget) : 'N/A', pdfINR(totWon), '', pdfINR(totActive), '', '']);
    brk(60);
    autoTable(doc, {
      startY: y, head: [['BDE', 'Target', 'WON', 'Achv.', 'Pipeline', 'Conv.', 'Status']],
      body: teamBody, theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 5 }, headStyles: { fillColor: C.indigo },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      didParseCell: (d: any) => { if (d.row.index === teamBody.length - 1) d.cell.styles.fontStyle = 'bold'; },
      margin: { left: M }, tableWidth: W,
    });
    y = (doc as any).lastAutoTable.finalY;
  }

  // ── 7 · WON Revenue Trend — Target vs WON across the selected range ─────────
  // Time-series over EVERY bucket the backend returned (day/week/month, 0-filled):
  // WON revenue as bars, the per-bucket Target run-rate as an overlaid line. Target
  // is shown ONLY where real SalesTarget data exists (else "Not Available" — never
  // fabricated). Values reconcile with the summary WON revenue + SalesTarget totals.
  sectionTitle(`WON Revenue Trend (by ${report.trend.bucket})`, C.green, 180); // keep the chart with its heading
  const pts = report.trend.points;
  const anyTarget = pts.some((p) => p.target != null);
  if (pts.length === 0) {
    ink(C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('No data in the selected period.', M, y + 4); y += 8;
  } else {
    brk(150);
    // Legend
    ink(C.sub); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    fill(C.green); doc.rect(M, y - 6, 8, 8, 'F'); doc.text('WON REVENUE', M + 12, y);
    if (anyTarget) {
      stroke(C.amber); doc.setLineWidth(1.4); doc.line(M + 96, y - 3, M + 114, y - 3);
      fill(C.amber); doc.circle(M + 105, y - 3, 1.6, 'F');
      ink(C.sub); doc.text('TARGET', M + 118, y);
    } else {
      ink(C.amber); doc.text('TARGET: NOT AVAILABLE', M + 96, y);
    }
    y += 10;
    const chartH = 100;
    // Ranges cap at ~31 buckets (day ≤ 31 / week / month), so every bucket fits.
    const shown = pts.slice(-31);
    const maxV = Math.max(...shown.map((p) => Math.max(p.wonRevenue, p.target ?? 0)), 1);
    const bw = W / shown.length;
    const baseY = y + chartH;
    // Baseline + top-of-scale label
    stroke(C.line); doc.setLineWidth(0.7); doc.line(M, baseY, M + W, baseY);
    ink(C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text(inrC(maxV), M, y - 1);
    // WON bars
    shown.forEach((p, i) => {
      const h = Math.round((p.wonRevenue / maxV) * (chartH - 12));
      fill(C.green); doc.roundedRect(M + i * bw + Math.max(1, bw * 0.2), baseY - h, Math.max(2, bw * 0.6), h, 1.5, 1.5, 'F');
    });
    // Target line (connected markers), where available
    if (anyTarget) {
      stroke(C.amber); doc.setLineWidth(1.4);
      let prev: [number, number] | null = null;
      shown.forEach((p, i) => {
        if (p.target == null) { prev = null; return; }
        const cx = M + i * bw + bw / 2;
        const cy = baseY - Math.round((p.target / maxV) * (chartH - 12));
        if (prev) doc.line(prev[0], prev[1], cx, cy);
        fill(C.amber); doc.circle(cx, cy, 1.4, 'F');
        prev = [cx, cy];
      });
    }
    // X labels (first / mid / last to avoid crowding; MM-DD from the bucket key)
    ink(C.sub); doc.setFontSize(6.5);
    const lblIdx = shown.length <= 6 ? shown.map((_, i) => i) : [0, Math.floor(shown.length / 2), shown.length - 1];
    lblIdx.forEach((i) => { if (shown[i]) doc.text(shown[i].date.slice(5), M + i * bw + 2, baseY + 9); });
    y = baseY + 12;
  }

  // ── 8 · Additional Analysis — Lead Source Performance (from filtered leads) ─
  sectionTitle('Additional Analysis — Lead Source Performance', C.slate, 100); // keep heading with the table head + first rows
  const srcMap: Record<string, { total: number; converted: number; value: number }> = {};
  for (const l of leads) {
    const src = l.source || 'Other';
    if (!srcMap[src]) srcMap[src] = { total: 0, converted: 0, value: 0 };
    srcMap[src].total++;
    if ((l.status || '').toLowerCase() === 'converted') srcMap[src].converted++;
    srcMap[src].value += Number(l.leadValue || 0);
  }
  const srcRows = Object.entries(srcMap).sort((a, b) => b[1].total - a[1].total).map(([src, st]) => [
    src, String(st.total), String(st.converted), `${((st.converted / Math.max(st.total, 1)) * 100).toFixed(1)}%`, pdfINR(st.value),
  ]);
  brk(50);
  autoTable(doc, {
    startY: y, head: [['Source', 'Leads', 'Converted', 'Conv. %', 'Value']],
    body: srcRows.length ? srcRows : [['—', '0', '0', '0%', pdfINR(0)]],
    theme: 'striped', styles: { fontSize: 8.5, cellPadding: 5 }, headStyles: { fillColor: C.slate },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { left: M }, tableWidth: W,
  });
  y = (doc as any).lastAutoTable.finalY;

  // ── 8b · Pipeline Health mini-cards ────────────────────────────────────────
  const fConv = report.funnel.filter((fst: any) => fst.conversionToNext != null);
  const best = fConv.length ? fConv.reduce((a: any, b: any) => (b.conversionToNext > a.conversionToNext ? b : a)) : null;
  const weak = fConv.length ? fConv.reduce((a: any, b: any) => (b.conversionToNext < a.conversionToNext ? b : a)) : null;
  sectionTitle('Pipeline Health', C.teal, 92); // keep heading with the first card row
  cardGrid([
    { label: 'Active Pipeline', value: inrC(s.activePipeline), sub: `${s.activeOpportunities} opportunities`, tone: C.primary },
    { label: 'Best-Converting Stage', value: best ? `${best.stage} ${best.conversionToNext}%` : 'N/A', tone: C.green },
    { label: 'Weakest-Converting Stage', value: weak ? `${weak.stage} ${weak.conversionToNext}%` : 'N/A', tone: C.amber },
    { label: 'Pipeline Coverage', value: s.pipelineCoverage != null ? `${s.pipelineCoverage}x` : 'N/A', tone: C.indigo },
    { label: 'On Hold (stalled)', value: `${hl.hold.count}`, sub: inrC(hl.hold.value), tone: C.amber },
    { label: 'Lost', value: `${hl.lost.count}`, sub: inrC(hl.lost.value), tone: C.red },
    { label: 'Avg Sales Cycle', value: 'N/A', sub: 'no cycle timestamps', tone: C.slate },
  ], 4, 54);

  // Page footer numbers (stamped after all sections so pagination is complete).
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    ink(C.sub); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text('Founder Sales Control Report', M, PH - 20);
    doc.text(`Page ${i} of ${pageCount}`, PW - M - 60, PH - 20);
  }

  return doc;
}

/** Builds the report and triggers the browser download. */
export async function exportLeadReport(
  leads: Lead[],
  stages: LeadStage[],
  filters: ReportFilters,
  bdePipeline?: BdePipelineOwner[],
  report?: SalesPerformanceReport,
) {
  buildLeadReportDoc(leads, stages, filters, bdePipeline, report)
    .save(`Sales_Leads_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
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
