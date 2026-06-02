import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BugTrackingClient } from './BugTrackingClient';

export const metadata: Metadata = {
  title: 'Bug Tracking | ERP System',
  description: 'Manage bugs, issues, and feature requests',
};

function BugTrackingFallback() {
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-gray-500">Loading Bug Tracker...</p>
    </div>
  );
}

/**
 * Bug Tracking page — Server Component wrapper.
 * Suspense is required because BugTrackingClient calls useSearchParams().
 */
export default function BugTrackingPage() {
  return (
    <Suspense fallback={<BugTrackingFallback />}>
      <BugTrackingClient />
    </Suspense>
  );
}
