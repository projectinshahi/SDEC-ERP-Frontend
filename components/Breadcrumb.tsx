'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { classNames } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { getModuleAccess, resolveModule, MODULE_HOME } from '@/lib/permissions/moduleAccess';
import { useAuth } from '@/lib/hooks/useAuth';

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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  // Keep breadcrumbs inside the module the user is actually in. `/dashboard` is the
  // DEVELOPMENT dashboard, so both the built-in Home link and the "Dashboard" crumb
  // that ~21 pages hard-code were ejecting Sales/HR/Finance users into another
  // module. `resolveModule` honors the `?module=` context on shared pages (My Tasks,
  // Notice) so those crumbs point home to the module the user came from, not Dev.
  const moduleHome = MODULE_HOME[resolveModule(pathname || '', searchParams.get('module'), getModuleAccess(user))] ?? ROUTES.DASHBOARD;

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
