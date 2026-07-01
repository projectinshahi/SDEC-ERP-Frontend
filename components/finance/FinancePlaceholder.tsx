'use client';

/**
 * Shared placeholder for Finance sections not yet built (Phase 1). Renders a
 * clean, on-brand page: breadcrumb + header + a "Coming Soon" card, matching the
 * ERP design system. Each not-yet-implemented Finance route is a one-line page
 * that renders this with its own title/description/icon, so Phase 2 replaces the
 * page body with real content and drops the placeholder.
 */

import Link from 'next/link';
import { ChevronRight, Clock, type LucideIcon } from 'lucide-react';

interface FinancePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function FinancePlaceholder({ title, description, icon: Icon }: FinancePlaceholderProps) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/modules" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">Home</Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        <Link href="/dashboard/finance" className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">Finance</Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">{title}</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      {/* Coming Soon card */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          <Icon className="h-8 w-8" />
        </div>
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Clock size={13} /> Coming Soon
        </span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title} is on the way</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {description} This section will be available in an upcoming phase.
        </p>
      </div>
    </div>
  );
}
