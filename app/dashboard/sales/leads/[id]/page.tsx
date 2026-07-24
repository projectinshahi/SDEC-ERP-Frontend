'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Opportunity details moved to /dashboard/sales/pipeline/[id]. This former lead-details
 * route redirects (carrying the id) so old links/bookmarks resolve to the new location.
 */
export default function LeadDetailRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const id = params?.id;
    router.replace(id ? `/dashboard/sales/pipeline/${id}` : '/dashboard/sales/pipeline');
  }, [router, params]);

  return null;
}
