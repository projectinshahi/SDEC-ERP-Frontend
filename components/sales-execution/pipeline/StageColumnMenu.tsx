'use client';

import React, { useState } from 'react';
import { MoreVertical, Pencil, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface StageColumnMenuProps {
  /** Accessible label noun (usually the stage name). */
  stageName: string;
  /** Show the Delete item (gated on the *.pipeline.delete permission). */
  canDelete: boolean;
  isFirst: boolean;
  isLast: boolean;
  /** Disable Delete (e.g. the last remaining column can't be removed). */
  disableDelete?: boolean;
  onRename: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: () => void;
}

/**
 * Shared Kanban column header menu for BOTH the Lead and Deal pipeline boards —
 * one implementation so the two pipelines behave identically (Rename, Move
 * left/right, Delete). Self-contained open/close state. The parent gates whether
 * it renders at all (manage permission) and whether Delete shows (delete perm).
 */
export function StageColumnMenu({
  stageName, canDelete, isFirst, isLast, disableDelete, onRename, onMoveLeft, onMoveRight, onDelete,
}: StageColumnMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors"
        aria-label={`Manage ${stageName} column`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 top-8 z-20 w-44 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 text-sm"
          >
            <MenuItem icon={Pencil} label="Rename" onClick={() => { setOpen(false); onRename(); }} />
            <MenuItem icon={ChevronLeft} label="Move left" disabled={isFirst} onClick={() => { setOpen(false); onMoveLeft(); }} />
            <MenuItem icon={ChevronRight} label="Move right" disabled={isLast} onClick={() => { setOpen(false); onMoveRight(); }} />
            {canDelete && (
              <>
                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                <MenuItem icon={Trash2} label="Delete" danger disabled={disableDelete} onClick={() => { setOpen(false); onDelete(); }} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, disabled, danger,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60'
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
