'use client';

import { Edit, Trash2 } from 'lucide-react';
import type { Bug } from '@/lib/api/bugs';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { classNames } from '@/lib/utils';

interface BugTableProps {
  bugs: Bug[];
  onEdit: (bug: Bug) => void;
  onDelete: (bugId: number) => void;
}

export function BugTable({ bugs, onEdit, onDelete }: BugTableProps) {
  const getStatusConfig = (statusStr: string) => {
    const s = String(statusStr).toLowerCase();
    switch (s) {
      case 'open':
        return { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-100' };
      case 'in_progress':
        return { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'resolved':
        return { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'closed':
        return { label: 'Closed', className: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: statusStr, className: 'bg-gray-50 text-gray-700 border-gray-100' };
    }
  };

  const getPriorityConfig = (priorityStr: string) => {
    const p = String(priorityStr).toLowerCase();
    switch (p) {
      case 'critical':
        return { label: 'Critical', className: 'text-rose-600 bg-rose-50 border-rose-100' };
      case 'high':
        return { label: 'High', className: 'text-orange-600 bg-orange-50 border-orange-100' };
      case 'medium':
        return { label: 'Medium', className: 'text-blue-600 bg-blue-50 border-blue-100' };
      case 'low':
        return { label: 'Low', className: 'text-slate-600 bg-slate-50 border-slate-100' };
      default:
        return { label: priorityStr, className: 'text-gray-600 bg-gray-50 border-gray-100' };
    }
  };

  if (bugs.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-100 p-8 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <p className="text-gray-700 font-bold text-sm">No bugs found</p>
        <p className="text-gray-400 text-xs mt-1">There are no bugs reported yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Bug</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bugs.map((bug) => {
              const statusConfig = getStatusConfig(bug.status);
              const priorityConfig = getPriorityConfig(bug.priority);

              return (
                <tr key={bug.id} className="hover:bg-slate-50/45 transition-colors duration-150 group">
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-800 text-sm truncate max-w-xs" title={bug.title}>{bug.title}</p>
                    {bug.severity && <p className="text-xs text-slate-500 mt-0.5">Severity: {bug.severity}</p>}
                  </td>
                  <td className="py-4 px-6">
                    <span className={classNames("border font-bold px-2.5 py-0.5 rounded-full text-[11px] shadow-sm uppercase tracking-wide", statusConfig.className)}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={classNames("border font-bold px-2.5 py-0.5 rounded-full text-[11px] shadow-sm uppercase tracking-wide", priorityConfig.className)}>
                      {priorityConfig.label}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-600 text-sm font-medium">
                    {bug.assignedTo || '-'}
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs font-medium">
                    {new Date(bug.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                      <PermissionGuard require="bugs.update">
                        <button
                          onClick={() => onEdit(bug)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Edit bug"
                        >
                          <Edit size={16} />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard require="bugs.delete">
                        <button
                          onClick={() => onDelete(bug.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Delete bug"
                        >
                          <Trash2 size={16} />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
