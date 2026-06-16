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
  {
    label: 'Lead Pipeline',
    href: '/dashboard/sales/leads/pipeline',
    icon: 'TrendingUp',
    module: 'sales',
  },
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
  {
    label: 'Deal Pipeline',
    href: '/dashboard/sales/deals/pipeline',
    icon: 'LayoutGrid',
    module: 'sales',
  },
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
    label: 'Approvals',
    href: '/dashboard/sales/approvals',
    icon: 'ShieldCheck',
    module: 'sales',
  },
  {
    label: 'Customers',
    href: '/dashboard/sales/customers',
    icon: 'Users',
    module: 'sales',
  },
];
