import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Lead, LeadStage } from '@/lib/types/lead';
import { formatINR } from '@/lib/utils/currency';
import { temperatureLabel } from '@/lib/data/leadTemperature';

interface ReportFilters {
  searchQuery?: string;
  source?: string;
  status?: string;
  stage?: string;
  owner?: string;
  location?: string;
  dateRange?: { from?: string; to?: string };
}


export async function exportLeadReport(leads: Lead[], stages: LeadStage[], filters: ReportFilters) {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 40;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Leads Report', 40, cursorY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 40, cursorY + 15);
  doc.text(`Total Records: ${leads.length}`, 40, cursorY + 30);

  // Applied Filters
  let filterText = [];
  if (filters.dateRange && filters.dateRange.from && filters.dateRange.to) {
    if (filters.dateRange.from === filters.dateRange.to) {
      filterText.push(`Date Range: ${format(new Date(filters.dateRange.from), 'dd MMM yyyy')}`);
    } else {
      filterText.push(`Date Range: ${format(new Date(filters.dateRange.from), 'dd MMM yyyy')} - ${format(new Date(filters.dateRange.to), 'dd MMM yyyy')}`);
    }
  }
  if (filters.searchQuery) filterText.push(`Search: "${filters.searchQuery}"`);
  if (filters.source && filters.source !== 'all') filterText.push(`Source: ${filters.source}`);
  if (filters.status && filters.status !== 'all') filterText.push(`Status: ${filters.status}`);
  if (filters.stage && filters.stage !== 'all') filterText.push(`Stage: ${filters.stage}`);
  if (filters.owner && filters.owner !== 'all') filterText.push(`Owner ID: ${filters.owner}`);
  if (filters.location) filterText.push(`Location: ${filters.location}`);

  if (filterText.length > 0) {
    doc.text(`Active Filters: ${filterText.join(' | ')}`, 40, cursorY + 45);
    cursorY += 75;
  } else {
    cursorY += 60;
  }

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
    formatINR(stats.value)
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

  // Main Lead Data Table
  if (cursorY > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    cursorY = 40;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Lead Listing', 40, cursorY);

  const leadTableData = leads.map(l => [
    l.title || '—',
    l.customer?.company || '—',
    l.customer?.name || '—',
    l.customer?.phone || '—',
    l.customer?.email || '—',
    l.source || '—',
    formatINR(Number(l.leadValue || 0)),
    l.owner?.name || 'Unassigned',
    l.stage || '—',
    temperatureLabel(l.temperature),
    l.createdAt ? format(new Date(l.createdAt), 'dd/MM/yyyy') : '—'
  ]);

  autoTable(doc, {
    startY: cursorY + 20,
    head: [['Lead Name', 'Company', 'Contact', 'Phone', 'Email', 'Source', 'Value', 'Assigned To', 'Stage', 'Temperature', 'Created']],
    body: leadTableData,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [55, 65, 81] }, // gray-800
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: function (data: any) {
      // Add Page number to footer
      const str = `Page ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 20);
    }
  });

  doc.save(`Sales_Leads_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}
