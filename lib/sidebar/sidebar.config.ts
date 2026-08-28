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
   * Render this GLOBAL item at the TOP of every module's sidebar (immediately below
   * the module's first actionable item / Dashboard) instead of the default bottom.
   * RENDER-ONLY: it does NOT change this array's order, so the landing-page resolver
   * (`firstAccessibleHref`, which walks SIDEBAR_ITEMS in array order) is unaffected —
   * a pinned item never becomes a module's default landing page.
   */
  pinTop?: boolean;
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
// "Attendance" menu item below, which is gated by 'hr.attendance.view'.
// `hr.analytics.view` is therefore an ADDITIONAL analytics capability for HR users layered
// on top of Attendance access (it broadens the analytics *API* surface) — NOT a separate
// entry point. An `hr.view` master holder still satisfies both via the hrGrants bridge.
export const HR_ANALYTICS: PermissionKey[] = ['hr.analytics.view', 'hr.view'];

export const SIDEBAR_ITEMS: SidebarMenuItem[] = [
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
    // Pipeline = the renamed Leads module (opportunities). Route MOVED to /sales/pipeline
    // (old /sales/leads* redirect to here). Backing permission stays sales.leads.view.
    label: 'Pipeline',
    href: '/dashboard/sales/pipeline',
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
    label: 'Opportunity Analytics',
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
  // The Deals module has been retired from the UI (Pipeline is now the single
  // opportunity + revenue surface). Its nav item is removed; historical deal data /
  // backend endpoints remain intact for internal use.
  {
    // Renamed from "Pipeline Views" + route moved to /sales/pipeline/analytics so the
    // new Pipeline module can own /sales/pipeline. Still the deal-based saved-view analytics.
    label: 'Pipeline Analytics',
    href: '/dashboard/sales/pipeline/analytics',
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
    // Companies = normalized CRM accounts (one company → many contacts + pipeline).
    label: 'Companies',
    href: '/dashboard/sales/companies',
    icon: 'Briefcase',
    module: 'sales',
    permission: ['sales.companies.view'],
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
    // Single granular keys (1:1 with the backend checkPermission gate). An
    // hr.view master holder still sees every item via the hrGrants bridge.
    label: 'HR Dashboard',
    href: '/dashboard/hr',
    icon: 'LayoutDashboard',
    module: 'hr',
    permission: 'hr.dashboard.view',
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
    permission: 'hr.employees.view',
  },
  {
    label: 'Attendance',
    href: '/dashboard/hr/attendance',
    icon: 'CalendarDays',
    module: 'hr',
    permission: 'hr.attendance.view',
  },
  {
    label: 'Leave',
    href: '/dashboard/hr/leave',
    icon: 'CalendarClock',
    module: 'hr',
    // Independent leave views: HR Admin (hr.leave.view) OR Staff (hr.leave.self).
    // The one justified multi-key item — a genuinely different actor, not a bridge.
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
    permission: 'hr.recruitment.view',
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
    permission: 'hr.payroll.view',
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
    permission: 'hr.performance.view',
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
    permission: 'hr.documents.view',
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
    permission: 'hr.settings.view',
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
  // ── Marketing ──────────────────────────────────────────────────────────────
  // Phase 0 ships the module + Dashboard; each section's nav item is added as its
  // phase lands (so links never point at a route that doesn't exist yet).
  {
    label: 'OVERVIEW',
    isPartition: true,
    module: 'marketing',
  },
  {
    label: 'Marketing Dashboard',
    href: '/dashboard/marketing',
    icon: 'LayoutDashboard',
    module: 'marketing',
    permission: 'marketing.dashboard.view',
  },
  {
    // GLOBAL & UNGATED — the standalone My Tasks workspace, a common utility for
    // EVERY authenticated user. `pinTop` renders it at the TOP of every module's
    // sidebar (immediately below the module's Dashboard/home) via Layout.tsx. It
    // stays LAST in THIS array on purpose: array order drives `firstAccessibleHref`
    // (the landing page), so keeping it last guarantees opening a module lands on
    // that module's Dashboard, never My Tasks. module:null + global:true + no
    // permission → visible to everyone; task DATA stays permission-scoped.
    label: 'My Tasks',
    href: '/dashboard/my-tasks',
    icon: 'ListTodo',
    module: null,
    global: true,
    pinTop: true,
  },
  {
    // GLOBAL & UNGATED — every authenticated employee's OWN attendance (read-only).
    // Same pattern as My Tasks: module:null + global:true + NO permission, so it shows
    // in EVERY module's sidebar for Sales / Development / HR / Marketing / etc. alike —
    // no role or department restriction. The DATA is strictly self-scoped by the
    // backend (session → own employee → own records). Route is registered in
    // SHARED_PREFIXES so the module-isolation guard never bounces a non-HR user.
    label: 'My Attendance',
    href: '/dashboard/my-attendance',
    icon: 'CalendarDays',
    module: null,
    global: true,
    pinTop: true,
  },
  {
    // Notice — a STANDALONE top-level module, peer of My Tasks (NOT nested in it or
    // any other module). Same `global` pattern so it shows at the bottom of every
    // module's sidebar; unlike My Tasks it IS permission-gated (`notice.view`), so
    // isItemVisible hides it from users who lack the permission (SuperAdmin bypasses).
    // Route is registered in SHARED_PREFIXES (moduleAccess.ts) so the module-isolation
    // guard never bounces a user whose primary module differs.
    label: 'Notice',
    href: '/dashboard/notice',
    icon: 'FileText',
    module: null,
    global: true,
    permission: 'notice.view',
  },
];

/**
 * Dev-time invariant: no two menu items in a sidebar registry may share an href. A
 * duplicated array entry (e.g. a bad merge that pastes the same item twice — the exact
 * cause of the "two Notice items" bug) renders the SAME nav item more than once. This
 * SURFACES it loudly during development/build; it is a no-op in production and never
 * removes or hides an item, so permissions and functionality are completely untouched.
 * Accepts any array of href-bearing items (SIDEBAR_ITEMS and the master layout's array).
 */
export function assertNoDuplicateHrefs(
  items: ReadonlyArray<{ href?: string; label?: string }>,
  source: string,
): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const it of items) {
    if (!it.href) continue;
    if (seen.has(it.href)) dups.add(it.href);
    seen.add(it.href);
  }
  if (dups.size) {
    // eslint-disable-next-line no-console
    console.error(
      `[sidebar] ${source} contains duplicate menu href(s): ${[...dups].join(', ')} — ` +
      'a nav item is registered more than once. Remove the duplicate array entry.',
    );
  }
}

// Guard this registry at module load (dev only).
assertNoDuplicateHrefs(SIDEBAR_ITEMS, 'SIDEBAR_ITEMS');

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
    // GLOBAL utilities (My Tasks, Notice) are cross-cutting — they belong to no
    // module's landing sequence, so they must NEVER be a module's default landing
    // page. Without this, a `module:null` global (which groupForModule maps into
    // 'development') could be returned for a development-access role that has no
    // development PAGE, dropping the user onto My Tasks instead of a dashboard.
    if (item.global) continue;
    if (groupForModule(item.module) !== module) continue;
    const perms = itemPermissions(item);
    if (perms.length === 0 || hasAny(perms)) return item.href;
  }
  return null;
}
