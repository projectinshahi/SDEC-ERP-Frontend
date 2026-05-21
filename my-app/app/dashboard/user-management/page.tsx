import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Management | ERP System',
  description: 'Manage users and roles',
};

import { UserManagementClient } from './UserManagementClient';

/**
 * User Management page - Server Component wrapper
 */
export default function UserManagementPage() {
  return <UserManagementClient />;
}
