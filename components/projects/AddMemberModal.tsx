'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Search, UserPlus } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { ProjectMember } from '@/components/projects/ProjectCard';
import { fetchUsers } from '@/lib/api/users';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { userId: number; role: 'admin' | 'editor' | 'viewer' }) => Promise<void>;
  existingMembers: ProjectMember[];
}

export function AddMemberModal({ isOpen, onClose, onSubmit, existingMembers }: AddMemberModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setSearchQuery('');
      setSelectedUserId(null);
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({ userId: selectedUserId, role: 'viewer' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out users who are already members
  const availableUsers = users.filter(
    (u) => !existingMembers.some((em) => em.userId === u.id)
  );

  const filteredUsers = availableUsers.filter(
    (u) => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Project Member" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* User Search & Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            Select User <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all outline-none"
            />
          </div>
          
          <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
            {isLoadingUsers ? (
              <div className="p-4 text-center text-sm text-gray-500 font-medium">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 font-medium">
                {searchQuery ? 'No matching users found.' : 'All users are already members.'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filteredUsers.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={classNames(
                        'w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer',
                        selectedUserId === user.id ? 'bg-blue-50/80 dark:bg-blue-900/40 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                      )}
                    >
                      <div>
                        <p className={classNames("text-sm font-semibold", selectedUserId === user.id ? "text-blue-700 dark:text-blue-400" : "text-gray-800 dark:text-gray-200")}>{user.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
                      </div>
                      {selectedUserId === user.id && (
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>



        {/* Actions */}
        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800/60 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!selectedUserId || isSubmitting}>
            <UserPlus size={16} className="mr-1.5" />
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
