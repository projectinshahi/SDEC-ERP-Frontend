'use client';

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import {
  Users, Clock, CalendarOff, Briefcase, UserPlus, MessageSquare,
  DollarSign, Search, SlidersHorizontal, ChevronDown,
  Star, TrendingUp, BarChart2, Calendar, Filter, MoreHorizontal
} from "lucide-react";
import { ExportPdfButton } from "@/components/master/ExportPdfButton";
import type { DashboardReport } from "@/lib/pdf/dashboardPdf";
import { useAuth } from "@/lib/hooks/useAuth";

// ─── Data ────────────────────────────────────────────────────────────────────

const stats = [
  { label: "TOTAL EMPLOYEES", value: "48", icon: Users, color: "#6366f1" },
  { label: "TRAVEL TIME", value: "3", icon: Clock, color: "#8b5cf6" },
  { label: "ON LEAVE", value: "6", icon: CalendarOff, color: "#f59e0b" },
  { label: "JOB OPENINGS", value: "4", icon: Briefcase, color: "#10b981" },
  { label: "NEW JOINERS", value: "3", icon: UserPlus, color: "#3b82f6" },
  { label: "PENDING INTERVIEWS", value: "14", icon: MessageSquare, color: "#ec4899" },
  { label: "TOTAL PAYROLL", value: "₹18.45L", icon: DollarSign, color: "#f59e0b" },
];

const employees = [
  { id: 1, name: "Shahi Rahman", initials: "SR", dept: "Management", role: "Manager", joined: "Jan 20, 2026", salary: "₹1,50,000", status: "Active", rating: 4, color: "#6366f1" },
  { id: 2, name: "Arjun Singh", initials: "AS", dept: "Development", role: "Developer", joined: "Feb 25, 2025", salary: "₹80,000", status: "Active", rating: 4.5, color: "#3b82f6" },
  { id: 3, name: "Ehtesham Ansari", initials: "EA", dept: "QA", role: "QA Engineer", joined: "Feb 28, 2025", salary: "₹60,000", status: "Active", rating: 3.5, color: "#10b981" },
  { id: 4, name: "Nilesh Kumar", initials: "NK", dept: "Design", role: "Designer", joined: "Mar 10, 2025", salary: "₹50,000", status: "Active", rating: 4, color: "#f59e0b" },
  { id: 5, name: "Maya Mehra", initials: "MM", dept: "Development", role: "Developer", joined: "Apr 05, 2025", salary: "₹75,000", status: "Active", rating: 3, color: "#ef4444" },
  { id: 6, name: "Priya Kumar", initials: "PK", dept: "HR", role: "HR Executive", joined: "May 12, 2025", salary: "₹45,000", status: "On Leave", rating: 3, color: "#ec4899" },
  { id: 7, name: "Liam Torres", initials: "LT", dept: "Sales", role: "Sales Manager", joined: "Jun 01, 2025", salary: "₹90,000", status: "Active", rating: 5, color: "#8b5cf6" },
  { id: 8, name: "Dev Patel", initials: "DP", dept: "QA", role: "QA Lead", joined: "Jun 15, 2025", salary: "₹65,000", status: "Active", rating: 4, color: "#06b6d4" },
  { id: 9, name: "Founder", initials: "F", dept: "Management", role: "Super Admin", joined: "Jan 01, 2025", salary: "—", status: "Active", rating: 5, color: "#1a1d23" },
  { id: 10, name: "Noah Chen", initials: "NC", dept: "Sales", role: "Account Exec", joined: "Jul 10, 2025", salary: "₹70,000", status: "Active", rating: 4, color: "#14b8a6" },
];

const attendanceData = [
  { label: "Present", value: 38, color: "#22c55e" },
  { label: "Absent", value: 4, color: "#ef4444" },
  { label: "Late", value: 3, color: "#f59e0b" },
  { label: "Leave", value: 3, color: "#6366f1" },
];

const leaveRequests = [
  { name: "Priya Kumar", initials: "PK", color: "#ec4899", type: "Annual Leave", dates: "Jul 1 – Jul 5", status: "Pending" },
  { name: "Maya Mehra", initials: "MM", color: "#ef4444", type: "Annual Leave", dates: "Jul 1 – Jul 5", status: "Pending" },
  { name: "Noah Chen", initials: "NC", color: "#14b8a6", type: "Casual Leave", dates: "Jul 8 – Jul 9", status: "Approved" },
];

const birthdays = [
  { name: "Arjun Singh", initials: "AS", color: "#3b82f6", date: "Jun 22" },
  { name: "Nilesh Kumar", initials: "NK", color: "#f59e0b", date: "Jul 4" },
  { name: "Liam Torres", initials: "LT", color: "#8b5cf6", date: "Jul 11" },
];

const recentJoiners = [
  { name: "Noah Chen", initials: "NC", color: "#14b8a6", role: "Account Exec", date: "Jul 10, 2025" },
  { name: "Dev Patel", initials: "DP", color: "#06b6d4", role: "QA Lead", date: "Jun 15, 2025" },
  { name: "Liam Torres", initials: "LT", color: "#8b5cf6", role: "Sales Manager", date: "Jun 01, 2025" },
];

const recruitmentData = [
  { stage: "Applied", count: 60 },
  { stage: "Screened", count: 34 },
  { stage: "Interview", count: 22 },
  { stage: "Offer", count: 12 },
  { stage: "Hired", count: 6 },
];

const payrollData = [
  { month: "Jan", amount: 12 },
  { month: "Feb", amount: 13 },
  { month: "Mar", amount: 13.5 },
  { month: "Apr", amount: 15 },
  { month: "May", amount: 16 },
  { month: "Jun", amount: 18.45 },
];

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

function DonutChart() {
  const total = attendanceData.reduce((s, d) => s + d.value, 0);
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
      {attendanceData.map((d) => {
        const dash = (d.value / total) * circumference;
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
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-base font-bold" fill="#1a1d23" fontSize="18" fontWeight="700">38</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="10">Present</text>
    </svg>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function HRPage() {
  const [activeTab, setActiveTab] = useState("Employees");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const { user } = useAuth();

  // PDF report — built from the dashboard's in-memory data. Charts (Recruitment
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
        rows: employees.map((e) => [e.id, e.name, e.dept, e.role, e.joined, e.salary, e.status, `${e.rating}/5`]),
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
                <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">10</span>
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
                  {employees.map((emp, idx) => (
                    <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${idx % 2 === 0 ? "" : ""}`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{emp.id}</td>
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
                <span className="text-xs text-gray-400">48 total</span>
              </div>
              <div className="flex items-center gap-4">
                <DonutChart />
                <div className="flex flex-col gap-2">
                  {attendanceData.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-500">{d.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(d.value / 48) * 100}%`, backgroundColor: d.color }} />
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
                {leaveRequests.map((lr) => (
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
                {birthdays.map((b) => (
                  <div key={b.name} className="flex items-center gap-2.5">
                    <Avatar initials={b.initials} color={b.color} size="sm" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[#1a1d23]">{b.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600">{b.date}</span>
                  </div>
                ))}
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
                <p className="text-xs text-gray-400 mt-0.5">Active openings: 4 roles</p>
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
              {recentJoiners.map((j) => (
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
                    domain={[8, 22]}
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
              <span className="text-xs text-gray-400">Jun 2026 Total</span>
              <span className="text-sm font-bold text-[#2563eb]">₹18.45 L</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
