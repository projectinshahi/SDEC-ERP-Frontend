'use client';

/**
 * usePermissions Hook
 *
 * React hook that provides permission-checking capabilities
 * based on the current authenticated user's role and permissions.
 * Super Admin role automatically bypasses all permission checks.
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { PermissionKey, ModuleName } from '@/lib/permissions/permission.types';
import {
  hasPermission as _hasPermission,
  hasAnyPermission as _hasAnyPermission,
  canAccessModule as _canAccessModule,
  isSuperAdmin as _isSuperAdmin,
} from '@/lib/permissions/permission.utils';

export interface UsePermissionsReturn {
  /** Raw permissions array from the authenticated user */
  permissions: string[];
  /** Display name of the user's role */
  roleName: string;
  /** Whether the current user is a Super Admin */
  isSuperAdmin: boolean;
  /** Check if user has a specific permission */
  hasPermission: (key: PermissionKey) => boolean;
  /** Check if user has ANY of the specified permissions */
  hasAnyPermission: (keys: PermissionKey[]) => boolean;
  /** Check if user can access a specific module (sidebar/route) */
  canAccessModule: (module: ModuleName) => boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();

  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const roleName = useMemo(() => user?.roleName ?? '', [user?.roleName]);
  const superAdmin = useMemo(() => _isSuperAdmin(roleName), [roleName]);

  const hasPermission = useCallback(
    (key: PermissionKey): boolean => {
      if (superAdmin) return true;
      return _hasPermission(permissions, key);
    },
    [permissions, superAdmin]
  );

  const hasAnyPermission = useCallback(
    (keys: PermissionKey[]): boolean => {
      if (superAdmin) return true;
      return _hasAnyPermission(permissions, keys);
    },
    [permissions, superAdmin]
  );

  const canAccessModule = useCallback(
    (module: ModuleName): boolean => {
      if (superAdmin) return true;
      return _canAccessModule(permissions, module);
    },
    [permissions, superAdmin]
  );

  return {
    permissions,
    roleName,
    isSuperAdmin: superAdmin,
    hasPermission,
    hasAnyPermission,
    canAccessModule,
  };
}
