/**
 * Master Dashboard — executive PDF report generator.
 *
 * The app has no PDF library installed, so rather than pull in a dependency we
 * render a dedicated, branded, A4-optimised report document into a hidden
 * iframe and hand it to the browser's print pipeline ("Save as PDF"). This is
 * fully isolated from the app's own styles, so the exported document is clean
 * and executive-friendly — not a screenshot of the dashboard chrome.
 *
 * The caller (the Master Dashboard page) builds the model from the SAME live
 * data + formatting shown on screen, so the PDF always matches the dashboard.
 */

export interface ReportKpi {
  label: string;
  value: string;
  sub?: string;
}

export interface ReportRow {
  label: string;
  value: string;
}

export interface ReportSection {
  title: string;
  rows: ReportRow[];
}

export interface ReportActivity {
  actor: string;
  description: string;
  time: string;
}

export interface ReportAlert {
  title: string;
  desc: string;
  type: string;
  time: string;
}

export interface MasterDashboardReportModel {
  reportTitle: string;
  subtitle: string;
  generatedAt: Date;
  kpis: ReportKpi[];
  departments: ReportSection[];
  analytics: ReportSection[];
  activities: ReportActivity[];
  alerts: ReportAlert[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Dynamic file name, e.g. `Master-Dashboard-Report-2026-06-19` (no extension). */
export function reportFileBase(d: Date): string {
  return `Master-Dashboard-Report-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatStamp(d: Date): string {
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${pad(d.getMinutes())} ${ampm}`;
}

/** Escape user/live data before injecting into the report HTML. */
function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Quote a value for safe use inside a CSS `content` string (the @page margin
 * boxes that render the footer). HTML escaping is wrong here — CSS strings only
 * need backslashes/quotes escaped and newlines flattened. Values placed in the
 * footer are app-controlled (report title, timestamp), not raw API data.
 */
function cssStr(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, ' ');
}

function alertTone(type: string): string {
  switch ((type || '').toLowerCase()) {
    case 'critical': return '#dc2626';
    case 'warning': return '#d97706';
    case 'success': return '#059669';
    default: return '#2563eb';
  }
}

function sectionTable(section: ReportSection): string {
  const rows = section.rows.length
    ? section.rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="num">${esc(r.value)}</td></tr>`).join('')
    : '<tr><td colspan="2" class="empty">No data available.</td></tr>';
  return `
    <div class="block no-break">
      <h3>${esc(section.title)}</h3>
      <table><tbody>${rows}</tbody></table>
    </div>`;
}

function buildReportHtml(model: MasterDashboardReportModel, fileBase: string): string {
  const stamp = formatStamp(model.generatedAt);

  // Footer text is rendered through @page margin boxes (below) rather than a
  // fixed DOM element, so it can carry real page numbers via
  // counter(page)/counter(pages) — a normal positioned element cannot read
  // those print counters.
  const footerBrand = cssStr(`SHAHI SOLUTIONS — ${model.reportTitle}`);

  const kpiCards = model.kpis.map((k) => `
    <div class="kpi no-break">
      <div class="kpi-label">${esc(k.label)}</div>
      <div class="kpi-value">${esc(k.value)}</div>
      ${k.sub ? `<div class="kpi-sub">${esc(k.sub)}</div>` : ''}
    </div>`).join('');

  const depts = model.departments.map(sectionTable).join('');

  const analytics = model.analytics.length
    ? model.analytics.map(sectionTable).join('')
    : '<div class="block"><p class="empty">No analytics available.</p></div>';

  const activityRows = model.activities.length
    ? model.activities.map((a) => `
      <tr>
        <td>${esc(a.actor)}</td>
        <td>${esc(a.description)}</td>
        <td class="nowrap">${esc(a.time)}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" class="empty">No recent activities recorded.</td></tr>';

  const alertRows = model.alerts.length
    ? model.alerts.map((al) => `
      <tr>
        <td><span class="dot" style="background:${alertTone(al.type)}"></span>${esc(al.title)}</td>
        <td>${esc(al.desc)}</td>
        <td class="nowrap">${esc(al.time)}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" class="empty">No active alerts. Your organization is running smoothly.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(fileBase)}</title>
<style>
  @page {
    size: A4;
    margin: 16mm 12mm 18mm;
    /* Running footer with live page numbers. Chromium/Edge print-to-PDF (the
       pipeline this report uses via win.print()) renders @page margin boxes and
       supplies counter(page)/counter(pages); the boxes repeat on every page. */
    @bottom-left {
      content: "${footerBrand}";
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 8px; color: #94a3b8;
    }
    @bottom-center {
      content: "Confidential — for internal executive use";
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 8px; color: #94a3b8;
    }
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 8px; color: #94a3b8;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.45; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark { width: 40px; height: 40px; border-radius: 9px; background: #4f46e5; color: #fff; font-weight: 800; font-size: 12px; letter-spacing: .5px; display: flex; align-items: center; justify-content: center; }
  .brand-name { font-size: 16px; font-weight: 800; color: #1e1b4b; }
  .brand-tag { font-size: 10px; color: #64748b; }
  .report-meta { text-align: right; }
  .report-title { font-size: 17px; font-weight: 800; color: #4f46e5; }
  .report-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
  .report-date { font-size: 10px; color: #334155; margin-top: 4px; font-weight: 600; }
  h2 { font-size: 12.5px; font-weight: 800; color: #1e293b; margin: 18px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: .4px; }
  h3 { font-size: 11px; font-weight: 700; color: #334155; margin: 8px 0 4px; }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .kpi { flex: 1 1 30%; min-width: 150px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 11px; background: #f8fafc; }
  .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: .4px; color: #64748b; font-weight: 700; }
  .kpi-value { font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 3px; }
  .kpi-sub { font-size: 9px; color: #64748b; margin-top: 2px; }
  .cols { display: flex; flex-wrap: wrap; gap: 6px 16px; }
  .block { flex: 1 1 44%; min-width: 230px; }
  table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  thead { display: table-header-group; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; letter-spacing: .3px; color: #475569; }
  td.num { text-align: right; font-weight: 700; white-space: nowrap; width: 42%; }
  td.nowrap { white-space: nowrap; color: #64748b; }
  td.empty { color: #94a3b8; font-style: italic; text-align: center; }
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; }
  .no-break { page-break-inside: avoid; }
  section { page-break-inside: auto; }
</style>
</head>
<body>
  <header class="report-header">
    <div class="brand">
      <div class="brand-mark">SH</div>
      <div>
        <div class="brand-name">SHAHI SOLUTIONS</div>
        <div class="brand-tag">Enterprise Resource Planning</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-title">${esc(model.reportTitle)}</div>
      <div class="report-sub">${esc(model.subtitle)}</div>
      <div class="report-date">Generated: ${esc(stamp)}</div>
    </div>
  </header>

  <section>
    <h2>Executive KPIs</h2>
    <div class="kpi-grid">${kpiCards}</div>
  </section>

  <section>
    <h2>Department Summary</h2>
    <div class="cols">${depts}</div>
  </section>

  <section>
    <h2>Analytics</h2>
    <div class="cols">${analytics}</div>
  </section>

  <section>
    <h2>Recent Activity</h2>
    <table>
      <thead><tr><th style="width:22%">User</th><th>Activity</th><th style="width:24%">Time</th></tr></thead>
      <tbody>${activityRows}</tbody>
    </table>
  </section>

  <section>
    <h2>Alert Center</h2>
    <table>
      <thead><tr><th style="width:28%">Alert</th><th>Details</th><th style="width:18%">When</th></tr></thead>
      <tbody>${alertRows}</tbody>
    </table>
  </section>
</body>
</html>`;
}

/**
 * Render the model to a print-ready document and open the browser's
 * "Save as PDF" pipeline. Resolves once printing has been dispatched (or the
 * user dismisses the dialog); rejects if the document cannot be created.
 */
export function generateMasterDashboardPdf(model: MasterDashboardReportModel): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('PDF export is only available in the browser.'));
  }

  const fileBase = reportFileBase(model.generatedAt);
  const html = buildReportHtml(model, fileBase);

  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    let done = false;
    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch { /* already detached */ }
    };
    const settle = (err?: Error) => {
      if (done) return;
      done = true;
      // Defer removal so the print job can still read the document.
      window.setTimeout(cleanup, 1500);
      if (err) reject(err); else resolve();
    };

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      cleanup();
      reject(new Error('Unable to initialise the report document.'));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        win.focus();
        win.onafterprint = () => settle();
        win.print();
        // Safety net for browsers that never fire `onafterprint`.
        window.setTimeout(() => settle(), 1500);
      } catch (e) {
        settle(e instanceof Error ? e : new Error('PDF generation failed.'));
      }
    };

    // `document.write` is usually synchronous, but wait for layout to be safe.
    iframe.onload = () => window.setTimeout(triggerPrint, 200);
    window.setTimeout(triggerPrint, 700);
  });
}
