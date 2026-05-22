'use client';

import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/Badge';
import type { User } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';

// Flexible interface supporting database shapes and local client structures
interface UserTableProps {
  users: (User & { role?: string })[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

/**
 * Reusable User Table Component
 */
export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  // Normalizes status for robust styling matching (Active/active -> success, Inactive/inactive -> warning/danger)
  const getStatusConfig = (statusStr: string) => {
    const s = String(statusStr).toLowerCase();
    if (s === 'active') {
      return {
        label: 'Active',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-sm',
      };
    }
    return {
      label: 'Inactive',
      className: 'bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-sm',
    };
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-100 p-8 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <p className="text-gray-700 font-bold text-sm">No users found</p>
        <p className="text-gray-400 text-xs mt-1">There are no user accounts matching this criteria in the database.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => {
              // Standardizes roles for rendering
              const userRoles: string[] = user.roles && user.roles.length > 0 
                ? user.roles 
                : user.role 
                ? user.role.split(',').map((r: string) => r.trim()) 
                : ['User'];

              const statusConfig = getStatusConfig(user.status);

              return (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/45 transition-colors duration-150 group"
                >
                  {/* Name column */}
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                  </td>

                  {/* Email column */}
                  <td className="py-4 px-6 text-slate-600 text-sm font-medium">
                    {user.email}
                  </td>

                  {/* Role column */}
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {userRoles.map((r, index) => (
                        <span
                          key={index}
                          className="bg-slate-150 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[10px] tracking-wide uppercase border border-slate-200/50 shadow-sm"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status column */}
                  <td className="py-4 px-6">
                    <span className={statusConfig.className}>
                      {statusConfig.label}
                    </span>
                  </td>

                  {/* Actions column */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => onEdit(user as User)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Edit user settings"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(String(user.id))}
                        className="p-1.5 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Permanently delete user"
                      >
                        <Trash2 size={16} />
                      </button>
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
