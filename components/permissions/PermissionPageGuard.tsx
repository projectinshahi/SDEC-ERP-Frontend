'use client';

/**
 * PermissionPageGuard
 *
 * Route-level permission protection.
 * Wraps a full page and redirects to /dashboard if the user lacks the required permission.
 *
 * Usage (in a page component):
 *   <PermissionPageGuard require="role.read">
 *     <RolesClient />
 *   </PermissionPageGuard>
 *
 * While auth is still loading, shows a centered spinner.
 * Super Admin bypasses all checks.
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldOff } from 'lucide-react';
import { AccessDenied } from './AccessDenied';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { permissionsForPath } from '@/lib/sidebar/sidebar.config';
import type { PermissionKey, ModuleName } from '@/lib/permissions/permission.types';

interface PermissionPageGuardProps {
  children: ReactNode;
  /** Require a single specific permission key */
  require?: PermissionKey;
  /** Require at least one of the listed permission keys */
  requireAny?: PermissionKey[];
  /** Require any permission belonging to this module */
  module?: ModuleName;
  /**
   * Resolve the required permission(s) from the current route via
   * permissionsForPath() — the SAME source the sidebar uses, so a page can never
   * drift from its sidebar item. Used by the Sales layout to gate every route.
   * An unmapped route (empty array) is allowed (module-home / no specific gate).
   */
  fromPath?: boolean;
  /** Where to redirect on failure. Defaults to '/dashboard'. */
  redirectTo?: string;
  /**
   * Render the shared AccessDenied state instead of redirecting.
   *
   * OPT-IN so no existing module's behaviour changes. It is the safer mode: the
   * user is told why, and nothing navigates on its own, which removes any
   * possibility of a redirect loop between two guarded routes.
   */
  showDenied?: boolean;
}

export function PermissionPageGuard({
  children,
  require: requireKey,
  requireAny,
  module,
  fromPath,
  redirectTo = '/dashboard',
  showDenied = false,
}: PermissionPageGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();
  const { hasPermission, hasAnyPermission, canAccessModule } = usePermissions();

  let allowed = true;

  if (!isLoading && isAuthenticated) {
    if (requireKey !== undefined) {
      allowed = hasPermission(requireKey);
    } else if (requireAny !== undefined && requireAny.length > 0) {
      allowed = hasAnyPermission(requireAny);
    } else if (module !== undefined) {
      allowed = canAccessModule(module);
    } else if (fromPath) {
      // Route-driven: gate on the sidebar permission(s) for this exact path.
      const perms = permissionsForPath(pathname ?? '');
      allowed = perms.length === 0 ? true : hasAnyPermission(perms);
    }
  }

  useEffect(() => {
    // In `showDenied` mode nothing is redirected — the denied state below is the
    // final answer, so there is no navigation to loop on.
    if (!showDenied && !isLoading && isAuthenticated && !allowed) {
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, allowed, router, redirectTo, showDenied]);

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  /* Permission denied. `children` is NOT rendered in either branch, so a guarded
   * page never mounts and can never fire its data requests — no protected data
   * is fetched, let alone shown, before authorization resolves. */
  if (!allowed) {
    if (showDenied) return <AccessDenied backHref={redirectTo} />;
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-3 text-gray-400">
        <ShieldOff size={36} />
        <p className="text-sm font-semibold">Access denied. Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
