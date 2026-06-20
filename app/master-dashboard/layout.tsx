'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar, type SidebarItem } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

// Hardcoded sidebar items for the Master Dashboard.
// Order is intentional and follows the business workflow:
// Dashboard → Projects → Sales → Tickets → Meetings.
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
];

export default function MasterDashboardLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Role protection: Only SuperAdmin allowed
  if (!isLoading && user && user.roleName !== 'SuperAdmin' && user.role !== 'SuperAdmin') {
    router.replace('/modules');
    return null;
  }

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
