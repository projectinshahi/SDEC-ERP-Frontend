import type { Metadata } from 'next';
import { BugTrackingClient } from './BugTrackingClient';

export const metadata: Metadata = {
  title: 'Bug Tracking | ERP System',
  description: 'Manage bugs, issues, and feature requests',
};

/**
 * Bug Tracking page - Server Component wrapper
 */
export default function BugTrackingPage() {
  return <BugTrackingClient />;
}
