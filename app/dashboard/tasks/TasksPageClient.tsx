'use client';

import { Breadcrumb } from '@/components/Breadcrumb';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';

/**
 * Tasks page client component.
 * Permission guard lives here (client-side) so hooks work correctly.
 */
export function TasksPageClient() {
  return (
    <PermissionPageGuard module="task">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Tasks' }]} />
      </div>

      <section className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Tasks Board</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Drag-and-drop tasks to advance workflows, search by title, and filter assignees.
          </p>
        </div>
      </section>

      <KanbanBoard />
    </PermissionPageGuard>
  );
}
