import type { Metadata } from 'next';
import SalesMeetingsClient from './SalesMeetingsClient';

export const metadata: Metadata = {
  title: 'Sales Meetings | ERP System',
  description: 'Schedule and manage sales meetings, participants, agendas, and follow-up notes.',
};

/**
 * Sales Meetings page — Server Component wrapper.
 */
export default function SalesMeetingsPage() {
  return <SalesMeetingsClient />;
}
