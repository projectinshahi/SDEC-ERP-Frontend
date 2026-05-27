import type { Metadata } from 'next';
import BlockersClient from './BlockersClient';

export const metadata: Metadata = {
  title: 'Blockers | ERP System',
  description: 'Centralized dashboard for all project blockers, escalations, and help requests.',
};

/**
 * Blockers page — Server Component wrapper
 * Permission gating handled inside BlockersClient via PermissionPageGuard.
 */
export default function BlockersPage() {
  return <BlockersClient />;
}
