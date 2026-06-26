'use client';

import React, { useState } from 'react';
import {
  MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { LeadCard } from './LeadCard';
import { leadStageTheme } from '@/lib/data/leadStages';
import type { Lead, LeadStage } from '@/lib/types/lead';

interface LeadPipelineBoardProps {
  stages: LeadStage[];
  leadsByStage: Record<string, Lead[]>;
  /** Can move lead cards between columns (sales.edit). */
  canMove: boolean;
  /** Can add / rename / reorder stages (sales.edit). */
  canManageStages: boolean;
  /** Can delete stages (sales.delete). */
  canDeleteStages: boolean;
  /** Can delete individual lead cards (sales.leads.delete). */
  canDeleteLead?: boolean;
  /** Called when a lead card's delete control is used. */
  onDeleteLead?: (lead: Lead) => void;
  /** Called when a lead is dropped on a different stage column. */
  onMove: (leadId: number, targetStage: string) => void;
  onAddStage: () => void;
  onRenameStage: (stage: LeadStage) => void;
  onDeleteStage: (stage: LeadStage) => void;
  /** Shift a stage one position left (-1) or right (+1). */
  onMoveStage: (stage: LeadStage, dir: -1 | 1) => void;
}

/**
 * Lead Pipeline Kanban board. Renders one column per pipeline stage in fixed
 * order (including empty columns), with horizontal scrolling for large volumes.
 *
 * Lead-card drag-and-drop uses native HTML5 events (same approach as the Task
 * board); dropping outside a valid column ends the drag with no change. Stage
 * management (add / rename / reorder / delete) lives in each column header so
 * the structure is editable without leaving the board.
 */
export function LeadPipelineBoard({
  stages, leadsByStage, canMove, canManageStages, canDeleteStages,
  canDeleteLead, onDeleteLead,
  onMove, onAddStage, onRenameStage, onDeleteStage, onMoveStage,
}: LeadPipelineBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [menuStageId, setMenuStageId] = useState<number | null>(null);

  const handleDropOnStage = (stageName: string) => {
    if (draggedLeadId == null) return;
    onMove(draggedLeadId, stageName);
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {stages.map((stage, index) => {
        const theme = leadStageTheme(index);
        const columnLeads = leadsByStage[stage.name] || [];
        const isOver = dragOverStage === stage.name;
        const isFirst = index === 0;
        const isLast = index === stages.length - 1;
        const menuOpen = menuStageId === stage.id;
        const hotCount = columnLeads.filter((l) => (l.score ?? 0) >= 80).length;
        const avgScore = columnLeads.length
          ? Math.round(columnLeads.reduce((sum, l) => sum + (l.score ?? 0), 0) / columnLeads.length)
          : 0;

        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              if (!canMove) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDragEnter={(e) => {
              if (!canMove) return;
              e.preventDefault();
              setDragOverStage(stage.name);
            }}
            onDragLeave={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (
                e.clientX < rect.left || e.clientX >= rect.right ||
                e.clientY < rect.top || e.clientY >= rect.bottom
              ) {
                setDragOverStage((s) => (s === stage.name ? null : s));
              }
            }}
            onDrop={(e) => {
              if (!canMove) return;
              e.preventDefault();
              handleDropOnStage(stage.name);
            }}
            className={`shrink-0 w-[300px] flex flex-col bg-gray-50/80 dark:bg-gray-900/40 rounded-xl border border-gray-200/60 dark:border-gray-800/80 border-t-4 ${theme.border} transition-all duration-200 p-3 max-h-[78vh] ${
              isOver ? 'ring-2 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-950/10' : ''
            }`}
          >
            {/* Column header with live metrics + management menu */}
            <div className="pb-2 mb-1 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate" title={stage.name}>
                  {stage.name}
                </h2>
                <span className="flex items-center justify-center bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs font-bold leading-none select-none">
                  {columnLeads.length}
                </span>

                {canManageStages && (
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      onClick={() => setMenuStageId(menuOpen ? null : stage.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors"
                      aria-label={`Manage ${stage.name} stage`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuOpen && (
                      <>
                        {/* Click-away backdrop */}
                        <div className="fixed inset-0 z-10" onClick={() => setMenuStageId(null)} aria-hidden="true" />
                        <div
                          role="menu"
                          className="absolute right-0 top-8 z-20 w-44 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 text-sm"
                        >
                          <MenuItem
                            icon={Pencil}
                            label="Rename"
                            onClick={() => { setMenuStageId(null); onRenameStage(stage); }}
                          />
                          <MenuItem
                            icon={ChevronLeft}
                            label="Move left"
                            disabled={isFirst}
                            onClick={() => { setMenuStageId(null); onMoveStage(stage, -1); }}
                          />
                          <MenuItem
                            icon={ChevronRight}
                            label="Move right"
                            disabled={isLast}
                            onClick={() => { setMenuStageId(null); onMoveStage(stage, 1); }}
                          />
                          {canDeleteStages && (
                            <>
                              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                              <MenuItem
                                icon={Trash2}
                                label="Delete"
                                danger
                                disabled={stages.length <= 1}
                                onClick={() => { setMenuStageId(null); onDeleteStage(stage); }}
                              />
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {columnLeads.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-1 ml-[18px] flex items-center gap-2">
                  <span>avg score {avgScore}</span>
                  {hotCount > 0 && <span className="text-rose-500 font-semibold">🔥 {hotCount} hot</span>}
                </p>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[120px]">
              {columnLeads.length > 0 ? (
                columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    draggable={canMove}
                    isDragging={draggedLeadId === lead.id}
                    onDragStart={setDraggedLeadId}
                    onDragEnd={() => {
                      setDraggedLeadId(null);
                      setDragOverStage(null);
                    }}
                    canDelete={canDeleteLead}
                    onDelete={onDeleteLead ? () => onDeleteLead(lead) : undefined}
                  />
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg py-8 px-2">
                  No leads in {stage.name}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add-stage ghost column (CRM-style) */}
      {canManageStages && (
        <button
          type="button"
          onClick={onAddStage}
          className="shrink-0 w-[300px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors min-h-[160px] max-h-[78vh] py-8"
        >
          <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Plus size={20} />
          </span>
          <span className="text-sm font-semibold">Add Stage</span>
        </button>
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
