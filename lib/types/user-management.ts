/**
 * User Management Types
 *
 * Permission arrays should contain valid PermissionKey values
 * from `@/lib/permissions/permission.types` (e.g. 'user.create', 'role.read').
 */

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  /** E.164 (e.g. "+919876543210"), normalized by the backend. */
  phone?: string | null;
  /** Set by the backend: 'company' = added here, 'external' = mobile-app sign-up. Never sent. */
  accountType?: 'company' | 'external';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  /** Array of PermissionKey values (e.g. 'user.create', 'task.read', 'role.delete') */
  permissions: string[];
  userCount?: number;
  users?: { id: number; name: string; email: string }[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export type UserFormData = Omit<User, 'id' | 'createdAt' | 'phone' | 'accountType'> & {
  password: string;
  phone: string;
};

export type RoleFormData = Omit<Role, 'id' | 'userCount'>;
