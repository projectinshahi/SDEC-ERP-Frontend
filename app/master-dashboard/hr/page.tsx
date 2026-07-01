'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import {
  Users, Clock, CalendarOff, Briefcase, UserPlus, MessageSquare,
  DollarSign, Search, SlidersHorizontal, ChevronDown,
  Star, TrendingUp, BarChart2, Calendar, Filter, MoreHorizontal, Inbox
} from "lucide-react";
import { ExportPdfButton } from "@/components/master/ExportPdfButton";
import type { DashboardReport } from "@/lib/pdf/dashboardPdf";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMasterResource } from "@/components/master/MasterKit";
import {
  fetchMasterHR,
  fetchMasterHRAttendance, fetchMasterHRLeave, fetchMasterHRRecruitment,
  fetchMasterHRPayroll, fetchMasterHRPerformance,
  type MasterHRAttendanceData, type MasterHRLeaveData, type MasterHRRecruitmentData,
  type MasterHRPayrollData, type MasterHRPerformanceData,
} from "@/lib/api/masterModules";

// ─── Live-data helpers ─────────────────────────────────────────────────────────
// The dashboard reads 100% from /master-dashboard/hr (single source of truth).
// These helpers only format/derive presentation values — no dummy data.

const AVATAR_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#8b5cf6", "#06b6d4", "#14b8a6",
];

/** Stable avatar colour derived from a name/seed (deterministic across renders). */
function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/** "Jan 20, 2026" */
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

/** "Jul 1" */
function fmtDay(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Jul 1 – Jul 5" */
function fmtRange(a?: string | null, b?: string | null): string {
  const s = fmtDay(a), e = fmtDay(b);
  return s && e ? `${s} – ${e}` : s || e || "—";
}

/** Rupees → "₹18.45L" */
function fmtLakh(n: number): string {
  return `₹${(n / 100000).toFixed(2)}L`;
}

/** Rupees → "₹1,50,000" (Indian grouping); "—" for empty/zero. */
function fmtSalary(n?: number | null): string {
  if (n == null || n === 0) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

/** "active" → "Active", "on_leave" → "On Leave". */
function humanizeStatus(s?: string): string {
  if (!s) return "—";
  if (s.toLowerCase() === "active") return "Active";
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Time-of-day from a timestamp/time value → "10:30 AM"; "—" if unparseable. */
function fmtTime(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (!isNaN(d.getTime()) && String(v).includes("T")) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  const m = String(v).match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!m) return "—";
  return m[3] ? `${m[1]}:${m[2]} ${m[3].toUpperCase()}` : `${m[1]}:${m[2]}`;
}

/** Semantic colour for a status pill (positive/negative/pending/neutral). */
function statusTone(s: string): { text: string; bg: string; dot: string } {
  const k = s.toLowerCase();
  if (["present", "approved", "paid", "active", "hired", "complete", "selected", "offer"].some((x) => k.includes(x)))
    return { text: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" };
  if (["absent", "rejected", "lost", "cancelled", "canceled"].some((x) => k.includes(x)))
    return { text: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500" };
  if (["late", "pending", "leave", "interview", "screening", "review", "applied"].some((x) => k.includes(x)))
    return { text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" };
  return { text: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };
}

/** Status pill matching StatusBadge's shape, tone-mapped for varied HR statuses. */
function Pill({ status }: { status: string }) {
  const t = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${t.text} ${t.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {status}
    </span>
  );
}

/* ─── HR tab data hook (server-side filtered/searched) + shared primitives ────── */

/** Debounce a value (used for search inputs so we don't refetch per keystroke). */
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Loads a tab's data via `load`, refetching whenever `deps` (its filters/search)
 * change — server-side filtering — and on window focus (live sync). Returns
 * empty/loading state on error (never dummy); logs failures for debugging.
 */
function useHRTab<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  const run = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    loadRef.current()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) { setError(true); console.error("[Master HR] tab load failed:", e); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState !== "hidden") run(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [run]);
  return { data, loading, error };
}

function TabKpi({ label, value, tone = "#1a1d23" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: tone }}>{value}</p>
    </div>
  );
}

function TabSelect({ value, onChange, options, ariaLabel }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg hover:bg-gray-50 outline-none text-gray-700"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TabSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
      <Search className="w-4 h-4 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm outline-none w-44 placeholder:text-gray-400 bg-transparent"
        placeholder={placeholder}
      />
    </div>
  );
}

function TabDate({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <input
      type="date"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg outline-none text-gray-600"
    />
  );
}

/** Table shell matching the Employees table style, with loading/empty states. */
function TableShell({ headers, children, empty, isEmpty, loading }: {
  headers: string[]; children: React.ReactNode; empty: string; isEmpty: boolean; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : isEmpty ? (
              <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-gray-400">
                <div className="flex flex-col items-center gap-2"><Inbox className="w-6 h-6 text-gray-300" />{empty}</div>
              </td></tr>
            ) : children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab panels (each: KPIs + filters/search + chart/table, live + server-side) ─ */

const ATT_STATUS_OPTS = [
  { value: "all", label: "All Status" },
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "leave", label: "On Leave" },
  { value: "absent", label: "Absent" },
];

function AttendancePanel({ departments }: { departments: string[] }) {
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, loading } = useHRTab<MasterHRAttendanceData>(
    () => fetchMasterHRAttendance({ department, status, from, to, q }),
    [department, status, from, to, q],
  );
  const summary = data?.summary ?? { present: 0, late: 0, leave: 0, absent: 0, total: 0 };
  const records = data?.records ?? [];
  const donut = [
    { label: "Present", value: summary.present, color: "#22c55e" },
    { label: "Absent", value: summary.absent, color: "#ef4444" },
    { label: "Late", value: summary.late, color: "#f59e0b" },
    { label: "Leave", value: summary.leave, color: "#6366f1" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TabKpi label="Present" value={summary.present} tone="#22c55e" />
        <TabKpi label="Absent" value={summary.absent} tone="#ef4444" />
        <TabKpi label="Late" value={summary.late} tone="#f59e0b" />
        <TabKpi label="On Leave" value={summary.leave} tone="#6366f1" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TabSelect ariaLabel="Department" value={department} onChange={setDepartment}
          options={[{ value: "all", label: "All Departments" }, ...departments.map((d) => ({ value: d, label: d }))]} />
        <TabSelect ariaLabel="Status" value={status} onChange={setStatus} options={ATT_STATUS_OPTS} />
        <TabDate ariaLabel="From date" value={from} onChange={setFrom} />
        <TabDate ariaLabel="To date" value={to} onChange={setTo} />
        <div className="ml-auto"><TabSearch value={search} onChange={setSearch} placeholder="Search employee…" /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Attendance Summary</span>
            <span className="text-xs text-gray-400">{summary.total} total</span>
          </div>
          <div className="flex items-center gap-4">
            <DonutChart segments={donut} center={summary.present} total={summary.total} />
            <div className="flex flex-col gap-2 flex-1">
              {donut.map((d) => (
                <div key={d.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-gray-500">{d.label}</span>
                  <span className="text-xs font-semibold text-gray-700 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <TableShell headers={["DATE", "EMPLOYEE", "DEPARTMENT", "CHECK-IN", "CHECK-OUT", "HOURS", "STATUS"]}
          empty="No attendance records" isEmpty={records.length === 0} loading={loading}>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.date)}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar initials={initialsOf(r.name)} color={colorFor(r.name)} /><span className="font-medium text-[#1a1d23] whitespace-nowrap">{r.name}</span></div></td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.department}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtTime(r.checkIn)}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtTime(r.checkOut)}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.workHours != null ? `${r.workHours}h` : "—"}</td>
              <td className="px-4 py-3"><Pill status={humanizeStatus(r.status)} /></td>
            </tr>
          ))}
        </TableShell>
      </div>
    </div>
  );
}

const LEAVE_STATUS_OPTS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function LeavePanel() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, loading } = useHRTab<MasterHRLeaveData>(() => fetchMasterHRLeave({ status, q }), [status, q]);
  const counts = data?.counts ?? { pending: 0, approved: 0, rejected: 0, total: 0 };
  const records = data?.records ?? [];
  const donut = [
    { label: "Approved", value: counts.approved, color: "#22c55e" },
    { label: "Pending", value: counts.pending, color: "#f59e0b" },
    { label: "Rejected", value: counts.rejected, color: "#ef4444" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TabKpi label="Pending" value={counts.pending} tone="#f59e0b" />
        <TabKpi label="Approved" value={counts.approved} tone="#22c55e" />
        <TabKpi label="Rejected" value={counts.rejected} tone="#ef4444" />
        <TabKpi label="Total" value={counts.total} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TabSelect ariaLabel="Status" value={status} onChange={setStatus} options={LEAVE_STATUS_OPTS} />
        <div className="ml-auto"><TabSearch value={search} onChange={setSearch} placeholder="Search name or type…" /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Leave Breakdown</span>
            <span className="text-xs text-gray-400">{counts.total} total</span>
          </div>
          <div className="flex items-center gap-4">
            <DonutChart segments={donut} center={counts.total} total={counts.total} centerLabel="Total" />
            <div className="flex flex-col gap-2 flex-1">
              {donut.map((d) => (
                <div key={d.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-gray-500">{d.label}</span>
                  <span className="text-xs font-semibold text-gray-700 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <TableShell headers={["EMPLOYEE", "DEPARTMENT", "TYPE", "DATES", "DAYS", "STATUS"]}
          empty="No leave requests" isEmpty={records.length === 0} loading={loading}>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar initials={initialsOf(r.name)} color={colorFor(r.name)} /><span className="font-medium text-[#1a1d23] whitespace-nowrap">{r.name}</span></div></td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.department}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.leaveType}</td>
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtRange(r.startDate, r.endDate)}</td>
              <td className="px-4 py-3 text-gray-600">{r.days ?? "—"}</td>
              <td className="px-4 py-3"><Pill status={humanizeStatus(r.status)} /></td>
            </tr>
          ))}
        </TableShell>
      </div>
    </div>
  );
}

const REC_STAGE_OPTS = [
  { value: "all", label: "All Stages" },
  { value: "Applied", label: "Applied" },
  { value: "Screening", label: "Screening" },
  { value: "Interview", label: "Interview" },
  { value: "Offer", label: "Offer" },
  { value: "Hired", label: "Hired" },
  { value: "Rejected", label: "Rejected" },
];

function RecruitmentPanel() {
  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, loading } = useHRTab<MasterHRRecruitmentData>(() => fetchMasterHRRecruitment({ stage, q }), [stage, q]);
  const counts = data?.counts ?? { openPositions: 0, applicants: 0, interview: 0, selected: 0, rejected: 0 };
  const pipeline = data?.pipeline ?? [];
  const records = data?.records ?? [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <TabKpi label="Open Positions" value={counts.openPositions} tone="#10b981" />
        <TabKpi label="Applicants" value={counts.applicants} tone="#2563eb" />
        <TabKpi label="Interview" value={counts.interview} tone="#f59e0b" />
        <TabKpi label="Selected" value={counts.selected} tone="#22c55e" />
        <TabKpi label="Rejected" value={counts.rejected} tone="#ef4444" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TabSelect ariaLabel="Stage" value={stage} onChange={setStage} options={REC_STAGE_OPTS} />
        <div className="ml-auto"><TabSearch value={search} onChange={setSearch} placeholder="Search candidate or role…" /></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold">Recruitment Pipeline</p>
          <TrendingUp className="w-4 h-4 text-gray-400" />
        </div>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipeline} barSize={22}>
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {pipeline.map((_, i) => (<Cell key={i} fill={i === 0 ? "#2563eb" : i === 1 ? "#3b82f6" : i === 2 ? "#60a5fa" : i === 3 ? "#93c5fd" : "#bfdbfe"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <TableShell headers={["CANDIDATE", "POSITION", "STAGE", "EXPERIENCE", "EXPECTED CTC", "INTERVIEW"]}
        empty="No candidates" isEmpty={records.length === 0} loading={loading}>
        {records.map((r) => (
          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
            <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar initials={initialsOf(r.fullName)} color={colorFor(r.fullName)} /><span className="font-medium text-[#1a1d23] whitespace-nowrap">{r.fullName}</span></div></td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.position}</td>
            <td className="px-4 py-3"><Pill status={r.stage} /></td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.experience || "—"}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.expectedCtc ? fmtSalary(r.expectedCtc) : "—"}</td>
            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.interviewDate)}</td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

const PAY_STATUS_OPTS = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
];

function PayrollPanel() {
  const [status, setStatus] = useState("all");
  const [month, setMonth] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const mq = useDebounced(month);
  const { data, loading } = useHRTab<MasterHRPayrollData>(() => fetchMasterHRPayroll({ status, month: mq, q }), [status, mq, q]);
  const summary = data?.summary ?? { paidCount: 0, pendingCount: 0, totalPaid: 0, totalPending: 0, total: 0 };
  const trend = data?.trend ?? [];
  const records = data?.records ?? [];
  const payMax = Math.max(1, Math.ceil(Math.max(1, ...trend.map((p) => p.amount)) * 1.15));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TabKpi label="Paid" value={summary.paidCount} tone="#22c55e" />
        <TabKpi label="Pending" value={summary.pendingCount} tone="#f59e0b" />
        <TabKpi label="Total Paid" value={fmtSalary(summary.totalPaid)} tone="#2563eb" />
        <TabKpi label="Total Pending" value={fmtSalary(summary.totalPending)} tone="#ef4444" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TabSelect ariaLabel="Status" value={status} onChange={setStatus} options={PAY_STATUS_OPTS} />
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input value={month} onChange={(e) => setMonth(e.target.value)} className="text-sm outline-none w-32 placeholder:text-gray-400 bg-transparent" placeholder="Month…" />
        </div>
        <div className="ml-auto"><TabSearch value={search} onChange={setSearch} placeholder="Search employee…" /></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sm font-semibold">Payroll Overview</p>
            <p className="text-xs text-gray-400 mt-0.5">Monthly trend</p>
          </div>
          <BarChart2 className="w-4 h-4 text-gray-400" />
        </div>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `₹${v}L`} domain={[0, payMax]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                formatter={(v: number | string | readonly (number | string)[] | undefined) => [`₹${v ?? 0}L`, "Payroll"]} />
              <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <TableShell headers={["EMPLOYEE", "DESIGNATION", "MONTH", "BASIC", "BONUS", "DEDUCTION", "NET", "STATUS"]}
        empty="No payroll records" isEmpty={records.length === 0} loading={loading}>
        {records.map((r) => (
          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
            <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar initials={initialsOf(r.name)} color={colorFor(r.name)} /><span className="font-medium text-[#1a1d23] whitespace-nowrap">{r.name}</span></div></td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.designation}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.month}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtSalary(r.basicSalary)}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtSalary(r.bonus)}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtSalary(r.deduction)}</td>
            <td className="px-4 py-3 font-medium whitespace-nowrap">{fmtSalary(r.netSalary)}</td>
            <td className="px-4 py-3"><Pill status={humanizeStatus(r.status)} /></td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

function PerformancePanel({ departments }: { departments: string[] }) {
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, loading } = useHRTab<MasterHRPerformanceData>(() => fetchMasterHRPerformance({ department, q }), [department, q]);
  const stats = data?.stats ?? { avgRating: 0, totalAppraisals: 0, completed: 0, pending: 0, ratedEmployees: 0 };
  const top = data?.topPerformers ?? [];
  const dept = data?.deptPerformance ?? [];
  const records = data?.records ?? [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TabKpi label="Avg Rating" value={stats.avgRating || "—"} tone="#6366f1" />
        <TabKpi label="Rated Employees" value={stats.ratedEmployees} tone="#2563eb" />
        <TabKpi label="Completed" value={stats.completed} tone="#22c55e" />
        <TabKpi label="Pending" value={stats.pending} tone="#f59e0b" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TabSelect ariaLabel="Department" value={department} onChange={setDepartment}
          options={[{ value: "all", label: "All Departments" }, ...departments.map((d) => ({ value: d, label: d }))]} />
        <div className="ml-auto"><TabSearch value={search} onChange={setSearch} placeholder="Search name or dept…" /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold">Department Performance</p>
            <BarChart2 className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dept} barSize={22}>
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} domain={[0, 5]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="avgRating" radius={[4, 4, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Top Performers</span>
            <Star className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {top.length === 0 ? <p className="text-xs text-gray-400">No ratings yet</p> : top.map((t) => (
              <div key={t.name} className="flex items-center gap-2.5">
                <Avatar initials={initialsOf(t.name)} color={colorFor(t.name)} size="sm" />
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-[#1a1d23] truncate">{t.name}</p><p className="text-[11px] text-gray-400">{t.department}</p></div>
                <StarRating rating={t.rating} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <TableShell headers={["EMPLOYEE", "DEPARTMENT", "DESIGNATION", "CYCLE", "STATUS", "RATING"]}
        empty="No appraisals" isEmpty={records.length === 0} loading={loading}>
        {records.map((r) => (
          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
            <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar initials={initialsOf(r.name)} color={colorFor(r.name)} /><span className="font-medium text-[#1a1d23] whitespace-nowrap">{r.name}</span></div></td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.department}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.designation}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.cycleTitle}</td>
            <td className="px-4 py-3"><Pill status={humanizeStatus(r.status)} /></td>
            <td className="px-4 py-3"><StarRating rating={r.rating} /></td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

const tabs = ["Employees", "Attendance", "Leaves", "Recruitment", "Payroll", "Performance"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, color, size = "sm" }: { initials: string; color: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : i - 0.5 <= rating ? "fill-amber-400/50 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "Active";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
      {status}
    </span>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ segments, center, total, centerLabel = "Present" }: {
  segments: { label: string; value: number; color: string }[];
  center: number;
  total: number;
  centerLabel?: string;
}) {
  const sum = total > 0 ? total : segments.reduce((s, d) => s + d.value, 0);
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
      {sum > 0 && segments.map((d) => {
        const dash = (d.value / sum) * circumference;
        const gap = circumference - dash;
        const el = (
          <circle
            key={d.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-base font-bold" fill="#1a1d23" fontSize="18" fontWeight="700">{center}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="10">{centerLabel}</text>
    </svg>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function HRPage() {
  const [activeTab, setActiveTab] = useState("Employees");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const { user } = useAuth();

  // LIVE org-wide HR data (single source of truth). Refetches on mount; the
  // focus/visibility listener below keeps it fresh with no manual refresh.
  const { data, status, errorMsg, refresh } = useMasterResource(fetchMasterHR);

  useEffect(() => {
    if (status === "error" && errorMsg) console.error("[Master HR] load failed:", errorMsg);
  }, [status, errorMsg]);

  // Keep the latest `refresh` in a ref so listeners subscribe once (the hook
  // returns a fresh `refresh` identity each render — depending on it directly
  // would needlessly re-subscribe on every render).
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState !== "hidden") refreshRef.current(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // ── Derive presentation data from the live payload (empty/0 while loading or
  // on error — never dummy). Layout is identical regardless of data state. ──
  const hr = data;

  // Department options for the tab filters (from the loaded overview employees).
  const departments = useMemo(
    () => Array.from(new Set((hr?.employees ?? []).map((e) => e.department).filter((d): d is string => !!d && d !== "—"))).sort(),
    [hr],
  );

  const stats = [
    { label: "TOTAL EMPLOYEES", value: String(hr?.stats.totalEmployees ?? 0), icon: Users, color: "#6366f1" },
    { label: "TRAVEL TIME", value: String(hr?.stats.lateToday ?? 0), icon: Clock, color: "#8b5cf6" },
    { label: "ON LEAVE", value: String(hr?.stats.onLeave ?? 0), icon: CalendarOff, color: "#f59e0b" },
    { label: "JOB OPENINGS", value: String(hr?.stats.openRoles ?? 0), icon: Briefcase, color: "#10b981" },
    { label: "NEW JOINERS", value: String(hr?.stats.newJoiners ?? 0), icon: UserPlus, color: "#3b82f6" },
    { label: "PENDING INTERVIEWS", value: String(hr?.stats.pendingInterviews ?? 0), icon: MessageSquare, color: "#ec4899" },
    { label: "TOTAL PAYROLL", value: fmtLakh(hr?.stats.payrollMonthTotal ?? 0), icon: DollarSign, color: "#f59e0b" },
  ];

  const employees = (hr?.employees ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    initials: initialsOf(e.name),
    color: colorFor(e.name || String(e.id)),
    dept: e.department,
    role: e.designation,
    joined: fmtDate(e.joinDate),
    salary: fmtSalary(e.salary),
    status: humanizeStatus(e.status),
    rating: e.rating,
  }));

  const attendanceData = [
    { label: "Present", value: hr?.attendance.present ?? 0, color: "#22c55e" },
    { label: "Absent", value: hr?.attendance.absent ?? 0, color: "#ef4444" },
    { label: "Late", value: hr?.attendance.late ?? 0, color: "#f59e0b" },
    { label: "Leave", value: hr?.attendance.leave ?? 0, color: "#6366f1" },
  ];
  const attendanceTotal = hr?.attendance.total ?? 0;
  const presentCount = hr?.attendance.present ?? 0;

  const leaveRequests = (hr?.leaveRequests ?? []).map((l) => ({
    name: l.name,
    initials: initialsOf(l.name),
    color: colorFor(l.name),
    type: l.leaveType,
    dates: fmtRange(l.startDate, l.endDate),
    status: humanizeStatus(l.status),
  }));

  const recentJoiners = (hr?.recentJoiners ?? []).map((j) => ({
    name: j.name,
    initials: initialsOf(j.name),
    color: colorFor(j.name),
    role: j.designation,
    date: fmtDate(j.joinDate),
  }));

  const recruitmentData = hr?.recruitmentPipeline ?? [];
  const openRoles = hr?.stats.openRoles ?? 0;

  const payrollData = hr?.payroll.trend ?? [];
  const payrollLabel = hr?.payroll.currentMonthLabel ?? "";
  const payrollTotal = hr?.payroll.currentMonthTotal ?? 0;
  // Y-axis scales to the live values (a fixed domain would hide real amounts).
  const payDomainMax = Math.max(1, Math.ceil(Math.max(1, ...payrollData.map((p) => p.amount)) * 1.15));

  // PDF report — built from the live, already-loaded HR data. Charts (Recruitment
  // Pipeline, Payroll Overview) are auto-captured; the custom attendance donut
  // is exported as a table.
  const buildReport = (): DashboardReport => ({
    dashboardName: "HR Dashboard",
    fileBase: "HR_Dashboard",
    generatedBy: user?.name || user?.email || "Founder / Admin",
    kpis: stats.map((s) => ({ label: s.label, value: s.value })),
    tables: [
      {
        title: `Employees (${employees.length})`,
        columns: ["No.", "Name", "Department", "Role", "Joined", "Salary", "Status", "Rating"],
        rows: employees.map((e, i) => [i + 1, e.name, e.dept, e.role, e.joined, e.salary, e.status, `${e.rating}/5`]),
      },
      {
        title: "Today's Attendance",
        columns: ["Status", "Count"],
        rows: attendanceData.map((a) => [a.label, a.value]),
      },
      {
        title: "Leave Requests",
        columns: ["Employee", "Type", "Dates", "Status"],
        rows: leaveRequests.map((l) => [l.name, l.type, l.dates, l.status]),
      },
      {
        title: "Recruitment Pipeline",
        columns: ["Stage", "Candidates"],
        rows: recruitmentData.map((r) => [r.stage, r.count]),
      },
      {
        title: "Recent Joiners",
        columns: ["Name", "Role", "Joined"],
        rows: recentJoiners.map((j) => [j.name, j.role, j.date]),
      },
      {
        title: "Payroll Overview (₹ Lakh)",
        columns: ["Month", "Amount (₹L)"],
        rows: payrollData.map((p) => [p.month, p.amount]),
      },
    ],
  });

  return (
    <div className="min-h-screen bg-[#f1f4f8] font-[Inter,sans-serif] text-[#1a1d23]">
      <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1d23]">HR Module</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your workforce, attendance, payroll and more — one place.</p>
          </div>
          <div className="flex gap-2">
            <ExportPdfButton build={buildReport} />
            <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-[#2563eb] text-white rounded-lg hover:bg-blue-700 transition-colors">
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-tight">{s.label}</p>
                  <p className="text-xl font-bold text-[#1a1d23] mt-1">{s.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: s.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab
                  ? "text-[#2563eb] border-[#2563eb]"
                  : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Employees" && (
          <>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg hover:bg-gray-50">
              {deptFilter} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg hover:bg-gray-50">
              {statusFilter} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <div className="ml-auto flex gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                className="text-sm outline-none w-44 placeholder:text-gray-400 bg-transparent"
                placeholder="Search employees..."
              />
            </div>
            <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-[#2563eb] text-white rounded-lg hover:bg-blue-700">
              <Search className="w-4 h-4" /> Search
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

          {/* Left: Employee Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Employees</span>
                <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{employees.length}</span>
              </div>
              <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["NO.", "NAME", "DEPARTMENT", "ROLE", "JOINED", "SALARY", "STATUS", "RATING"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No employees found</td>
                    </tr>
                  ) : employees.map((emp, idx) => (
                    <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${idx % 2 === 0 ? "" : ""}`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={emp.initials} color={emp.color} />
                          <span className="font-medium text-[#1a1d23] whitespace-nowrap">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.dept}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.role}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{emp.joined}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{emp.salary}</td>
                      <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                      <td className="px-4 py-3"><StarRating rating={emp.rating} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* Today's Attendance */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Today&apos;s Attendance</span>
                <span className="text-xs text-gray-400">{attendanceTotal} total</span>
              </div>
              <div className="flex items-center gap-4">
                <DonutChart segments={attendanceData} center={presentCount} total={attendanceTotal} />
                <div className="flex flex-col gap-2">
                  {attendanceData.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-500">{d.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(d.value / (attendanceTotal || 1)) * 100}%`, backgroundColor: d.color }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-4 text-right">{d.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leave Requests */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Leave Requests</span>
                <button className="text-xs text-blue-600 font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {leaveRequests.length === 0 ? (
                  <p className="text-xs text-gray-400">No leave requests</p>
                ) : leaveRequests.map((lr) => (
                  <div key={lr.name + lr.dates} className="flex items-center gap-2.5">
                    <Avatar initials={lr.initials} color={lr.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1a1d23] truncate">{lr.name}</p>
                      <p className="text-[11px] text-gray-400">{lr.type} · {lr.dates}</p>
                    </div>
                    <span className={`text-[11px] font-semibold ${lr.status === "Approved" ? "text-emerald-600" : "text-amber-600"}`}>
                      {lr.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Birthdays */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Upcoming Birthdays</span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-3">
                <p className="text-xs text-gray-400">No upcoming birthdays</p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Recruitment Pipeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-semibold">Recruitment Pipeline</p>
                <p className="text-xs text-gray-400 mt-0.5">Active openings: {openRoles} roles</p>
              </div>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recruitmentData} barSize={22}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    cursor={{ fill: "#f1f5f9" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {recruitmentData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#2563eb" : i === 1 ? "#3b82f6" : i === 2 ? "#60a5fa" : i === 3 ? "#93c5fd" : "#bfdbfe"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Joiners */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Recent Joiners</span>
              <button className="text-xs text-blue-600 font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {recentJoiners.length === 0 ? (
                <p className="text-xs text-gray-400">No recent joiners</p>
              ) : recentJoiners.map((j) => (
                <div key={j.name} className="flex items-center gap-3">
                  <Avatar initials={j.initials} color={j.color} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1d23]">{j.name}</p>
                    <p className="text-xs text-gray-400">{j.role}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {j.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payroll Overview */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-semibold">Payroll Overview</p>
                <p className="text-xs text-gray-400 mt-0.5">Monthly trend</p>
              </div>
              <BarChart2 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={payrollData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(v) => `₹${v}L`}
                    domain={[0, payDomainMax]}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    formatter={(v: number | string | readonly (number | string)[] | undefined) => [`₹${v ?? 0}L`, "Payroll"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">{payrollLabel} Total</span>
              <span className="text-sm font-bold text-[#2563eb]">₹{(payrollTotal / 100000).toFixed(2)} L</span>
            </div>
          </div>

        </div>
          </>
        )}

        {/* Functional live tabs (server-side filtered + searched) */}
        {activeTab === "Attendance" && <AttendancePanel departments={departments} />}
        {activeTab === "Leaves" && <LeavePanel />}
        {activeTab === "Recruitment" && <RecruitmentPanel />}
        {activeTab === "Payroll" && <PayrollPanel />}
        {activeTab === "Performance" && <PerformancePanel departments={departments} />}
      </div>
    </div>
  );
}
