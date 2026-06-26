/**
 * RBAC Permission Utility Functions
 * Pure functions (no React dependency) for checking permissions.
 */

import type { PermissionKey, ModuleName } from './permission.types';
import { MODULE_PREFIX_MAP, SUPER_ADMIN_ROLE_NAME } from './permissions.constants';

/**
 * Sales coarse→granular bridge. Sales has legacy COARSE keys that IMPLY the
 * granular per-feature keys, so gating can be purely granular (1:1 with the
 * Development module) while roles still holding the coarse/master keys keep
 * working — and a role with ONLY granular keys is scoped exactly to them.
 * This is the SINGLE compatibility function (not a second permission system):
 *   • `sales.view`   ⇒ every `sales.*.view` key (the "Full Sales Access" VISIBILITY
 *                     master — it unlocks tabs, NOT create/edit/delete actions)
 *   • `sales.create` ⇒ every `sales.*.create`
 *   • `sales.edit`   ⇒ every `sales.*.edit`
 *   • `sales.delete` ⇒ every `sales.*.delete`
 * Non-sales keys and the coarse capability keys (assign/approve/*.manage/…) are
 * exact-match only, so Development is unaffected and a view-only master role can
 * never escalate to an action it was never granted.
 */
function salesGrants(permissions: string[], key: string): boolean {
  if (!key.startsWith('sales.')) return false;
  if (key.endsWith('.view') && permissions.includes('sales.view')) return true;
  if (key.endsWith('.create') && permissions.includes('sales.create')) return true;
  if (key.endsWith('.edit') && permissions.includes('sales.edit')) return true;
  if (key.endsWith('.delete') && permissions.includes('sales.delete')) return true;
  return false;
}

/**
 * Check if the given permissions array grants a specific permission key
 * (exact match, or via the Sales coarse→granular bridge).
 */
export function hasPermission(permissions: string[], key: PermissionKey): boolean {
  return permissions.includes(key) || salesGrants(permissions, key);
}

/**
 * Check if the given permissions array grants ANY of the specified keys.
 */
export function hasAnyPermission(permissions: string[], keys: PermissionKey[]): boolean {
  return keys.some((key) => hasPermission(permissions, key));
}

/**
 * Check if the given permissions array grants ALL of the specified keys.
 */
export function hasAllPermissions(permissions: string[], keys: PermissionKey[]): boolean {
  return keys.every((key) => hasPermission(permissions, key));
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
