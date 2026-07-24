'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The standalone "Capture Lead" page has been replaced by the New Lead modal on
 * the Leads list (no page navigation). This route now redirects there so any old
 * links or bookmarks resolve to the new workflow instead of 404-ing.
 */
export default function NewLeadRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/sales/pipeline');
  }, [router]);

  return null;
}
