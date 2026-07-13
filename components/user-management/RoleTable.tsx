'use client';

import { useState } from 'react';
import { Edit, Trash2, Shield } from 'lucide-react';
import { Badge } from '@/components/Badge';
import type { Role } from '@/lib/types/user-management';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { classNames } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-fuchsia-500',
];
function avatarOf(name: string) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { initials, color: AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] };
}

interface RoleTableProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
}

/**
 * Role Table Component
 */
export function RoleTable({ roles, onEdit, onDelete }: RoleTableProps) {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const toggleExpand = (roleId: string) => {
    const next = new Set(expandedRoles);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setExpandedRoles(next);
  };

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

          {/* Assigned Users Preview */}
          {role.users && role.users.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Assigned Users</p>
              <div className="flex flex-wrap gap-1.5">
                {(expandedRoles.has(role.id) ? role.users : role.users.slice(0, 6)).map((u, index) => {
                  const av = avatarOf(u.name);
                  return (
                    <div
                      key={index}
                      title={u.name}
                      className={classNames(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-default shadow-sm ring-2 ring-white',
                        av.color
                      )}
                    >
                      {av.initials}
                    </div>
                  );
                })}
                {!expandedRoles.has(role.id) && role.users.length > 6 && (
                  <button
                    onClick={() => toggleExpand(role.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm ring-2 ring-white"
                    title={`Show ${role.users.length - 6} more`}
                  >
                    +{role.users.length - 6}
                  </button>
                )}
                {expandedRoles.has(role.id) && role.users.length > 6 && (
                  <button
                    onClick={() => toggleExpand(role.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm ring-2 ring-white"
                    title="Show less"
                  >
                    -
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <PermissionGuard require="role.update">
              <button
                onClick={() => onEdit(role)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                <Edit size={16} />
                Edit
              </button>
            </PermissionGuard>
            <PermissionGuard require="role.delete">
              <button
                onClick={() => onDelete(role.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </PermissionGuard>
          </div>
        </div>
      ))}
    </div>
  );
}
