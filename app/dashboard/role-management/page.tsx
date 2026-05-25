import type { Metadata } from 'next';
import { RoleManagementClient } from './RoleManagementClient';

export const metadata: Metadata = {
  title: 'Role Management | ERP System',
  description: 'Create, view, and configure security roles and permissions',
};

/**
 * Role Management page — /dashboard/role-management
 * Server Component wrapper around the client-side RoleManagementClient.
 */
export default function RoleManagementPage() {
  return <RoleManagementClient />;
}
