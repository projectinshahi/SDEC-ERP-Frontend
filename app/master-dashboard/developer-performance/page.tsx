'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { DeveloperPerformanceView } from '@/components/developer-performance/DeveloperPerformanceView';

/**
 * Master Dashboard → Developer Performance (/master-dashboard/developer-performance).
 *
 * SuperAdmin-only company-wide developer analytics. Access is enforced by the
 * Master Dashboard layout (getModuleAccess().master === SuperAdmin → non-admins
 * are bounced) and the backend (`/projects/global/developer-performance` returns
 * org-wide data for the global admin). Reuses the exact same live view + API as
 * the Development module page — no duplicated UI or backend logic.
 */
export default function MasterDeveloperPerformancePage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb: Home / Master Dashboard / Developer Performance */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/modules" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          Home
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        <Link href="/master-dashboard" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          Master Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">Developer Performance</span>
      </nav>

      <DeveloperPerformanceView />
    </div>
  );
}
