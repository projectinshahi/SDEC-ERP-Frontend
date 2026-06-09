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
  href: string;
  /** Must match a key in Sidebar's iconMap */
  icon: 'LayoutDashboard' | 'Users' | 'CheckSquare' | 'ShieldCheck' | 'Briefcase' | 'Bug' | 'Rocket' | 'AlertTriangle' | 'CalendarDays' | 'Target' | 'TrendingUp';
  /** Module this sidebar item belongs to. null = always visible (no permission gating). */
  module: ModuleName | null;
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
  // Sales Module
  // {
  //   label: 'Leads',
  //   href: '/dashboard/sales/leads',
  //   icon: 'Target',
  //   module: 'sales',
  // },
  // {
  //   label: 'Deals',
  //   href: '/dashboard/sales/deals',
  //   icon: 'TrendingUp',
  //   module: 'sales',
  // },
  // {
  //   label: 'Customers',
  //   href: '/dashboard/sales/customers',
  //   icon: 'Users',
  //   module: 'sales',
  // },
];
