import type { Metadata } from 'next';
import { NoticeClient } from './NoticeClient';

export const metadata: Metadata = {
  title: 'Notice | ERP System',
  description: 'Company notices and announcements.',
};

/**
 * Notice — /dashboard/notice
 *
 * A STANDALONE top-level module (peer of My Tasks), registered as a global sidebar
 * item in lib/sidebar/sidebar.config.ts and gated by the `notice.view` permission.
 * Renders inside the shared DashboardLayout (app/dashboard/layout.tsx) — no separate
 * sidebar/layout is duplicated. The route is a SHARED_PREFIX, so the module-isolation
 * guard lets any module's user reach it; the page-level guard below enforces the
 * permission (the layout guard intentionally waves shared paths through).
 */
export default function NoticePage() {
  return <NoticeClient />;
}
