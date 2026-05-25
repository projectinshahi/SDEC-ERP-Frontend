/**
 * RBAC Permission Type Definitions
 * Central type system for all permission-related interfaces.
 */

/**
 * All valid permission keys in the system.
 * Format: `module.action`
 */
export type PermissionKey =
  // User Management
  | 'user.create'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  // Task Management
  | 'task.create'
  | 'task.read'
  | 'task.update'
  | 'task.delete'
  // Role Management
  | 'role.create'
  | 'role.read'
  | 'role.update'
  | 'role.delete';

/**
 * Module names used for sidebar filtering and route protection.
 * 'dashboard' is always accessible and has no permission gating.
 */
export type ModuleName = 'user' | 'task' | 'role' | 'dashboard';

/**
 * A single permission definition with metadata for UI rendering.
 */
export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  module: ModuleName;
}

/**
 * A group of permissions belonging to a module, used for
 * rendering categorized permission sections in the Create/Edit Role modal.
 */
export interface PermissionGroup {
  module: ModuleName;
  label: string;
  permissions: PermissionDefinition[];
}

/**
 * Extended user interface that includes RBAC fields.
 * This extends the basic auth user with role name and permissions.
 */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleName: string;
  permissions: string[];
}
