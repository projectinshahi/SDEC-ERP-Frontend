'use client';

/**
 * PermissionGuard
 *
 * Conditionally renders children based on the current user's permissions.
 * Supports three modes:
 *
 *   1. Single key:   <PermissionGuard require="user.create">...</PermissionGuard>
 *   2. Any of keys:  <PermissionGuard requireAny={['role.create','role.update']}>...</PermissionGuard>
 *   3. Module:       <PermissionGuard module="task">...</PermissionGuard>
 *
 * When the check fails:
 *   - By default, renders nothing (completely hidden — no disabled state).
 *   - Pass `fallback` to render an alternative element (e.g. an access-denied message).
 *
 * Super Admin bypasses all checks and always renders children.
 */

import type { ReactNode } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { PermissionKey, ModuleName } from '@/lib/permissions/permission.types';

interface PermissionGuardProps {
  children: ReactNode;
  /** Require a single specific permission key */
  require?: PermissionKey;
  /** Require at least one of the listed permission keys */
  requireAny?: PermissionKey[];
  /** Require any permission belonging to this module */
  module?: ModuleName;
  /** Element to render when the permission check fails. Defaults to null. */
  fallback?: ReactNode;
}

export function PermissionGuard({
  children,
  require: requireKey,
  requireAny,
  module,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, canAccessModule } = usePermissions();

  let allowed = true;

  if (requireKey !== undefined) {
    allowed = hasPermission(requireKey);
  } else if (requireAny !== undefined && requireAny.length > 0) {
    allowed = hasAnyPermission(requireAny);
  } else if (module !== undefined) {
    allowed = canAccessModule(module);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
