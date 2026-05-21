import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';

export const metadata: Metadata = {
  title: 'Tasks | ERP System',
  description: 'Manage and track project tasks on a modern, Jira-like Kanban board.',
};

/**
 * Tasks Page Route - /dashboard/tasks
 * Integrates the high-fidelity Kanban Board directly with the ERP sidebar.
 */
export default function TasksPage() {
  return (
    <DashboardLayout>
      {/* Page Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb
          items={[
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

      {/* Kanban Board Component */}
      <KanbanBoard />
    </DashboardLayout>
  );
}
