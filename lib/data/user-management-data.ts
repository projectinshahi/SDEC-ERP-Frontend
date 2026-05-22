import type { User, Role, Permission } from '@/lib/types/user-management';

/**
 * Dummy data for User Management
 */

export const DUMMY_USERS: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    roles: ['Admin', 'Manager'],
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    roles: ['Manager'],
    status: 'active',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    roles: ['User'],
    status: 'inactive',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    roles: ['Manager', 'User'],
    status: 'active',
    createdAt: '2024-03-25',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    roles: ['User'],
    status: 'active',
    createdAt: '2024-04-05',
  },
];

export const DUMMY_ROLES: Role[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system access with all permissions',
    permissions: ['user.create', 'user.read', 'user.update', 'user.delete', 'role.manage', 'system.config'],
    userCount: 2,
  },
  {
    id: '2',
    name: 'Manager',
    description: 'Can manage users and view reports',
    permissions: ['user.read', 'user.update', 'report.view', 'task.manage'],
    userCount: 5,
  },
  {
    id: '3',
    name: 'User',
    description: 'Basic access to assigned tasks and data',
    permissions: ['task.view', 'task.update', 'profile.edit'],
    userCount: 15,
  },
  {
    id: '4',
    name: 'Viewer',
    description: 'Read-only access to reports and dashboards',
    permissions: ['report.view', 'dashboard.view'],
    userCount: 8,
  },
];

export const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: 'user.create', name: 'Create Users', description: 'Can create new users', category: 'User Management' },
  { id: 'user.read', name: 'View Users', description: 'Can view user list', category: 'User Management' },
  { id: 'user.update', name: 'Edit Users', description: 'Can edit user details', category: 'User Management' },
  { id: 'user.delete', name: 'Delete Users', description: 'Can delete users', category: 'User Management' },
  { id: 'role.manage', name: 'Manage Roles', description: 'Can create and edit roles', category: 'Role Management' },
  { id: 'system.config', name: 'System Config', description: 'Can configure system settings', category: 'System' },
  { id: 'report.view', name: 'View Reports', description: 'Can view reports', category: 'Reports' },
  { id: 'task.view', name: 'View Tasks', description: 'Can view tasks', category: 'Tasks' },
  { id: 'task.update', name: 'Update Tasks', description: 'Can update tasks', category: 'Tasks' },
  { id: 'task.manage', name: 'Manage Tasks', description: 'Can create, edit, delete tasks', category: 'Tasks' },
  { id: 'profile.edit', name: 'Edit Profile', description: 'Can edit own profile', category: 'Profile' },
  { id: 'dashboard.view', name: 'View Dashboard', description: 'Can view dashboard', category: 'Dashboard' },
];
