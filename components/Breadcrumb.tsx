'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { classNames } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { moduleForPath, MODULE_HOME } from '@/lib/permissions/moduleAccess';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation component for showing page hierarchy
 */
export const Breadcrumb = ({ items }: BreadcrumbProps) => {
  const pathname = usePathname();
  // Keep breadcrumbs inside the module the user is actually in. `/dashboard` is the
  // DEVELOPMENT dashboard, so both the built-in Home link and the "Dashboard" crumb
  // that ~21 pages hard-code were ejecting Sales/HR/Finance users into another
  // module. Resolved from the route via the existing moduleForPath, so every page
  // is fixed at once and a new module only needs a MODULE_HOME entry.
  const moduleHome = MODULE_HOME[moduleForPath(pathname || '')] ?? ROUTES.DASHBOARD;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <Link href={moduleHome} className="hover:text-gray-900 dark:hover:text-gray-100">
        Home
      </Link>
      {items.map((item, index) => {
        // A crumb pointing at the generic /dashboard means "this module's dashboard".
        const href = item.href === ROUTES.DASHBOARD ? moduleHome : item.href;
        return (
          <div key={index} className="flex items-center gap-2">
            <span className="text-gray-400 dark:text-gray-600">/</span>
            {href ? (
              <Link href={href} className="hover:text-gray-900 dark:hover:text-gray-100">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100 font-medium">{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
};
