import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TicketsClient } from './TicketsClient';

export const metadata: Metadata = {
  title: 'Ticket Tracking | ERP System',
  description: 'Manage tickets, issues, and feature requests',
};

function TicketTrackingFallback() {
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-gray-500">Loading Ticket Tracker...</p>
    </div>
  );
}

/**
 * Ticket Tracking page — Server Component wrapper.
 * Suspense is required because TicketsClient calls useSearchParams().
 */
export default function TicketTrackingPage() {
  return (
    <Suspense fallback={<TicketTrackingFallback />}>
      <TicketsClient />
    </Suspense>
  );
}

