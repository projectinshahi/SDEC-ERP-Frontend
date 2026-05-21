'use client';

import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/Badge';
import type { User } from '@/lib/types/user-management';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

/**
 * User Table Component
 */
export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const getStatusVariant = (status: string) => {
    return status === 'active' ? 'success' : 'warning';
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-white">
        <p className="text-gray-500 text-lg">No users found</p>
        <p className="text-gray-400 text-sm mt-2">Click "Add User" to create your first user</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Roles</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 px-4">
                <p className="font-medium text-gray-800">{user.name}</p>
              </td>
              <td className="py-3 px-4 text-gray-600">{user.email}</td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role, index) => (
                    <Badge key={index} variant="info">
                      {role}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant={getStatusVariant(user.status)}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit user"
                  >
                    <Edit size={18} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete user"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
