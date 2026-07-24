import { redirect } from 'next/navigation';

/** Moved under the Pipeline module. Redirect preserves old links/bookmarks. */
export default function LeadAgingRedirect() {
  redirect('/dashboard/sales/pipeline/aging');
}
