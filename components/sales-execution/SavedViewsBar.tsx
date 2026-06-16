'use client';

import { Bookmark, Plus, Trash2, Users, Globe, User } from 'lucide-react';
import { classNames } from '@/lib/utils';
import type { SavedView, SavedViewScope } from '@/lib/types/salesExecution';

interface SavedViewsBarProps {
  views: SavedView[];
  activeViewId: number | null;
  onApply: (v: SavedView) => void;
  onSaveCurrent: () => void;
  onDelete: (id: number) => void;
  currentUserId: number;
}

const SCOPE_META: Record<SavedViewScope, { label: string; icon: typeof User }> = {
  personal: { label: 'Personal', icon: User },
  team: { label: 'Team', icon: Users },
  global: { label: 'Global', icon: Globe },
};

/**
 * SE-020.1 — Saved view chips.
 *
 * Each saved view is a clickable chip that applies its filters. Owners can
 * delete their own views; everyone can save the current filter set as a new one.
 */
export function SavedViewsBar({
  views,
  activeViewId,
  onApply,
  onSaveCurrent,
  onDelete,
  currentUserId,
}: SavedViewsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <Bookmark className="h-3.5 w-3.5" />
        Saved views
      </span>

      {views.length === 0 && (
        <span className="text-xs text-gray-400">No saved views yet</span>
      )}

      {views.map((view) => {
        const isActive = view.id === activeViewId;
        const scope = SCOPE_META[view.scope] ?? SCOPE_META.personal;
        const ScopeIcon = scope.icon;
        const canDelete = view.ownerId === currentUserId;

        return (
          <div
            key={view.id}
            className={classNames(
              'group inline-flex items-center gap-1.5 rounded-full border pl-3 pr-1.5 py-1 text-sm transition-all',
              isActive
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-700',
            )}
          >
            <button
              type="button"
              onClick={() => onApply(view)}
              className="inline-flex items-center gap-1.5 font-medium"
            >
              {view.name}
              <span
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                title={`${scope.label} view`}
              >
                <ScopeIcon className="h-2.5 w-2.5" />
                {scope.label}
              </span>
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(view.id)}
                aria-label={`Delete view ${view.name}`}
                className="rounded-full p-1 text-gray-400 opacity-60 hover:bg-red-50 hover:text-red-600 hover:opacity-100 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onSaveCurrent}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Save current view
      </button>
    </div>
  );
}
