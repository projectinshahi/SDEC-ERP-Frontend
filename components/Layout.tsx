'use client';

import { ReactNode, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  getModuleAccess, moduleForPath, groupForModule, isSharedPath, MODULE_LABELS, type TopModule,
} from '@/lib/permissions/moduleAccess';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout for every /dashboard route. Enforces MODULE ISOLATION: the sidebar
 * shows only the menu items of the module the user is currently inside
 * (Development / Sales / User Management), and a user who lacks access to the
 * current module is redirected away — navigation, routes and menus never overlap.
 */
export const DashboardLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { canAccessModule, hasAnyPermission, isSuperAdmin } = usePermissions();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const access = useMemo(() => getModuleAccess(user), [user]);
  const shared = isSharedPath(pathname);
  const moduleOfPath = moduleForPath(pathname);

  // Remember the last REAL (non-shared) module the user was in, so a GLOBAL/shared
  // page (My Tasks, Profile) KEEPS that module's sidebar instead of resetting.
  // Never 'master' — its menu lives in the separate Master Dashboard layout, so
  // choosing it here would leave THIS sidebar with only global items (the bug where
  // a Founder's whole module menu vanished on /dashboard/my-tasks). The ref persists
  // because app/dashboard/layout.tsx keeps this layout mounted across navigations.
  const lastModuleRef = useRef<TopModule>('development');
  useEffect(() => {
    if (!shared && moduleOfPath !== 'master') lastModuleRef.current = moduleOfPath;
  }, [shared, moduleOfPath]);

  // On a shared/global route: keep the module the user came from (if it's a
  // menu-bearing module they can access); else fall back to their first non-master
  // module, then development. On a normal route: the module that owns the path.
  const currentModule = useMemo<TopModule>(() => {
    if (!shared) return moduleOfPath;
    const DASH_MODULES: TopModule[] = ['development', 'sales', 'user', 'hr', 'finance'];
    const last = lastModuleRef.current;
    if (last !== 'master' && access[last]) return last;
    return DASH_MODULES.find((m) => access[m]) ?? 'development';
  }, [shared, access, moduleOfPath]);

  // Route guard (UI layer; APIs are independently permission-checked) — purely
  // permission-driven, no module-specific special-casing:
  //   1. module isolation — user must have access to the module that owns the route, AND
  //   2. STRICT per-page permission — user must hold the page's required permission.
  const isSelfService = useMemo(() => {
    return hasAnyPermission(['hr.leave.self']) && !hasAnyPermission(['hr.view', 'hr.dashboard.view']);
  }, [hasAnyPermission]);

  const moduleOfPath = moduleForPath(pathname);
  const requiredPerms = permissionsForPath(pathname);
  const permitted = requiredPerms.length === 0 || isSuperAdmin || hasAnyPermission(requiredPerms);
  const allowed = shared || (access[moduleOfPath] && permitted);

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
    const isUserSelfService = hasAnyPermission(['hr.leave.self']) && !hasAnyPermission(['hr.view', 'hr.dashboard.view']);
    if (isUserSelfService) {
      return item.href === '/dashboard/hr/leave';
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
  }, [canAccessModule, hasAnyPermission]);

  /**
   * Sidebar items = items of the CURRENT module only, permission-filtered. A
   * partition (section header) is shown only when at least one of its child
   * items (up to the next partition) is visible.
   */
  const visibleMenuItems = useMemo((): SidebarItem[] => {
    // Current module's items only (partition-grouped). GLOBAL items (My Tasks) are
    // handled separately below so they always render at the BOTTOM of every
    // module's sidebar — a utility feature under the primary module menu, never
    // above Dashboard.
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
    // Global items (My Tasks) pinned to the bottom, below the module menu.
    for (const g of SIDEBAR_ITEMS.filter((i) => i.global)) {
      if (isItemVisible(g)) result.push(g);
    }
    return result as SidebarItem[];
  }, [currentModule, isItemVisible]);

  return (
    <ErrorBoundary>
      <AuthGuard>
        {user && !allowed ? (
          <div className="flex h-screen items-center justify-center bg-gray-50 text-center">
            <div>
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">!</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Access restricted</h2>
              <p className="text-sm text-gray-500 mt-1">You don’t have access to this module. Redirecting…</p>
            </div>
          </div>
        ) : (
          <div className="flex h-screen bg-gray-50">
            <Sidebar
              items={visibleMenuItems}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              moduleLabel={MODULE_LABELS[currentModule]}
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
