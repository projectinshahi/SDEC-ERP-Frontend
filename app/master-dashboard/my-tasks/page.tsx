import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyTasksWorkspace } from '@/app/dashboard/my-tasks/MyTasksWorkspace';

export const metadata: Metadata = {
  title: 'My Tasks | Master Dashboard',
  description: 'Your Global My Tasks workspace — Today, Inbox, Outbox and real-time task chat.',
};

/**
 * Founder / Master Dashboard "My Tasks" — /master-dashboard/my-tasks
 *
 * Renders the SAME independent Global My Tasks workspace component (its own
 * my_task* tables + /api/my-tasks data — NOT the Development Kanban) but keeps the
 * user inside the Master Dashboard shell (its sidebar + header stay put). This is
 * why the Founder's My Tasks link points here instead of /dashboard/my-tasks: it
 * reuses the existing MasterDashboardLayout, only the content area changes — no
 * jump into the Development module.
 */
export default function MasterMyTasksPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500 animate-pulse">Loading My Tasks…</div>}>
      <MyTasksWorkspace />
    </Suspense>
  );
}
