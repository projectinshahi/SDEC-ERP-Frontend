import type { Metadata } from 'next';
import { SalesTicketsClient } from './SalesTicketsClient';

export const metadata: Metadata = {
  title: 'Sales Tickets | ERP System',
  description: 'Manage sales tickets, customer issues, and follow-ups',
};

export default function SalesTicketsPage() {
  return <SalesTicketsClient />;
}
