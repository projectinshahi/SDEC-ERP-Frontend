import type { ModuleName, PermissionKey } from '@/lib/permissions/permission.types';
import { groupForModule, type TopModule } from '@/lib/permissions/moduleAccess';

export interface SidebarMenuItem {
  label: string;
  href?: string;
  /** Must match a key in Sidebar's iconMap */
  icon?: 'LayoutDashboard' | 'Users' | 'CheckSquare' | 'ListTodo' | 'ShieldCheck' | 'Briefcase' | 'Bug' | 'Rocket' | 'AlertTriangle' | 'CalendarDays' | 'CalendarClock' | 'Target' | 'TrendingUp' | 'BarChart3' | 'LayoutGrid' | 'Settings' | 'DollarSign' | 'FileText';
  /** Module this sidebar item belongs to. null = always visible (no permission gating). */
  module?: ModuleName | null;
  permission?: PermissionKey | PermissionKey[];
  isPartition?: boolean;
  /**
   * GLOBAL item — appears in EVERY module's sidebar (not filtered to one module
   * group). For cross-cutting workspaces like My Tasks. Its route must also be in
   * SHARED_PREFIXES (moduleAccess.ts) so the layout guard never bounces a user
   * whose primary module differs; visibility still honors `permission`.
   */
  global?: boolean;
  /**
   * When true, `permissionsForPath` matches this item ONLY on an exact pathname
   * (not as a prefix). Needed for "/dashboard": its href is a prefix of every
   * other dashboard route, so without this it would impose its permission on all
   * of them. With it, only the exact "/dashboard" home requires dashboard.view.
   */
  exact?: boolean;
}

const SALES_REPORTS: PermissionKey[] = ['sales.reports.view'];

// HR Attendance Analytics — access model (Phase 1, FINAL — audit decision F1 / Option A).
// Attendance Analytics is intentionally NOT a standalone page or nav item: it is a TAB
// inside the Attendance page (Attendance ├─ Daily └─ Analytics), reached via the existing
// "Attendance" menu item below, which is gated by ['hr.attendance.view','hr.view'].
// `hr.analytics.view` is therefore an ADDITIONAL analytics capability for HR users layered
// on top of Attendance access (it broadens the analytics *API* surface) — NOT a separate
// entry point. This constant is the canonical reference for that permission set.
export const HR_ANALYTICS: PermissionKey[] = ['hr.analytics.view', 'hr.view'];

export const SIDEBAR_ITEMS: SidebarMenuItem[] = [
  {
    // GLOBAL & UNGATED — the standalone My Tasks workspace is a common feature for
    // EVERY authenticated user, shown in every module's sidebar. No permission /
    // role / module gate on the item (module:null + global:true + no permission →
    // isItemVisible returns true for everyone). Task DATA stays permission-scoped:
    // the workspace is self-scoped server-side and chat is member-only.
    label: 'My Tasks',
    href: '/dashboard/my-tasks',
    icon: 'ListTodo',
    module: null,
    global: true,
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    module: 'dashboard',
    permission: 'dashboard.view', // STRICT: hidden/blocked unless explicitly granted
    exact: true, // '/dashboard' is a prefix of every dashboard route — match exactly
  },
  {
    label: 'Projects',
    href: '/dashboard/projects',
    icon: 'Briefcase',
    module: 'project',
    permission: 'project.view',
  },
  {
    label: 'User Management',
    href: '/dashboard/user-management',
    icon: 'Users',
    module: 'user',
    permission: ['user.read', 'role.read'],
  },
  {
    label: 'Boards',
    href: '/dashboard/boards',
    icon: 'CheckSquare',
    module: 'task',
    permission: 'task.read',
  },
  {
    label: 'Bug Tracking',
    href: '/dashboard/bugs',
    icon: 'Bug',
    module: 'bugs',
    permission: 'bugs.read',
  },
  {
    label: 'Meetings',
    href: '/dashboard/meetings',
    icon: 'CalendarDays',
    module: 'meetings',
    permission: 'meetings.read',
  },
  {
    label: 'Tickets',
    href: '/dashboard/blockers',
    icon: 'AlertTriangle',
    module: 'blockers',
    permission: 'blockers.read',
  },
  {
    label: 'Developers',
    href: '/dashboard/developer-performance',
    icon: 'BarChart3',
    module: 'project',
    permission: 'project.developer_performance',
  },
  {
    label: 'Sales Division',
    isPartition: true,
    module: 'sales',
  },
  // Sales Module
  {
    label: 'Sales Overview',
    href: '/dashboard/sales',
    icon: 'LayoutDashboard',
    module: 'sales',
    permission: ['sales.dashboard.view'],
  },
  {
    label: 'My Day (BDE)',
    href: '/dashboard/sales/bde',
    icon: 'LayoutDashboard',
    module: 'sales',
    permission: ['sales.dashboard.view'],
  },
  {
    label: 'Leads',
    href: '/dashboard/sales/leads',
    icon: 'Target',
    module: 'sales',
    permission: ['sales.leads.view'],
  },
  // Lead Pipeline merged into the Leads page as an in-page "Pipeline View"
  // (toggle / ?view=pipeline) — no separate route/menu item.
  {
    label: 'Follow-up Center',
    href: '/dashboard/sales/follow-ups',
    icon: 'CalendarDays',
    module: 'sales',
    permission: ['sales.followups.view'],
  },
  {
    label: 'Lead Analytics',
    href: '/dashboard/sales/analytics',
    icon: 'BarChart3',
    module: 'sales',
    // Dedicated, independent permission — NOT implied by View Leads. Drives the
    // sidebar item, the fromPath page guard and the Overview "Analytics" shortcut.
    permission: ['sales.leads.analytics'],
  },
  {
    label: 'Team',
    href: '/dashboard/sales/team',
    icon: 'Users',
    module: 'sales',
    permission: ['sales.teams.view', 'sales.team.manage'],
  },
  {
    label: 'Deals',
    href: '/dashboard/sales/deals',
    icon: 'TrendingUp',
    module: 'sales',
    permission: ['sales.deals.view'],
  },
  // Deal Pipeline merged into the Deals page as an in-page "Pipeline View"
  // (toggle / ?view=pipeline) — no separate route/menu item. ("Pipeline Views"
  // below is a DIFFERENT feature: saved-view pipeline analytics.)
  {
    label: 'Pipeline Views',
    href: '/dashboard/sales/pipeline',
    icon: 'BarChart3',
    module: 'sales',
    permission: ['sales.pipeline.view'],
  },
  {
    label: 'Sales Tasks',
    href: '/dashboard/sales/tasks',
    icon: 'CheckSquare',
    module: 'sales',
    permission: ['sales.tasks.view'],
  },
  {
    label: 'Team Tasks',
    href: '/dashboard/sales/tasks/team',
    icon: 'CheckSquare',
    module: 'sales',
    permission: ['sales.tasks.team.view', 'sales.team.manage'],
  },
  {
    label: 'Tickets',
    href: '/dashboard/sales/tickets',
    icon: 'AlertTriangle',
    module: 'sales',
    permission: ['sales.tickets.view'],
  },
  {
    label: 'Meetings',
    href: '/dashboard/sales/meetings',
    icon: 'CalendarDays',
    module: 'sales',
    permission: ['sales.meetings.view'],
  },
  {
    label: 'Approvals',
    href: '/dashboard/sales/approvals',
    icon: 'ShieldCheck',
    module: 'sales',
    permission: ['sales.approve'],
  },
  // Team management consolidated into the single "Team" item (above) — its
  // "Teams" tab. The former "Teams" entry (/dashboard/sales/teams) was removed.
  {
    label: 'Targets',
    href: '/dashboard/sales/targets',
    icon: 'Target',
    module: 'sales',
    permission: ['sales.targets.view', 'sales.targets.manage'],
  },
  {
    label: 'Target History',
    href: '/dashboard/sales/targets/history',
    icon: 'Target',
    module: 'sales',
    permission: ['sales.targets.history.view'],
  },
  {
    label: 'Incentives',
    href: '/dashboard/sales/incentives',
    icon: 'TrendingUp',
    module: 'sales',
    permission: ['sales.incentive.manage'],
  },
  {
    label: 'Manager Performance',
    href: '/dashboard/sales/performance/manager',
    icon: 'BarChart3',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Executive Dashboard',
    href: '/dashboard/sales/performance/executive',
    icon: 'BarChart3',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    // UI label is "Contacts"; route + API (/sales/customers) unchanged.
    label: 'Contacts',
    href: '/dashboard/sales/customers',
    icon: 'Users',
    module: 'sales',
    permission: ['sales.contacts.view'],
  },
  {
    label: 'Sales Reports',
    isPartition: true,
    module: 'sales',
  },
  {
    label: 'Team Target Board',
    href: '/dashboard/sales/reports/team-target',
    icon: 'Target',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Pipeline Report',
    href: '/dashboard/sales/reports/pipeline',
    icon: 'TrendingUp',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Win Rate',
    href: '/dashboard/sales/reports/win-rate',
    icon: 'BarChart3',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Lost Deal Analysis',
    href: '/dashboard/sales/reports/lost-deals',
    icon: 'AlertTriangle',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Lead Source Report',
    href: '/dashboard/sales/reports/lead-source',
    icon: 'BarChart3',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Daily Reports',
    href: '/dashboard/sales/reports/daily',
    icon: 'CalendarDays',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Report Scheduler',
    href: '/dashboard/sales/reports/scheduler',
    icon: 'CalendarDays',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Forecast vs Actual',
    href: '/dashboard/sales/reports/forecast',
    icon: 'TrendingUp',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Activity Report',
    href: '/dashboard/sales/reports/activity',
    icon: 'BarChart3',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  {
    label: 'Export Center',
    href: '/dashboard/sales/reports/export-center',
    icon: 'LayoutGrid',
    module: 'sales',
    permission: ['sales.reports.export', 'sales.reports.view'],
  },
  {
    label: 'Executive Analytics',
    href: '/dashboard/sales/reports/executive',
    icon: 'LayoutDashboard',
    module: 'sales',
    permission: SALES_REPORTS,
  },
  
  // HR Module
  {
    label: 'OVERVIEW',
    isPartition: true,
    module: 'hr',
  },
  {
    label: 'HR Dashboard',
    href: '/dashboard/hr',
    icon: 'LayoutDashboard',
    module: 'hr',
    permission: ['hr.dashboard.view', 'hr.view'],
  },
  {
    label: 'WORKFORCE',
    isPartition: true,
    module: 'hr',
  },
  {
    label: 'Employees',
    href: '/dashboard/hr/employees',
    icon: 'Users',
    module: 'hr',
    permission: ['hr.employees.view', 'hr.view'],
  },
  {
    label: 'Attendance',
    href: '/dashboard/hr/attendance',
    icon: 'CalendarDays',
    module: 'hr',
    permission: ['hr.attendance.view', 'hr.view'],
  },
  {
    label: 'Leave',
    href: '/dashboard/hr/leave',
    icon: 'CalendarClock',
    module: 'hr',
    // Independent leave views: HR Admin (hr.leave.view) OR Staff (hr.leave.self).
    permission: ['hr.leave.view', 'hr.leave.self'],
  },

  {
    label: 'HIRING',
    isPartition: true,
    module: 'hr',
  },
  {
    label: 'Recruitment',
    href: '/dashboard/hr/recruitment',
    icon: 'Briefcase',
    module: 'hr',
    permission: ['hr.recruitment.view', 'hr.view'],
  },
  {
    label: 'FINANCE',
    isPartition: true,
    module: 'hr',
  },
  {
    label: 'Payroll',
    href: '/dashboard/hr/payroll',
    icon: 'DollarSign',
    module: 'hr',
    permission: ['hr.payroll.view', 'hr.view'],
  },
  {
    label: 'ANALYTICS',
    isPartition: true,
    module: 'hr',
  },
  {
    label: 'Performance',
    href: '/dashboard/hr/performance',
    icon: 'BarChart3',
    module: 'hr',
    permission: ['hr.performance.view', 'hr.view'],
  },
  {
    label: 'FILES',
    isPartition: true,
    module: 'hr',
  },
  {
    label: 'Documents',
    href: '/dashboard/hr/documents',
    icon: 'FileText',
    module: 'hr',
    permission: ['hr.documents.view', 'hr.view'],
  },
  {
    label: 'SYSTEM',
    isPartition: true,
    module: 'hr',
  },
  {
    label: 'Settings',
    href: '/dashboard/hr/settings',
    icon: 'Settings',
    module: 'hr',
    permission: ['hr.settings.view', 'hr.view'],
  },

  // Finance Module — independent ERP module. Each item is gated on its own
  // View permission OR the coarse `finance.view` (same OR pattern as HR).
  {
    label: 'Finance',
    isPartition: true,
    module: 'finance',
  },
  {
    label: 'Dashboard',
    href: '/dashboard/finance',
    icon: 'LayoutDashboard',
    module: 'finance',
    permission: ['finance.dashboard.view', 'finance.view'],
  },
  {
    label: 'Income',
    href: '/dashboard/finance/income',
    icon: 'TrendingUp',
    module: 'finance',
    permission: ['finance.income.view', 'finance.view'],
  },
  {
    label: 'Expenses',
    href: '/dashboard/finance/expenses',
    icon: 'DollarSign',
    module: 'finance',
    permission: ['finance.expenses.view', 'finance.view'],
  },
  {
    label: 'Transactions',
    href: '/dashboard/finance/transactions',
    icon: 'LayoutGrid',
    module: 'finance',
    permission: ['finance.transactions.view', 'finance.view'],
  },
  {
    label: 'Reports',
    href: '/dashboard/finance/reports',
    icon: 'BarChart3',
    module: 'finance',
    permission: ['finance.reports.view', 'finance.view'],
  },
  {
    label: 'Settings',
    href: '/dashboard/finance/settings',
    icon: 'Settings',
    module: 'finance',
    permission: ['finance.settings.view', 'finance.view'],
  },
];

/** Normalises an item's `permission` field to an array (empty = no specific gate). */
export function itemPermissions(item: SidebarMenuItem): PermissionKey[] {
  if (!item.permission) return [];
  return Array.isArray(item.permission) ? item.permission : [item.permission];
}

/**
 * The permission(s) (ANY grants) that gate a given route, resolved by the
 * longest matching item href so detail pages inherit their list's permission
 * (e.g. /dashboard/sales/leads/123 → the Leads item). Empty array = no specific
 * permission required (module-home or unmapped route).
 */
export function permissionsForPath(pathname: string): PermissionKey[] {
  let best: SidebarMenuItem | null = null;
  let bestLen = -1;
  for (const item of SIDEBAR_ITEMS) {
    if (!item.href || item.isPartition) continue;
    // `exact` items match only their precise pathname (so "/dashboard" doesn't
    // impose its permission on every "/dashboard/*" route); others match as a
    // path prefix so detail pages inherit their list's permission.
    const matches = item.exact
      ? pathname === item.href
      : (pathname === item.href || pathname.startsWith(item.href + '/'));
    if (matches && item.href.length > bestLen) { best = item; bestLen = item.href.length; }
  }
  return best ? itemPermissions(best) : [];
}

/**
 * The href of the first menu item in `module` the user can access — used to land
 * a user on a page they ARE allowed to see when the module's default page is not
 * permitted (e.g. a leads-only sales user → /dashboard/sales/leads). `hasAny` is
 * the caller's permission predicate (SuperAdmin-bypassing).
 */
export function firstAccessibleHref(
  module: TopModule,
  hasAny: (keys: PermissionKey[]) => boolean,
): string | null {
  for (const item of SIDEBAR_ITEMS) {
    if (item.isPartition || !item.href) continue;
    if (groupForModule(item.module) !== module) continue;
    const perms = itemPermissions(item);
    if (perms.length === 0 || hasAny(perms)) return item.href;
  }
  return null;
}
