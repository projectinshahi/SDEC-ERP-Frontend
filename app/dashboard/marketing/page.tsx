'use client';

import { Megaphone, LayoutDashboard, Target, Users, Radio, FileText, Share2, Mail, ListTodo, CalendarDays, PartyPopper, Wallet, BarChart3, FileBarChart } from 'lucide-react';

/**
 * Marketing Dashboard — Phase 0 foundation.
 *
 * The module, its full RBAC permission tree, navigation and route guard are live.
 * This page deliberately shows NO fabricated KPI numbers: the live dashboard (real
 * campaign/lead/spend/ROI data) is wired up in the Analytics/Dashboard phase, once
 * the backing tables and endpoints exist. Until then it maps the sections that roll
 * out per phase, so the module is reachable and correctly permission-gated today.
 */

const SECTIONS: { label: string; icon: typeof LayoutDashboard; phase: string }[] = [
  { label: 'Campaigns', icon: Target, phase: 'Phase 1' },
  { label: 'Marketing Leads', icon: Users, phase: 'Phase 2' },
  { label: 'Lead Sources', icon: Radio, phase: 'Phase 2' },
  { label: 'Tasks', icon: ListTodo, phase: 'Phase 3' },
  { label: 'Calendar', icon: CalendarDays, phase: 'Phase 3' },
  { label: 'Content', icon: FileText, phase: 'Phase 4' },
  { label: 'Social Media', icon: Share2, phase: 'Phase 4' },
  { label: 'Email Marketing', icon: Mail, phase: 'Phase 4' },
  { label: 'Budget & Expenses', icon: Wallet, phase: 'Phase 5' },
  { label: 'Events & Promotions', icon: PartyPopper, phase: 'Phase 6' },
  { label: 'Analytics', icon: BarChart3, phase: 'Phase 7' },
  { label: 'Reports', icon: FileBarChart, phase: 'Phase 7' },
];

export default function MarketingDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
          <Megaphone className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Marketing Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Campaigns, leads, content and analytics — integrated with your existing users, roles, tasks and Sales pipeline.
          </p>
        </div>
      </div>

      {/* Foundation status */}
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/20">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
          <h2 className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">Module foundation is live</h2>
        </div>
        <p className="mt-1 text-sm text-cyan-800/80 dark:text-cyan-300/80">
          Marketing is registered as a top-level ERP module with its full permission tree in Role Management,
          permission-gated navigation and route protection. Build out the sections below to fill this dashboard
          with live data — no numbers are shown until the real backend endpoints exist.
        </p>
      </div>

      {/* Section roadmap */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Sections</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(({ label, icon: Icon, phase }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Coming in {phase}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
