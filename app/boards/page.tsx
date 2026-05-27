'use client';

import { Breadcrumb } from '@/components/Breadcrumb';
import { BoardList } from '@/components/boards/BoardList';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';

export default function BoardsPage() {
  return (
    <PermissionPageGuard module="task">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Boards', href: '/boards' }]} />
      </div>

      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Task Boards</h1>
        <p className="text-gray-500 mt-1 text-sm max-w-2xl">
          Overview of all project task boards across the ERP system. Select a board to view or manage its Kanban tasks.
        </p>
      </section>

      <BoardList />
    </PermissionPageGuard>
  );
}
