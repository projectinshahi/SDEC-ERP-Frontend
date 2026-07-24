import { redirect } from 'next/navigation';

/**
 * The Lead Pipeline is now an in-page "Pipeline View" on the Leads page.
 * This former route redirects there (preserving any existing bookmarks/links)
 * — there is no separate pipeline page anymore.
 */
export default function LeadPipelineRedirect() {
  redirect('/dashboard/sales/pipeline?view=pipeline');
}
