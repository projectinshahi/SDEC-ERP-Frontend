'use client';

import { ReactNode, Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar, type SidebarItem } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  SIDEBAR_ITEMS, itemPermissions, permissionsForPath, firstAccessibleHref,
  type SidebarMenuItem,
} from '@/lib/sidebar/sidebar.config';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getModuleAccess, moduleForPath, groupForModule, isSharedPath, resolveModule, MODULE_LABELS,
} from '@/lib/permissions/moduleAccess';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout for every /dashboard route. Enforces MODULE ISOLATION: the sidebar
 * shows only the menu items of the module the user is currently inside
 * (Development / Sales / User Management), and a user who lacks access to the
 * current module is redirected away — navigation, routes and menus never overlap.
 *
 * The shell reads the `?module=` context via useSearchParams, which Next.js requires
 * to sit under a Suspense boundary or static prerendering throws. DashboardLayout
 * therefore wraps the shell in its OWN Suspense (below) — self-contained, so it works
 * wherever it is mounted, and that single boundary also covers every child page's own
 * useSearchParams. See `DashboardShell` for the actual implementation.
 */
const DashboardShell = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { canAccessModule, hasAnyPermission, isSuperAdmin } = usePermissions();
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const access = useMemo(() => getModuleAccess(user), [user]);
  const shared = isSharedPath(pathname);
  // On shared routes (My Tasks, Notice, profile) the module context travels in the
  // `?module=` param set by the link that navigated here, so the sidebar stays in the
  // module the user came FROM (Sales stays Sales) — falling back to their primary
  // module only when no valid/accessible param is present. Survives refresh and
  // back/forward because the context lives in the URL, not in transient state.
  const moduleParam = searchParams.get('module');
  const currentModule = useMemo(
    () => resolveModule(pathname, moduleParam, access),
    [pathname, moduleParam, access],
  );

  // Route guard (UI layer; APIs are independently permission-checked) — purely
  // permission-driven, no module-specific special-casing:
  //   1. module isolation — user must have access to the module that owns the route, AND
  //   2. STRICT per-page permission — user must hold the page's required permission.
  const moduleOfPath = moduleForPath(pathname);
  const requiredPerms = permissionsForPath(pathname);
  const permitted = requiredPerms.length === 0 || isSuperAdmin || hasAnyPermission(requiredPerms);
  const allowed = shared || (access[moduleOfPath] && permitted);

  // Leave-only SELF-SERVICE employee: holds hr.leave.self but NOT hr.view /
  // hr.dashboard.view. Their HR sidebar is trimmed to just "Leave" (applied
  // per-item in isItemVisible). Memoised once and reused — never recomputed inline.
  const isSelfService = useMemo(
    () => hasAnyPermission(['hr.leave.self']) && !hasAnyPermission(['hr.view', 'hr.dashboard.view']),
    [hasAnyPermission],
  );

  useEffect(() => {
    if (!user) return;
    if (allowed) return;
    // If the user CAN access this module but not this specific page, land them on
    // the first page they ARE allowed to see; otherwise send them to /modules.
    if (access[moduleOfPath]) {
      const target = firstAccessibleHref(moduleOfPath, hasAnyPermission);
      router.replace(target ?? '/modules');
    } else {
      router.replace('/modules');
    }
  }, [user, allowed, access, moduleOfPath, hasAnyPermission, router]);

  // A single sidebar item is visible when: correct module + module access + the
  // item's specific permission (SuperAdmin/Admin bypass via usePermissions).
  const isItemVisible = useCallback((item: SidebarMenuItem): boolean => {
    // Self-service employees see ONLY their own HR self-service items (Leave +
    // My Attendance) — and only inside the HR module, so this restriction can never
    // blank out another module's sidebar (defence-in-depth; getModuleAccess already
    // confines them to HR). Each item still honours its own permission below.
    if (isSelfService && currentModule === 'hr') {
      // A leave-only self-service employee sees ONLY their self-service items: the HR
      // Leave page (guaranteed by hr.leave.self) and the global, ungated My Attendance
      // tab (own attendance, self-scoped by the backend).
      return item.href === '/dashboard/hr/leave' || item.href === '/dashboard/my-attendance';
    }
    // Global items (e.g. My Tasks) skip module-access but STILL honor their own
    // permission — so the item shows in every module, gated on that permission.
    if (item.global) {
      const perms = itemPermissions(item);
      return perms.length === 0 || hasAnyPermission(perms);
    }
    if (item.module === null || item.module === undefined) return true;
    if (!canAccessModule(item.module)) return false;
    const perms = itemPermissions(item);
    return perms.length === 0 || hasAnyPermission(perms);
  }, [canAccessModule, hasAnyPermission, isSelfService, currentModule]);

  /**
   * Sidebar items = items of the CURRENT module only, permission-filtered. A
   * partition (section header) is shown only when at least one of its child
   * items (up to the next partition) is visible.
   */
  const visibleMenuItems = useMemo((): SidebarItem[] => {
    // Current module's items only (partition-grouped). GLOBAL items (My Tasks,
    // Notice) are placed separately below.
    const inModule = SIDEBAR_ITEMS.filter((i) => !i.global && groupForModule(i.module) === currentModule);
    const result: SidebarMenuItem[] = [];
    for (let i = 0; i < inModule.length; i++) {
      const item = inModule[i];
      if (item.isPartition) {
        let hasVisibleChild = false;
        for (let j = i + 1; j < inModule.length && !inModule[j].isPartition; j++) {
          if (isItemVisible(inModule[j])) { hasVisibleChild = true; break; }
        }
        if (hasVisibleChild) result.push(item);
      } else if (isItemVisible(item)) {
        result.push(item);
      }
    }
    // GLOBAL items, split by placement. `pinTop` globals (My Tasks) render right
    // BELOW the module's first actionable item (its Dashboard/home) — a standardized
    // TOP position across every module — while other globals (Notice) stay at the
    // BOTTOM. This changes ONLY the render order: SIDEBAR_ITEMS array order (which
    // drives firstAccessibleHref / the landing page) is deliberately untouched, so
    // opening a module still lands on its Dashboard, never My Tasks.
    const globals = SIDEBAR_ITEMS.filter((i) => i.global && isItemVisible(i));
    const topGlobals = globals.filter((g) => g.pinTop);
    const bottomGlobals = globals.filter((g) => !g.pinTop);
    if (topGlobals.length) {
      const firstActionable = result.findIndex((i) => !i.isPartition && !!i.href);
      const insertAt = firstActionable === -1 ? result.length : firstActionable + 1;
      result.splice(insertAt, 0, ...topGlobals);
    }
    result.push(...bottomGlobals);
    return result as SidebarItem[];
  }, [currentModule, isItemVisible]);

  return (
    <ErrorBoundary>
      <AuthGuard>
        {user && !allowed ? (
          <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 text-center">
            <div>
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">!</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Access restricted</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You don’t have access to this module. Redirecting…</p>
            </div>
          </div>
        ) : (
          <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
            <Sidebar
              items={visibleMenuItems}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              moduleLabel={MODULE_LABELS[currentModule]}
              currentModule={currentModule}
              showProjectPicker={currentModule === 'development'}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

              <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
        )}
      </AuthGuard>
    </ErrorBoundary>
  );
};

/** Full-height neutral placeholder shown only while the shell resolves its search
 *  params during prerender/streaming (never on client navigation). Matches the app
 *  background so there is no flash before the real sidebar/navbar hydrate. */
const ShellFallback = () => <div className="h-screen bg-gray-50 dark:bg-gray-950" />;

/**
 * Public shell wrapper — keeps the useSearchParams-driven shell under a Suspense
 * boundary so `next build` can prerender every route that mounts it without the
 * "useSearchParams() should be wrapped in a suspense boundary" error.
 */
export const DashboardLayout = ({ children }: LayoutProps) => (
  <Suspense fallback={<ShellFallback />}>
    <DashboardShell>{children}</DashboardShell>
  </Suspense>
);
