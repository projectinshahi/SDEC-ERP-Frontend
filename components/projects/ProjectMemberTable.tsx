'use client';

import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { fetchUsers, UserDbResponse } from '@/lib/api/users';

export interface MemberDetail {
  userId: number;
  role: string;
  capacityPoints: number;
}

interface ProjectMemberTableProps {
  memberDetails: MemberDetail[];
  onChange: (details: MemberDetail[]) => void;
  error?: string;
}

export function ProjectMemberTable({ memberDetails, onChange, error }: ProjectMemberTableProps) {
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchUsers();
        if (active) setUsers(data);
      } catch (err) {
        if (active) {
          setUsers([
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Manager', status: 'active' }
          ]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const handleAddMember = () => {
    onChange([...memberDetails, { userId: 0, role: 'viewer', capacityPoints: 0 }]);
  };

  const handleRemoveMember = (index: number) => {
    const newDetails = [...memberDetails];
    newDetails.splice(index, 1);
    onChange(newDetails);
  };

  const handleChange = (index: number, field: keyof MemberDetail, value: any) => {
    const newDetails = [...memberDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    onChange(newDetails);
  };

  const availableUsers = users.filter(
    (u) => !memberDetails.some((m) => m.userId === u.id)
  );

  return (
    <div className="w-full">
      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        Team Members <span className="text-rose-500" aria-hidden="true">*</span>
      </label>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Member</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Capacity/Day</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {memberDetails.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                    No members assigned yet.
                  </td>
                </tr>
              ) : (
                memberDetails.map((member, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-3 py-2 min-w-[200px]">
                      <select
                        value={member.userId || ''}
                        onChange={(e) => handleChange(index, 'userId', Number(e.target.value))}
                        className="w-full bg-transparent border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="" disabled>Select User</option>
                        {member.userId ? (
                          <option value={member.userId}>
                            {users.find((u) => u.id === member.userId)?.name || 'Unknown User'}
                          </option>
                        ) : null}
                        {availableUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-2 w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={member.capacityPoints}
                        onChange={(e) => handleChange(index, 'capacityPoints', Number(e.target.value))}
                        className="w-full bg-transparent border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="text-gray-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/30">
          <button
            type="button"
            onClick={handleAddMember}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Plus size={14} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-rose-500 text-xs mt-1.5 font-medium animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
