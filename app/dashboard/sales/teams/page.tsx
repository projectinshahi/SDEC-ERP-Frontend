import { redirect } from 'next/navigation';

/**
 * Team management is now consolidated into the single "Team" page
 * (/dashboard/sales/team → "Teams" tab). This former route redirects there,
 * preserving any existing bookmarks/links — there is no separate Teams page.
 */
export default function SalesTeamsRedirect() {
  redirect('/dashboard/sales/team');
}
