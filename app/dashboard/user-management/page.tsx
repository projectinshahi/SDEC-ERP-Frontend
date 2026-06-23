import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Management | ERP System',
  description: 'Manage users and roles',
};

import { UserManagementClient } from './UserManagementClient';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';

/**
 * User Management page - Server Component wrapper.
 * Defence-in-depth: gated on User/Role read permissions (the layout's
 * path→permission guard also covers this route via the sidebar entry).
 */
export default function UserManagementPage() {
  return (
    <PermissionPageGuard requireAny={['user.read', 'user.create', 'user.update', 'user.delete', 'role.read']}>
      <UserManagementClient />
    </PermissionPageGuard>
  );
}
