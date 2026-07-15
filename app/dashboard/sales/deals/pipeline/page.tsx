import { redirect } from 'next/navigation';

/**
 * The Deals Pipeline is now an in-page "       " on the Deals page.
 * This former route redirects there (preserving any existing bookmarks/links)
 * — there is no separate deals pipeline page anymore.
 */
export default function DealPipelineRedirect() {
  redirect('/dashboard/sales/deals?view=pipeline');
}
