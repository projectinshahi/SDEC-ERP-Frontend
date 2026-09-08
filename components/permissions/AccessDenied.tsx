'use client';

import Link from 'next/link';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { classNames } from '@/lib/utils';

/**
 * The shared access-denied state for authenticated users who lack a permission.
 *
 * Rendered INSTEAD of redirecting, which is what makes it safe: the user is told
 * why they cannot see the page and is given one deliberate way back, so there is
 * no automatic navigation that could bounce between two guarded routes.
 *
 * It renders nothing but this message — no protected data is fetched or shown,
 * because the guard returns this in place of its children.
 *
 * Styling reuses the existing card/border/typography tokens; nothing new.
 */
export function AccessDenied({
  title = 'Access denied',
  message = 'You do not have permission to access this section.',
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
  className = '',
}: {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={classNames(
        'mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h1 className="text-base font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <p className="text-xs text-gray-400">
        If you believe this is a mistake, ask an administrator to review your role assignments.
      </p>
      <Link
        href={backHref}
        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>
    </div>
  );
}
