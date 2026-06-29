import type { ModuleName, PermissionKey } from '@/lib/permissions/permission.types';
import { groupForModule, type TopModule } from '@/lib/permissions/moduleAccess';

export interface SidebarMenuItem {
  label: string;
  href?: string;
  /** Must match a key in Sidebar's iconMap */
  icon?: 'LayoutDashboard' | 'Users' | 'CheckSquare' | 'ShieldCheck' | 'Briefcase' | 'Bug' | 'Rocket' | 'AlertTriangle' | 'CalendarDays' | 'Target' | 'TrendingUp' | 'BarChart3' | 'LayoutGrid' | 'Settings' | 'DollarSign' | 'FileText';
  /** Module this sidebar item belongs to. null = always visible (no permission gating). */
  module?: ModuleName | null;
  /** Permission(s) that gate this item/route. ANY grants. Omit = no specific gate (module-home). */
  permission?: PermissionKey | PermissionKey[];
  isPartition?: boolean;
}

const SALES_REPORTS: PermissionKey[] = ['sales.reports.view', 'sales.view'];

export const SIDEBAR_ITEMS: SidebarMenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    module: null, // Always visible within the Development module
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
    permission: ['sales.dashboard.view', 'sales.view'],
  },
  {
    label: 'My Day (BDE)',
    href: '/dashboard/sales/bde',
    icon: 'LayoutDashboard',
    module: 'sales',
    permission: ['sales.dashboard.view', 'sales.view'],
  },
  {
    label: 'Leads',
    href: '/dashboard/sales/leads',
    icon: 'Target',
    module: 'sales',
    permission: ['sales.leads.view', 'sales.view'],
  },
  // Lead Pipeline merged into the Leads page as an in-page "Pipeline View"
  // (toggle / ?view=pipeline) — no separate route/menu item.
  {
    label: 'Follow-up Center',
    href: '/dashboard/sales/follow-ups',
    icon: 'CalendarDays',
    module: 'sales',
    permission: ['sales.followups.view', 'sales.view'],
  },
  {
    label: 'Lead Analytics',
    href: '/dashboard/sales/analytics',
    icon: 'BarChart3',
    module: 'sales',
    permission: ['sales.dashboard.analytics', 'sales.reports.view', 'sales.view'],
  },
  {
    label: 'Team',
    href: '/dashboard/sales/team',
    icon: 'Users',
    module: 'sales',
    permission: ['sales.teams.view', 'sales.team.manage', 'sales.view'],
  },
  {
    label: 'Deals',
    href: '/dashboard/sales/deals',
    icon: 'TrendingUp',
    module: 'sales',
    permission: ['sales.deals.view', 'sales.view'],
  },
  // Deal Pipeline merged into the Deals page as an in-page "Pipeline View"
  // (toggle / ?view=pipeline) — no separate route/menu item. ("Pipeline Views"
  // below is a DIFFERENT feature: saved-view pipeline analytics.)
  {
    label: 'Pipeline Views',
    href: '/dashboard/sales/pipeline',
    icon: 'BarChart3',
    module: 'sales',
    permission: ['sales.pipeline.view', 'sales.view'],
  },
  {
    label: 'Sales Tasks',
    href: '/dashboard/sales/tasks',
    icon: 'CheckSquare',
    module: 'sales',
    permission: ['sales.view'],
  },
  {
    label: 'Team Tasks',
    href: '/dashboard/sales/tasks/team',
    icon: 'CheckSquare',
    module: 'sales',
    permission: ['sales.team.manage', 'sales.view'],
  },
  {
    label: 'Approvals',
    href: '/dashboard/sales/approvals',
    icon: 'ShieldCheck',
    module: 'sales',
    permission: ['sales.approve', 'sales.view'],
  },
  // Team management consolidated into the single "Team" item (above) — its
  // "Teams" tab. The former "Teams" entry (/dashboard/sales/teams) was removed.
  {
    label: 'Target History',
    href: '/dashboard/sales/targets/history',
    icon: 'Target',
    module: 'sales',
    permission: ['sales.targets.manage', 'sales.view'],
  },
  {
    label: 'Incentives',
    href: '/dashboard/sales/incentives',
    icon: 'TrendingUp',
    module: 'sales',
    permission: ['sales.incentive.manage', 'sales.view'],
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
    permission: ['sales.contacts.view', 'sales.view'],
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
    permission: ['sales.reports.export', 'sales.reports.view', 'sales.view'],
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
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (item.href.length > bestLen) { best = item; bestLen = item.href.length; }
    }
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
