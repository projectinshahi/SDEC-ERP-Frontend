import type { Metadata } from 'next';
import { TasksPageClient } from './TasksPageClient';

export const metadata: Metadata = {
  title: 'Tasks | ERP System',
  description: 'Manage and track project tasks on a modern, Jira-like Kanban board.',
};

/**
 * Tasks Page Route - /dashboard/tasks
 * Server Component wrapper — permission guard lives in the client component.
 */
export default function TasksPage() {
  return <TasksPageClient />;
}
