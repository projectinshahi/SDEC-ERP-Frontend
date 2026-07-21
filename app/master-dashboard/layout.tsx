'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar, type SidebarItem } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/hooks/useAuth';
import { getModuleAccess } from '@/lib/permissions/moduleAccess';
import { assertNoDuplicateHrefs } from '@/lib/sidebar/sidebar.config';

interface LayoutProps {
  children: ReactNode;
}

// Hardcoded sidebar items for the Master Dashboard.
// Order: Dashboard → My Tasks → Projects → Sales → HR → Tickets → Meetings →
// Developer Performance → Notice → Settings. My Tasks sits at the TOP (immediately
// below Dashboard) to match every module's main sidebar. This is nav ORDER only —
// the Master Dashboard still lands on /master-dashboard (Dashboard), never My Tasks.
//
// These items are deliberately NOT per-item permission-gated: the entire Master
// Dashboard is SuperAdmin-EXCLUSIVE (the `denied` route guard below redirects any
// non-SuperAdmin away, and getModuleAccess().master === isSuperAdmin — `master`
// can never be granted to a non-super). A SuperAdmin must see every tab (product
// requirement), so item-level filtering would be a no-op here. If `master` is
// ever opened to non-super roles, gate each item like the main sidebar does.
const MASTER_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/master-dashboard',
    icon: 'LayoutDashboard',
    module: null,
  },
  {
    // GLOBAL My Tasks — standardized TOP position (immediately below Dashboard),
    // consistent with every module's main sidebar. Renders the SAME Global My Tasks
    // workspace IN-SHELL at /master-dashboard/my-tasks so the Founder stays inside
    // the Master Dashboard layout. Must NOT point at /dashboard/my-tasks (that
    // switches to the Development sidebar). Nav ORDER only — the Master Dashboard
    // still lands on /master-dashboard (Dashboard), never My Tasks.
    label: 'My Tasks',
    href: '/master-dashboard/my-tasks',
    icon: 'ListTodo',
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
    label: 'Developers',
    href: '/master-dashboard/developer-performance',
    icon: 'BarChart3',
    module: null,
  },
  // Finance is now a standalone ERP module (/dashboard/finance), no longer a
  // Master Dashboard page — see lib/permissions/moduleAccess.ts + sidebar.config.ts.
  {
    // GLOBAL Notice — the standalone company-announcement module, rendered IN-SHELL at
    // /master-dashboard/notice (same pattern as My Tasks above) so the Founder stays
    // inside the Master Dashboard layout. Must NOT point at /dashboard/notice (that
    // switches to the Development sidebar). The Master Dashboard is SuperAdmin-only, so
    // every Notice feature is reached via the existing global-admin bypass — no extra
    // permission is required (the same bypass that unlocks every other master tab).
    label: 'Notice',
    href: '/master-dashboard/notice',
    icon: 'FileText',
    module: null,
  },
  {
    label: 'Settings',
    href: '/master-dashboard/settings',
    icon: 'Settings',
    module: null,
  },
];

// Dev-time invariant: fail loud if this hardcoded array ever registers the same route
// twice (the "two Notice items" bug). No-op in production; never hides an item.
assertNoDuplicateHrefs(MASTER_SIDEBAR_ITEMS, 'MASTER_SIDEBAR_ITEMS');

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
