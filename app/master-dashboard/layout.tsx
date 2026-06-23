'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar, type SidebarItem } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/hooks/useAuth';
import { getModuleAccess } from '@/lib/permissions/moduleAccess';

interface LayoutProps {
  children: ReactNode;
}

// Hardcoded sidebar items for the Master Dashboard.
// Order is intentional and follows the business workflow:
// Dashboard → Projects → Sales → HR → Tickets → Meetings → Developer Performance → Settings.
const MASTER_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/master-dashboard',
    icon: 'LayoutDashboard',
    module: null,
  },
  {
    label: 'Projects',
    href: '/master-dashboard/projects',
    icon: 'Briefcase',
    module: null,
  },
  {
    label: 'Sales',
    href: '/master-dashboard/sales',
    icon: 'Target',
    module: null,
  },
  {
    label: 'HR',
    href: '/master-dashboard/hr',
    icon: 'Users',
    module: null,
  },
  {
    label: 'Tickets',
    href: '/master-dashboard/tickets',
    icon: 'AlertTriangle',
    module: null,
  },
  {
    label: 'Meetings',
    href: '/master-dashboard/meetings',
    icon: 'CalendarDays',
    module: null,
  },
  {
    label: 'Developer Performance',
    href: '/master-dashboard/developer-performance',
    icon: 'BarChart3',
    module: null,
  },
  {
    label: 'Settings',
    href: '/master-dashboard/settings',
    icon: 'Settings',
    module: null,
  },
];

export default function MasterDashboardLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Master Dashboard is SuperAdmin-only. Use the normalised access check
  // (getModuleAccess().master === isSuperAdmin) so every role spelling
  // ('SuperAdmin' / 'Super Admin' / 'superadmin') matches, and redirect via an
  // effect rather than during render.
  const denied = !isLoading && !!user && !getModuleAccess(user).master;
  useEffect(() => {
    if (denied) router.replace('/modules');
  }, [denied, router]);
  if (denied) return null;

  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
          <Sidebar
            items={MASTER_SIDEBAR_ITEMS}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            moduleLabel="Master Dashboard"
            // The "Switch Project" picker is a Development-module affordance; the
            // SuperAdmin dashboard reaches projects via the Projects menu item, so
            // hide the dropdown here (Projects stays a plain, direct nav link).
            showProjectPicker={false}
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
      </AuthGuard>
    </ErrorBoundary>
  );
}
