import type { Metadata } from 'next';
import { NoticeClient } from '@/app/dashboard/notice/NoticeClient';

export const metadata: Metadata = {
  title: 'Notice | Master Dashboard',
  description: 'Company notices and announcements.',
};

/**
 * Founder / Master Dashboard "Notice" — /master-dashboard/notice
 *
 * Renders the SAME standalone Notice module component (its own notices tables +
 * /api/notices data) but keeps the user inside the Master Dashboard shell (its
 * sidebar + header stay put) — identical to how /master-dashboard/my-tasks reuses
 * MyTasksWorkspace. This is why the Founder's Notice link points here instead of
 * /dashboard/notice: only the content area changes, no jump into the Development
 * module. NoticeClient still runs its own PermissionPageGuard (notice.view); the
 * SuperAdmin/global-admin bypass satisfies it, so nothing extra is needed here.
 */
export default function MasterNoticePage() {
  return <NoticeClient />;
}
