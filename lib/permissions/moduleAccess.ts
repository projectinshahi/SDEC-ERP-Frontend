/**
 * Top-level module isolation.
 *
 * The ERP is split into separate "products": Development, Sales, User Management
 * and (SuperAdmin only) the Master Dashboard. This module is the single source of
 * truth for:
 *   • which top-level modules a user may access (role + RBAC permissions), and
 *   • which top-level module a route / sidebar item belongs to.
 *
 * Used by the role-based entry screen (/modules), the dashboard layout guard, and
 * the module-aware sidebar so navigation, routes and menus never overlap.
 */

import type { ModuleName } from './permission.types';

export type TopModule = 'development' | 'sales' | 'user' | 'master' | 'hr';

export interface ModuleAccessUser {
  roleName?: string;
  role?: string;
  permissions?: string[];
}

export const MODULE_LABELS: Record<TopModule, string> = {
  development: 'Development',
  sales: 'Sales',
  user: 'User Management',
  master: 'Master Dashboard',
  hr: 'HR',
};

/** Lower-cases and strips spaces/underscores/hyphens so "Super Admin" === "superadmin". */
export function normalizeRole(value?: string | null): string {
  return (value || '').toLowerCase().replace(/[\s_-]/g, '');
}

/**
 * Which top-level modules the user may access — STRICTLY permission-driven.
 *
 * A module card/menu is visible ONLY when the user actually holds at least one
 * permission in that module's area. Role-NAME shortcuts (e.g. "role is called
 * Developer/Sales") were removed: a role with no permissions sees nothing, no
 * matter what it is named. The single exception is the global admin bypass —
 * SuperAdmin (master + everything) and Admin — which mirrors the backend
 * `isGlobalAdmin` so the UI and API agree and the primary admin is never locked
 * out. (Want ONLY SuperAdmin to bypass? Drop `r === 'admin'` from `isAdmin`.)
 */
export function getModuleAccess(user: ModuleAccessUser | null | undefined): Record<TopModule, boolean> {
  const r = normalizeRole(user?.roleName) || normalizeRole(user?.role);
  const perms = user?.permissions ?? [];
  const hasAny = (...prefixes: string[]) => prefixes.some((pre) => perms.some((p) => p.startsWith(pre)));

  const isSuper = r === 'superadmin';
  const isAdmin = r === 'admin' || isSuper; // global admin (matches backend isGlobalAdmin)

  return {
    master: isSuper,
    development: isAdmin || hasAny('project.', 'task.', 'sprints.', 'bugs.', 'blockers.', 'meetings.', 'tickets.'),
    sales: isAdmin || hasAny('sales.'),
    user: isAdmin || hasAny('user.', 'role.'),
    hr: isAdmin || r === 'hradmin',
  };
}

/** The first module (in priority order) the user can access — used as a landing fallback. */
export function primaryModule(access: Record<TopModule, boolean>): TopModule | null {
  return (['master', 'development', 'sales', 'user', 'hr'] as TopModule[]).find((m) => access[m]) ?? null;
}

/** Routes that are shared across modules and must NOT be module-gated. */
const SHARED_PREFIXES = ['/dashboard/profile', '/change-password'];
export function isSharedPath(pathname: string): boolean {
  return SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** The top-level module that owns a given route. */
export function moduleForPath(pathname: string): TopModule {
  if (pathname.startsWith('/master-dashboard')) return 'master';
  if (pathname.startsWith('/dashboard/user-management')) return 'user';
  if (pathname.startsWith('/dashboard/sales')) return 'sales';
  if (pathname.startsWith('/dashboard/hr')) return 'hr';
  return 'development';
}

/** The top-level module a sidebar item belongs to (for isolation). */
export function groupForModule(module?: ModuleName | null): TopModule {
  if (module === 'sales') return 'sales';
  if (module === 'user' || module === 'role') return 'user';
  if (module === 'hr') return 'hr';
  return 'development';
}
