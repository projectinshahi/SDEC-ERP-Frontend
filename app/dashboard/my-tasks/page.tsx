import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyTasksWorkspace } from './MyTasksWorkspace';

export const metadata: Metadata = {
  title: 'My Tasks | ERP System',
  description: 'Your standalone My Tasks workspace — Today, Inbox, Outbox and real-time task chat.',
};

/**
 * My Tasks — /dashboard/my-tasks
 *
 * A completely standalone collaboration module (its own DB tables, APIs, chat
 * and permissions). Reachable from every module's sidebar. Access is gated by
 * `mytasks.view` inside the client component; per-task membership is enforced
 * server-side for details + chat.
 */
export default function MyTasksPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500 animate-pulse">Loading My Tasks…</div>}>
      <MyTasksWorkspace />
    </Suspense>
  );
}
