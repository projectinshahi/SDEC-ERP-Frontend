'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { ProjectMember } from '@/components/projects/ProjectCard';
import { ProjectRole } from './RoleDropdown';

interface MemberListProps {
  members: ProjectMember[];
  onRoleChange?: (memberId: string | number, newRole: ProjectRole) => void;
  onRemove?: (member: ProjectMember) => void;
  isUpdating?: string | number | null; // ID of the member currently being updated
  readOnly?: boolean;
}

const getAvatarBgColor = (name: string) => {
  const colors = [
    'bg-blue-500 text-white',
    'bg-indigo-500 text-white',
    'bg-purple-500 text-white',
    'bg-pink-500 text-white',
    'bg-emerald-500 text-white',
    'bg-amber-500 text-white',
    'bg-cyan-500 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export function MemberList({ members, onRoleChange, onRemove, isUpdating, readOnly }: MemberListProps) {
  if (!members || members.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No members assigned to this project yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${getAvatarBgColor(member.name)}`}>
              {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {member.name}
                {member.capacityPoints ? (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                    Capacity: {member.capacityPoints}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-2">
            {!readOnly && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(member)}
                disabled={isUpdating === member.id}
                className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label={`Remove ${member.name}`}
                title="Remove Member"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
