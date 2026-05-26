'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { classNames } from '@/lib/utils';

export type ProjectRole = 'admin' | 'editor' | 'viewer';

interface RoleDropdownProps {
  role: ProjectRole;
  onChange: (newRole: ProjectRole) => void;
  disabled?: boolean;
}

const roleColors = {
  admin: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30',
  editor: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30',
  viewer: 'text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/30',
};

const roleLabels = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export function RoleDropdown({ role, onChange, disabled }: RoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (newRole: ProjectRole) => {
    setIsOpen(false);
    if (newRole !== role && !disabled) {
      onChange(newRole);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'inline-flex items-center justify-between gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30',
          roleColors[role],
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
        )}
      >
        {roleLabels[role]}
        <ChevronDown size={12} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-28 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700/60 focus:outline-none overflow-hidden animate-in fade-in zoom-in duration-100">
            <div className="py-1">
              {(['admin', 'editor', 'viewer'] as ProjectRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className={classNames(
                    'block w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    role === r 
                      ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  )}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
