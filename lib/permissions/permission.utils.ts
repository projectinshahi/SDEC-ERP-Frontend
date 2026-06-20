/**
 * RBAC Permission Utility Functions
 * Pure functions (no React dependency) for checking permissions.
 */

import type { PermissionKey, ModuleName } from './permission.types';
import { MODULE_PREFIX_MAP, SUPER_ADMIN_ROLE_NAME } from './permissions.constants';

/**
 * Check if the given permissions array contains a specific permission key.
 */
export function hasPermission(permissions: string[], key: PermissionKey): boolean {
  return permissions.includes(key);
}

/**
 * Check if the given permissions array contains ANY of the specified keys.
 */
export function hasAnyPermission(permissions: string[], keys: PermissionKey[]): boolean {
  return keys.some((key) => permissions.includes(key));
}

/**
 * Check if the given permissions array contains ALL of the specified keys.
 */
export function hasAllPermissions(permissions: string[], keys: PermissionKey[]): boolean {
  return keys.every((key) => permissions.includes(key));
}

/**
 * Check if the user can access a specific module based on their permissions.
 * Returns true if the user has ANY permission starting with the module prefix.
 * Dashboard module always returns true (no gating).
 */
export function canAccessModule(permissions: string[], module: ModuleName): boolean {
  if (module === 'dashboard') return true;

  const prefix = MODULE_PREFIX_MAP[module];
  if (!prefix) return false;

  return permissions.some((p) => p.startsWith(prefix));
}

/**
 * Check if the given role name qualifies as Super Admin.
 * Super Admin (and plain admin) bypasses all permission checks.
 */
export function isSuperAdmin(roleName: string): boolean {
  // Normalise by lowercasing AND stripping spaces/underscores/hyphens — the same
  // way moduleAccess.normalizeRole and the backend isGlobalAdmin do. The role is
  // stored inconsistently ('Super Admin', 'SuperAdmin', 'super_admin', …); a
  // looser check elsewhere (getModuleAccess) can grant a user Master-Dashboard
  // access while this stricter one denied the permission bypass — bouncing them
  // to /dashboard when they opened a project they aren't a member of.
  const strip = (v: string) => String(v ?? '').toLowerCase().replace(/[\s_-]/g, '');
  const normalized = strip(roleName);
  return normalized === strip(SUPER_ADMIN_ROLE_NAME) || normalized === 'admin';
}

/**
 * Extract the module name from a permission key string.
 * Returns null if the key does not match any known module.
 *
 * @example getModuleFromPermission('user.create') → 'user'
 * @example getModuleFromPermission('unknown.key') → null
 */
export function getModuleFromPermission(key: string): ModuleName | null {
  const entries = Object.entries(MODULE_PREFIX_MAP) as [Exclude<ModuleName, 'dashboard'>, string][];
  for (const [module, prefix] of entries) {
    if (key.startsWith(prefix)) {
      return module;
    }
  }
  return null;
}
