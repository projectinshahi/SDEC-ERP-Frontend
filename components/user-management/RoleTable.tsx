'use client';

import { Edit, Trash2, Shield } from 'lucide-react';
import { Badge } from '@/components/Badge';
import type { Role } from '@/lib/types/user-management';

interface RoleTableProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
}

/**
 * Role Table Component
 */
export function RoleTable({ roles, onEdit, onDelete }: RoleTableProps) {
  if (roles.length === 0) {
    return (
      <div className="text-center py-12 bg-white">
        <p className="text-gray-500 text-lg">No roles found</p>
        <p className="text-gray-400 text-sm mt-2">Click "Add Role" to create your first role</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {roles.map((role) => (
        <div
          key={role.id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{role.name}</h3>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Permissions</p>
              <p className="text-2xl font-bold text-gray-800">{role.permissions.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Users</p>
              <p className="text-2xl font-bold text-gray-800">{role.userCount || 0}</p>
            </div>
          </div>

          {/* Permissions Preview */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase mb-2">Permissions</p>
            <div className="flex flex-wrap gap-1">
              {role.permissions.slice(0, 3).map((permission, index) => (
                <Badge key={index} variant="default">
                  {permission}
                </Badge>
              ))}
              {role.permissions.length > 3 && (
                <Badge variant="default">+{role.permissions.length - 3} more</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => onEdit(role)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={() => onDelete(role.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
