import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlockersClient from './BlockersClient';

export const metadata: Metadata = {
  title: 'Blockers | ERP System',
  description: 'Centralized dashboard for all project blockers, escalations, and help requests.',
};

/** Lightweight fallback while the client reads its search params — mirrors the
 *  Blockers table's own loading spinner so there is no visual jump. */
function BlockersFallback() {
  return (
    <div className="py-20 text-center flex flex-col items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

/**
 * Blockers page — Server Component wrapper
 * Permission gating handled inside BlockersClient via PermissionPageGuard.
 *
 * BlockersClient calls useSearchParams() (filters/query params live in the URL), so
 * it MUST sit under a Suspense boundary or static prerendering throws
 * "useSearchParams() should be wrapped in a suspense boundary".
 */
export default function BlockersPage() {
  return (
    <Suspense fallback={<BlockersFallback />}>
      <BlockersClient />
    </Suspense>
  );
}
