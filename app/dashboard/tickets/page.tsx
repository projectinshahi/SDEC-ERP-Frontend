import type { Metadata } from 'next';
import { TicketsClient } from './TicketsClient';

export const metadata: Metadata = {
  title: 'Ticket Tracking | ERP System',
  description: 'Manage tickets, issues, and feature requests',
};

export default function TicketTrackingPage() {
  return <TicketsClient />;
}
