/**
 * User Management Types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount?: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export type UserFormData = Omit<User, 'id' | 'createdAt'> & {
  password: string;
};

export type RoleFormData = Omit<Role, 'id' | 'userCount'>;
