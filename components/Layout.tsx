'use client';

import { ReactNode, useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar, type SidebarItem } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SIDEBAR_ITEMS } from '@/lib/sidebar/sidebar.config';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout component that wraps all dashboard pages.
 * Sidebar items are filtered dynamically based on the current user's permissions.
 * Super Admin sees all items; other roles only see items for modules they can access.
 */
export const DashboardLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { canAccessModule } = usePermissions();

  /**
   * Filter sidebar items based on permissions.
   * Items with module === null are always visible (e.g. Dashboard).
   * Items with a module are only shown if canAccessModule returns true.
   */
  const visibleMenuItems = useMemo((): SidebarItem[] => {
    return SIDEBAR_ITEMS.filter((item) => {
      if (item.module === null || item.module === undefined) return true;
      return canAccessModule(item.module);
    }) as SidebarItem[];
  }, [canAccessModule]);

  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="flex h-screen bg-gray-50">
          {/* Permission-filtered Sidebar */}
          <Sidebar
            items={visibleMenuItems}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
};
