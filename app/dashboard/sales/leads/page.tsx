import { redirect } from 'next/navigation';

/**
 * The Leads module is now "Pipeline" and lives at /dashboard/sales/pipeline.
 * This former route redirects there so existing bookmarks/links keep working.
 */
export default function LeadsRedirect() {
  redirect('/dashboard/sales/pipeline');
}
