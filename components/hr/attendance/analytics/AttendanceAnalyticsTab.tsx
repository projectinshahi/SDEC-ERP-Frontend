'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { DateRangeSelector, defaultRangeWindow } from '@/components/sales-reports/DateRangeSelector';
import type { ReportWindow } from '@/lib/api/salesReports';
import {
  fetchAttendanceSummary,
  fetchStatusDistribution,
  fetchAttendanceTrend,
  fetchDepartmentRanking,
  fetchEmployeeReport,
  type AnalyticsBaseFilters,
} from '@/lib/api/hrAnalytics';
import type {
  AnalyticsSummary,
  StatusDistribution,
  AttendanceTrend,
  DepartmentRankingResponse,
} from '@/lib/hr/attendanceAnalytics.types';
import { AnalyticsKpiCards } from './AnalyticsKpiCards';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { StatusDistributionDonut } from './StatusDistributionDonut';
import { DepartmentRankingChart } from './DepartmentRankingChart';
import { EmployeeReportTable } from './EmployeeReportTable';
import { EmployeeDrilldownDrawer } from './drilldown/EmployeeDrilldownDrawer';
import { AttendanceExportBar, type ReportQuery } from './AttendanceExportBar';
import { useAuth } from '@/lib/hooks/useAuth';
import type { DashboardReport, ReportFilter, ReportKpi, ReportTable } from '@/lib/pdf/dashboardPdf';

interface EmployeeOption {
  id: number;
  name: string;
  department: string;
}

/** Analytics tab embedded in the existing Attendance page. Owns the shared
 *  filters and fetches summary / distribution / trend / department together;
 *  the employee report table below manages its own pagination/sort/search. */
export function AttendanceAnalyticsTab({ employees }: { employees: EmployeeOption[] }) {
  const [dateRange, setDateRange] = useState<ReportWindow>(defaultRangeWindow);
  const [department, setDepartment] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [compare, setCompare] = useState(false);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [distribution, setDistribution] = useState<StatusDistribution | null>(null);
  const [trend, setTrend] = useState<AttendanceTrend | null>(null);
  const [dept, setDept] = useState<DepartmentRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Employee drill-down drawer — holds the clicked employee id (null = closed).
  const [drilldownId, setDrilldownId] = useState<number | null>(null);

  // Live Employee-Report query (lifted from the table) so exports match the view.
  const [reportQuery, setReportQuery] = useState<ReportQuery>({
    sort: 'attendancePct',
    order: 'asc',
    search: '',
  });

  const { user } = useAuth();

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees],
  );
  const employeeOptions = useMemo(() => {
    const list = department === 'all' ? employees : employees.filter((e) => e.department === department);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, department]);

  const baseFilters: AnalyticsBaseFilters = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
      department: department !== 'all' ? department : undefined,
      employeeId: employeeId !== 'all' ? Number(employeeId) : undefined,
    }),
    [dateRange.from, dateRange.to, department, employeeId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d, t, dep] = await Promise.all([
        fetchAttendanceSummary(baseFilters),
        fetchStatusDistribution(baseFilters),
        fetchAttendanceTrend({ ...baseFilters, compare }),
        fetchDepartmentRanking({ ...baseFilters, compare }),
      ]);
      setSummary(s);
      setDistribution(d);
      setTrend(t);
      setDept(dep);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [baseFilters, compare]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side dashboard PDF from in-memory data + the full Employee Report.
  // Charts (Trend / Status Distribution / Department Ranking) are auto-captured
  // by ExportPdfButton; the employee table is fetched across ALL pages so nothing
  // is truncated, using the table's live filters + sort + search.
  const buildPdfReport = useCallback(async (): Promise<DashboardReport> => {
    const deptLabel = department !== 'all' ? department : 'All Departments';
    const empLabel =
      employeeId !== 'all'
        ? employees.find((e) => String(e.id) === employeeId)?.name ?? `#${employeeId}`
        : 'All Employees';

    const filters: ReportFilter[] = [
      { label: 'Date Range', value: `${dateRange.from} to ${dateRange.to}` },
      { label: 'Department', value: deptLabel },
      { label: 'Employee', value: empLabel },
    ];
    if (compare) filters.push({ label: 'Compare Period', value: 'Previous period' });

    const kpis: ReportKpi[] = summary
      ? [
          { label: 'Total Employees', value: summary.totalEmployees },
          { label: 'Present', value: summary.present },
          { label: 'Absent', value: summary.absent },
          { label: 'Late', value: summary.late },
          { label: 'Half Day Leave', value: summary.halfDay },
          { label: 'Full Day Leave', value: summary.fullDayLeave },
          { label: 'Attendance %', value: `${summary.attendancePct}%` },
          { label: 'Working Days', value: summary.workingDays },
        ]
      : [];

    const tables: ReportTable[] = [];
    if (dept && dept.departments.length) {
      tables.push({
        title: 'Department Analytics',
        columns: ['Rank', 'Department', 'Headcount', 'Present', 'Absent', 'Late', 'Working Days', 'Attendance %', 'Absenteeism %', 'Punctuality %'],
        rows: dept.departments.map((d) => [
          d.rank, d.department, d.headcount, d.present, d.absent, d.late, d.workingDays,
          `${d.attendancePct}%`, `${d.absenteeismPct}%`, `${d.punctualityPct}%`,
        ]),
        note: `Company average attendance ${dept.companyAvgAttendancePct}%`,
      });
    }
    if (distribution && distribution.segments.length) {
      tables.push({
        title: 'Status Distribution',
        columns: ['Status', 'Count', 'Percentage'],
        rows: distribution.segments.map((s) => [s.label, s.count, `${s.pct}%`]),
        note: `${distribution.total} total records`,
      });
    }

    // Section 3 — full Employee Attendance Report (every page). Server-paginated,
    // so page through totalPages; matches the on-screen table's sort/search/filters.
    const REQ_PAGE = 500;
    const first = await fetchEmployeeReport({
      ...baseFilters, page: 1, pageSize: REQ_PAGE,
      sort: reportQuery.sort, order: reportQuery.order,
      search: reportQuery.search || undefined,
    });
    const empRows = [...first.rows];
    const effPageSize = first.pagination.pageSize || REQ_PAGE;
    for (let p = 2; p <= first.pagination.totalPages; p++) {
      const next = await fetchEmployeeReport({
        ...baseFilters, page: p, pageSize: effPageSize,
        sort: reportQuery.sort, order: reportQuery.order,
        search: reportQuery.search || undefined,
      });
      empRows.push(...next.rows);
    }
    if (empRows.length) {
      const rows: (string | number)[][] = empRows.map((r) => [
        `${r.name} (${r.employeeCode})`,
        r.department,
        r.workingDays, r.present, r.absent, r.late, r.halfDay, r.fullDayLeave,
        `${r.attendancePct}%`, `${r.absenteeismPct}%`, `${r.punctualityPct}%`,
        r.lopDays, r.payableDays,
        r.perfectAttendance ? 'Perfect' : r.atRisk ? 'At Risk' : '—',
      ]);
      const t = first.totals;
      rows.push([
        `Totals (${t.employees})`, '',
        t.workingDays, t.present, t.absent, t.late, t.halfDay, t.fullDayLeave,
        `${t.attendancePct}%`, `${t.absenteeismPct}%`, `${t.punctualityPct}%`,
        t.lopDays, t.payableDays, '',
      ]);
      tables.push({
        title: 'Employee Attendance Report',
        columns: ['Employee', 'Department', 'Working Days', 'Present', 'Absent', 'Late', 'Half Day', 'Full Leave', 'Attendance %', 'Absent %', 'Punctual %', 'LOP', 'Payable Days', 'Flag'],
        align: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'left'],
        rows,
        note: '*LOP / Payable — Estimated for Payroll Reference',
      });
    }

    return {
      dashboardName: 'Attendance Analytics',
      fileBase: 'Attendance_Analytics',
      generatedBy: user?.name || user?.email || 'HR / Admin',
      filters,
      kpis,
      tables,
    };
  }, [summary, distribution, dept, department, employeeId, employees, dateRange, user, baseFilters, reportQuery, compare]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
        <FilterSelect
          label="Department"
          value={department}
          onChange={(v) => {
            setDepartment(v);
            setEmployeeId('all');
          }}
          options={[{ v: 'all', l: 'All Departments' }, ...departments.map((d) => ({ v: d, l: d }))]}
        />
        <FilterSelect
          label="Employee"
          value={employeeId}
          onChange={setEmployeeId}
          options={[{ v: 'all', l: 'All Employees' }, ...employeeOptions.map((e) => ({ v: String(e.id), l: e.name }))]}
        />
        <label className="flex items-center gap-2 pb-2 text-xs font-medium text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="rounded border-gray-300" />
          Compare vs previous period
        </label>
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <RefreshCw size={14} /> Refresh
        </button>
        <AttendanceExportBar
          filters={baseFilters}
          reportQuery={reportQuery}
          buildPdfReport={summary ? buildPdfReport : undefined}
        />
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/20">
            <X size={22} />
          </div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Failed to load analytics</h3>
          <p className="mt-1 max-w-xs text-xs text-gray-500">{error}</p>
          <button onClick={load} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
            Retry
          </button>
        </div>
      ) : loading && !summary ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {summary && <AnalyticsKpiCards summary={summary} />}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">{trend && <AttendanceTrendChart trend={trend} />}</div>
            <div>{distribution && <StatusDistributionDonut distribution={distribution} />}</div>
          </div>
          {dept && <DepartmentRankingChart data={dept} />}
          <EmployeeReportTable filters={baseFilters} onRowClick={setDrilldownId} onQueryChange={setReportQuery} />
        </>
      )}

      {/* Employee drill-down drawer (opens on report row click) */}
      <EmployeeDrilldownDrawer
        employeeId={drilldownId}
        from={baseFilters.from}
        to={baseFilters.to}
        onClose={() => setDrilldownId(null)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[9rem] rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-gray-700 dark:bg-gray-900"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}
