import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';

export const metadata: Metadata = {
  title: 'Tasks Kanban Board | ERP System',
  description: 'Manage and track project tasks on a modern, Jira-like Kanban board.',
  keywords: ['Kanban Board', 'Jira', 'ERP', 'Tasks Management', 'Workflows'],
  openGraph: {
    title: 'Tasks Kanban Board | ERP System',
    description: 'Manage and track project tasks on a modern, Jira-like Kanban board.',
  },
};

/**
 * Tasks Page Route - /tasks
 * Wraps the interactive KanbanBoard inside the DashboardLayout and Breadcrumbs.
 */
export default function TasksRoutePage() {
  return (
    <DashboardLayout>
      {/* Page Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Tasks' },
          ]}
        />
      </div>

      {/* Page Heading Title */}
      <section className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Tasks Board</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Drag-and-drop tasks to advance workflows, search by title, and filter assignees.
          </p>
        </div>
      </section>

      {/* Kanban Board Container */}
      <KanbanBoard />
    </DashboardLayout>
  );
}
