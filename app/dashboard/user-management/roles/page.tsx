import type { Metadata } from 'next';
import { RolesClient } from './RolesClient';

export const metadata: Metadata = {
  title: 'Roles | ERP System',
  description: 'Manage system roles',
};

/**
 * Roles page - Server Component wrapper
 */
export default function RolesPage() {
  return <RolesClient />;
}

