'use client';

import React, { useState } from 'react';
import { LeadCard } from './LeadCard';
import { leadStageTheme } from '@/lib/data/leadStages';
import type { Lead, LeadStage } from '@/lib/types/lead';

interface LeadPipelineBoardProps {
  stages: LeadStage[];
  leadsByStage: Record<string, Lead[]>;
  canMove: boolean;
  /** Called when a lead is dropped on a different stage column. */
  onMove: (leadId: number, targetStage: string) => void;
}

/**
 * Lead Pipeline Kanban board. Renders one column per pipeline stage in fixed
 * order, including empty columns, with horizontal scrolling for large volumes.
 * Drag-and-drop uses native HTML5 events (same approach as the Task board).
 * Dropping outside a valid column simply ends the drag with no change, so the
 * card reverts to its current stage.
 */
export function LeadPipelineBoard({ stages, leadsByStage, canMove, onMove }: LeadPipelineBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

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
            {/* Column header with live metrics */}
            <div className="pb-2 mb-1 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{stage.name}</h2>
                <span className="flex items-center justify-center bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs font-bold leading-none select-none">
                  {columnLeads.length}
                </span>
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
    </div>
  );
}
