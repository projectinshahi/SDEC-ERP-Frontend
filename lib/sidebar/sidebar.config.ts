/**
 * Sidebar Configuration
 *
 * Permission-aware sidebar menu items.
 * Each item optionally specifies a `module` which determines
 * whether the item is visible based on the user's permissions.
 * Items with `module: null` (e.g. Dashboard) are always visible.
 *
 * The `icon` values must match keys in the Sidebar component's `iconMap`.
 */

import type { ModuleName } from '@/lib/permissions/permission.types';

export interface SidebarMenuItem {
  label: string;
  href?: string;
  /** Must match a key in Sidebar's iconMap */
  icon?: 'LayoutDashboard' | 'Users' | 'CheckSquare' | 'ShieldCheck' | 'Briefcase' | 'Bug' | 'Rocket' | 'AlertTriangle' | 'CalendarDays' | 'Target' | 'TrendingUp' | 'BarChart3' | 'LayoutGrid';
  /** Module this sidebar item belongs to. null = always visible (no permission gating). */
  module?: ModuleName | null;
  isPartition?: boolean;
}

export const SIDEBAR_ITEMS: SidebarMenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    module: null, // Always visible
  },
  {
    label: 'Projects',
    href: '/dashboard/projects',
    icon: 'Briefcase',
    module: 'project',
  },
  {
    label: 'User Management',
    href: '/dashboard/user-management',
    icon: 'Users',
    module: 'user',
  },
  {
    label: 'Boards',
    href: '/dashboard/boards',
    icon: 'CheckSquare',
    module: 'task',
  },
  // {
  //   label: 'Role Management',
  //   href: '/dashboard/role-management',
  //   icon: 'ShieldCheck',
  //   module: 'role',
  // },
  {
    label: 'Bug Tracking',
    href: '/dashboard/bugs',
    icon: 'Bug',
    module: 'bugs',
  },
  // {
  //   label: 'Sprint Tracking',
  //   href: '/dashboard/sprints',
  //   icon: 'Rocket',
  //   module: 'sprints',
  // },
  // New Meetings item
  {
    label: 'Meetings',
    href: '/dashboard/meetings',
    icon: 'CalendarDays',
    module: 'meetings',
  },
  {
    label: 'Tickets',
    href: '/dashboard/blockers',
    icon: 'AlertTriangle',
    module: 'blockers',
  },
  {
    label: 'Developer Performance',
    href: '/dashboard/developer-performance',
    icon: 'BarChart3',
    module: 'project',
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
  },
  {
    label: 'My Day (BDE)',
    href: '/dashboard/sales/bde',
    icon: 'LayoutDashboard',
    module: 'sales',
  },
  {
    label: 'Leads',
    href: '/dashboard/sales/leads',
    icon: 'Target',
    module: 'sales',
  },
  // Lead Pipeline merged into the Leads page as an in-page "Pipeline View"
  // (toggle / ?view=pipeline) — no separate route/menu item.
  {
    label: 'Follow-up Center',
    href: '/dashboard/sales/follow-ups',
    icon: 'CalendarDays',
    module: 'sales',
  },
  {
    label: 'Lead Analytics',
    href: '/dashboard/sales/analytics',
    icon: 'BarChart3',
    module: 'sales',
  },
  {
    label: 'Team',
    href: '/dashboard/sales/team',
    icon: 'Users',
    module: 'sales',
  },
  {
    label: 'Deals',
    href: '/dashboard/sales/deals',
    icon: 'TrendingUp',
    module: 'sales',
  },
  // Deal Pipeline merged into the Deals page as an in-page "Pipeline View"
  // (toggle / ?view=pipeline) — no separate route/menu item. ("Pipeline Views"
  // below is a DIFFERENT feature: saved-view pipeline analytics.)
  {
    label: 'Pipeline Views',
    href: '/dashboard/sales/pipeline',
    icon: 'BarChart3',
    module: 'sales',
  },
  {
    label: 'Sales Tasks',
    href: '/dashboard/sales/tasks',
    icon: 'CheckSquare',
    module: 'sales',
  },
  {
    label: 'Team Tasks',
    href: '/dashboard/sales/tasks/team',
    icon: 'CheckSquare',
    module: 'sales',
  },
  {
    label: 'Approvals',
    href: '/dashboard/sales/approvals',
    icon: 'ShieldCheck',
    module: 'sales',
  },
  // Team management consolidated into the single "Team" item (above) — its
  // "Teams" tab. The former "Teams" entry (/dashboard/sales/teams) was removed.
  {
    label: 'Target History',
    href: '/dashboard/sales/targets/history',
    icon: 'Target',
    module: 'sales',
  },
  {
    label: 'Incentives',
    href: '/dashboard/sales/incentives',
    icon: 'TrendingUp',
    module: 'sales',
  },
  {
    label: 'Manager Performance',
    href: '/dashboard/sales/performance/manager',
    icon: 'BarChart3',
    module: 'sales',
  },
  {
    label: 'Executive Dashboard',
    href: '/dashboard/sales/performance/executive',
    icon: 'BarChart3',
    module: 'sales',
  },
  {
    // UI label is "Contacts"; route + API (/sales/customers) unchanged.
    label: 'Contacts',
    href: '/dashboard/sales/customers',
    icon: 'Users',
    module: 'sales',
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
  },
  {
    label: 'Pipeline Report',
    href: '/dashboard/sales/reports/pipeline',
    icon: 'TrendingUp',
    module: 'sales',
  },
  {
    label: 'Win Rate',
    href: '/dashboard/sales/reports/win-rate',
    icon: 'BarChart3',
    module: 'sales',
  },
  {
    label: 'Lost Deal Analysis',
    href: '/dashboard/sales/reports/lost-deals',
    icon: 'AlertTriangle',
    module: 'sales',
  },
  {
    label: 'Lead Source Report',
    href: '/dashboard/sales/reports/lead-source',
    icon: 'BarChart3',
    module: 'sales',
  },
  {
    label: 'Daily Reports',
    href: '/dashboard/sales/reports/daily',
    icon: 'CalendarDays',
    module: 'sales',
  },
  {
    label: 'Report Scheduler',
    href: '/dashboard/sales/reports/scheduler',
    icon: 'CalendarDays',
    module: 'sales',
  },
  {
    label: 'Forecast vs Actual',
    href: '/dashboard/sales/reports/forecast',
    icon: 'TrendingUp',
    module: 'sales',
  },
  {
    label: 'Activity Report',
    href: '/dashboard/sales/reports/activity',
    icon: 'BarChart3',
    module: 'sales',
  },
  {
    label: 'Export Center',
    href: '/dashboard/sales/reports/export-center',
    icon: 'LayoutGrid',
    module: 'sales',
  },
  {
    label: 'Executive Analytics',
    href: '/dashboard/sales/reports/executive',
    icon: 'LayoutDashboard',
    module: 'sales',
  },
];
