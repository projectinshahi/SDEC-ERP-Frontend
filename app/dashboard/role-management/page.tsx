import type { Metadata } from 'next';
import { RoleManagementClient } from './RoleManagementClient';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';

export const metadata: Metadata = {
  title: 'Role Management | ERP System',
  description: 'Create, view, and configure security roles and permissions',
};

/**
 * Role Management page — /dashboard/role-management
 * Server Component wrapper around the client-side RoleManagementClient.
 * Strictly gated on Role Management permissions (this route has no sidebar entry,
 * so the layout's path→permission guard does not otherwise cover it).
 */
export default function RoleManagementPage() {
  return (
    <PermissionPageGuard requireAny={['role.read', 'role.create', 'role.update', 'role.delete']}>
      <RoleManagementClient />
    </PermissionPageGuard>
  );
}
