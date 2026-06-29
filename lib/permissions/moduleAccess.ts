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
 * DATA-DRIVEN module registry — the single source of truth for which modules
 * exist and which permission prefix(es) make each one visible. The Modules page
 * and the route-level `getModuleAccess` BOTH derive from this list, so adding a
 * future module (HR, Finance, CRM, Inventory, …) is a one-line registry change
 * with NO hardcoded visibility logic anywhere else.
 *
 * Visibility rule (see `isModuleVisible`): a module is shown iff the user holds
 * AT LEAST ONE permission whose key starts with one of `prefixes`. SuperAdmin
 * sees every module; the global-admin bypass covers the live core modules.
 */
export interface AppModuleDef {
  /** Stable key. Core modules reuse the TopModule names; future ones add new keys. */
  key: TopModule | 'hr' | 'finance' | 'crm' | 'inventory';
  title: string;
  description: string;
  /** lucide-react icon name, resolved to a component on the Modules page. */
  icon: string;
  accent: 'indigo' | 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'cyan';
  /** Permission key prefixes; holding ANY permission under one makes it visible. */
  prefixes: string[];
  /** Master Dashboard: visible to SuperAdmin only, never via prefixes. */
  superAdminOnly?: boolean;
  /** The route-guard TopModule + landing fallback (omitted for not-yet-built modules). */
  topModule?: TopModule;
  fallbackHref?: string;
  /** Built but not yet routed → card shows "Coming soon" and is non-navigable. */
  future?: boolean;
}

export const APP_MODULES: AppModuleDef[] = [
  {
    key: 'master', title: 'Master Dashboard', icon: 'ShieldCheck', accent: 'indigo',
    description: 'Enterprise-wide analytics, oversight, reporting & admin controls.',
    prefixes: [], superAdminOnly: true, topModule: 'master', fallbackHref: '/master-dashboard',
  },
  {
    key: 'sales', title: 'Sales', icon: 'Briefcase', accent: 'emerald',
    description: 'Leads, pipeline, deals & CRM.',
    prefixes: ['sales.'], topModule: 'sales', fallbackHref: '/dashboard/sales',
  },
  {
    key: 'development', title: 'Development', icon: 'Code2', accent: 'blue',
    description: 'Projects, boards, tasks & sprints.',
    prefixes: ['dashboard.', 'project.', 'task.', 'sprints.', 'bugs.', 'blockers.', 'meetings.', 'tickets.'],
    topModule: 'development', fallbackHref: '/dashboard',
  },
  {
    key: 'user', title: 'User Management', icon: 'Users', accent: 'violet',
    description: 'Users, roles & permissions.',
    prefixes: ['user.', 'role.'], topModule: 'user', fallbackHref: '/dashboard/user-management',
  },
  // Future modules — visible once a role is granted any of their permissions.
{
  key: 'hr',
  title: 'HR',
  icon: 'UserCog',
  accent: 'amber',
  description: 'Employees, leave & attendance.',
  prefixes: ['hr.'],
  topModule: 'hr',
  fallbackHref: '/dashboard/hr',
},
  {
    key: 'finance', title: 'Finance', icon: 'Wallet', accent: 'rose',
    description: 'Invoices, billing & expenses.',
    prefixes: ['finance.'], future: true,
  },
];

/**
 * Is a single registry module visible to this user?
 *   • SuperAdmin            → every module.
 *   • superAdminOnly module → only SuperAdmin.
 *   • global Admin          → every LIVE core module (mirrors backend isGlobalAdmin;
 *                             future modules still require an explicit permission).
 *   • everyone else         → holds ≥1 permission under the module's prefixes.
 */
export function isModuleVisible(user: ModuleAccessUser | null | undefined, m: AppModuleDef): boolean {
  const r = normalizeRole(user?.roleName) || normalizeRole(user?.role);
  const isSuper = r === 'superadmin';
  if (isSuper) return true;
  if (m.superAdminOnly) return false;
  if ((r === 'admin') && !m.future) return true; // global admin bypass for live core modules
  const perms = user?.permissions ?? [];
  return m.prefixes.some((pre) => perms.some((p) => p.startsWith(pre)));
}

/** Every module (core + future) the user may see — used by the Modules entry page. */
export function visibleModules(user: ModuleAccessUser | null | undefined): AppModuleDef[] {
  return APP_MODULES.filter((m) => isModuleVisible(user, m));
}

/**
 * The four top-level route-guard booleans, DERIVED from the registry so the
 * route guards and the Modules page can never drift. Behaviour is identical to
 * the previous hand-written version (SuperAdmin → master; global admin → all
 * core; otherwise permission-prefix driven).
 */
export function getModuleAccess(user: ModuleAccessUser | null | undefined): Record<TopModule, boolean> {
  const result = {} as Record<TopModule, boolean>;
  for (const m of APP_MODULES) {
    if (m.key in result) continue; // skip duplicate keys (e.g. 'hr' appears in TopModule union)
    result[m.key as TopModule] = isModuleVisible(user, m);
  }
  // Ensure every TopModule key exists even if no registry entry matched
  for (const k of ['master', 'development', 'sales', 'user', 'hr'] as TopModule[]) {
    if (!(k in result)) result[k] = false;
  }
  return result;
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
