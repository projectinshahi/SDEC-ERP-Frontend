/**
 * RBAC Permission Constants
 * Single source of truth for all permission definitions in the system.
 */

import type { PermissionKey, ModuleName, PermissionGroup } from './permission.types';

/**
 * Mapping of module names to their permission key prefixes.
 * Used for dynamic module access checks.
 */
export const MODULE_PREFIX_MAP: Record<Exclude<ModuleName, 'dashboard'>, string> = {
  user: 'user.',
  task: 'task.',
  role: 'role.',
} as const;

/**
 * All permission groups organized by module.
 * Used in the Create/Edit Role modal for rendering categorized permission sections.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'user',
    label: 'User Management',
    permissions: [
      {
        key: 'user.create',
        label: 'Create User',
        description: 'Create and provision new system users',
        module: 'user',
      },
      {
        key: 'user.read',
        label: 'Read User',
        description: 'View user profiles and directory listings',
        module: 'user',
      },
      {
        key: 'user.update',
        label: 'Edit User',
        description: 'Update profile and status details for existing users',
        module: 'user',
      },
      {
        key: 'user.delete',
        label: 'Delete User',
        description: 'Permanently remove system users from the database',
        module: 'user',
      },
    ],
  },
  {
    module: 'task',
    label: 'Task Management',
    permissions: [
      {
        key: 'task.create',
        label: 'Create Task',
        description: 'Create new operational tasks and assignments',
        module: 'task',
      },
      {
        key: 'task.read',
        label: 'Read Task',
        description: 'View task boards, details, and status updates',
        module: 'task',
      },
      {
        key: 'task.update',
        label: 'Edit Task',
        description: 'Modify execution details and status of existing tasks',
        module: 'task',
      },
      {
        key: 'task.delete',
        label: 'Delete Task',
        description: 'Permanently remove operational tasks from the database',
        module: 'task',
      },
    ],
  },
  {
    module: 'role',
    label: 'Role Management',
    permissions: [
      {
        key: 'role.create',
        label: 'Create Role',
        description: 'Define new security roles with custom permission sets',
        module: 'role',
      },
      {
        key: 'role.read',
        label: 'Read Role',
        description: 'View role definitions and their assigned permissions',
        module: 'role',
      },
      {
        key: 'role.update',
        label: 'Edit Role',
        description: 'Modify existing role configurations and permissions',
        module: 'role',
      },
      {
        key: 'role.delete',
        label: 'Delete Role',
        description: 'Permanently remove security roles from the system',
        module: 'role',
      },
    ],
  },
];

/**
 * Flat array of all valid permission keys in the system.
 * Derived from PERMISSION_GROUPS to maintain single source of truth.
 */
export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions.map((p) => p.key)
);

/**
 * The role name that receives Super Admin privileges.
 * Super Admin bypasses all permission checks.
 */
export const SUPER_ADMIN_ROLE_NAME = 'Super Admin';
