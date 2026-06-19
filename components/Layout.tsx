'use client';

import { ReactNode, useState, useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar, type SidebarItem } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SIDEBAR_ITEMS } from '@/lib/sidebar/sidebar.config';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getModuleAccess, moduleForPath, groupForModule, isSharedPath, primaryModule, MODULE_LABELS,
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
  const { canAccessModule } = usePermissions();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const access = useMemo(() => getModuleAccess(user), [user]);
  const shared = isSharedPath(pathname);
  // On shared routes (profile, change-password) fall back to the user's primary
  // module so the sidebar still shows a coherent, single-module menu.
  const currentModule = useMemo(
    () => (shared ? (primaryModule(access) ?? 'development') : moduleForPath(pathname)),
    [shared, access, pathname],
  );

  // Is the user allowed in the module that owns this route?
  const allowed = shared || access[moduleForPath(pathname)];

  // Module-level route guard (UI layer; APIs are independently permission-checked).
  useEffect(() => {
    if (user && !allowed) router.replace('/modules');
  }, [user, allowed, router]);

  /**
   * Sidebar items = items of the CURRENT module only, then permission-filtered.
   * Items with module === null (Dashboard) are always shown within their module.
   */
  const visibleMenuItems = useMemo((): SidebarItem[] => {
    return SIDEBAR_ITEMS.filter((item) => {
      if (groupForModule(item.module) !== currentModule) return false;
      if (item.module === null || item.module === undefined) return true;
      return canAccessModule(item.module);
    }) as SidebarItem[];
  }, [canAccessModule, currentModule]);

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
