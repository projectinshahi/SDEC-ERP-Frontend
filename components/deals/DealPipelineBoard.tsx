'use client';

import { useState } from 'react';
import { DealCard } from './DealCard';
import { dealStageTheme } from '@/lib/data/dealStages';
import type { Deal, DealStage } from '@/lib/types/leadLifecycle';

interface DealPipelineBoardProps {
  stages: DealStage[];
  dealsByStage: Record<string, Deal[]>;
  canMove: boolean;
  /** Can delete individual deal cards (sales.deals.delete). */
  canDeleteDeal?: boolean;
  /** Called when a deal card's delete control is used. */
  onDeleteDeal?: (deal: Deal) => void;
  /** Called when a deal is dropped on a different stage column. */
  onMove: (dealId: number, targetStage: string) => void;
}

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

/**
 * Deal pipeline Kanban board (native HTML5 drag-and-drop). Mirrors the lead
 * pipeline board. Columns render in fixed stage order, including empty stages.
 */
export function DealPipelineBoard({ stages, dealsByStage, canMove, canDeleteDeal, onDeleteDeal, onMove }: DealPipelineBoardProps) {
  const [draggedDealId, setDraggedDealId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDrop = (stageName: string) => {
    if (draggedDealId != null) onMove(draggedDealId, stageName);
    setDraggedDealId(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage, index) => {
        const theme = dealStageTheme(index);
        const deals = dealsByStage[stage.name] ?? [];
        const total = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
        const isOver = dragOverStage === stage.name;
        return (
          <div
            key={stage.id}
            onDragOver={(e) => { e.preventDefault(); if (canMove) setDragOverStage(stage.name); }}
            onDragLeave={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                setDragOverStage((s) => (s === stage.name ? null : s));
              }
            }}
            onDrop={() => canMove && handleDrop(stage.name)}
            className={`shrink-0 w-[300px] flex flex-col bg-gray-50/80 dark:bg-gray-900/40 rounded-xl border border-gray-200/60 dark:border-gray-800/80 p-3 h-full max-h-[78vh] border-t-4 ${theme.border} transition-all ${
              isOver ? 'ring-2 ring-blue-500/30 border-blue-200 dark:border-blue-900' : ''
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-1 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{stage.name}</h2>
                <span className="bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs font-bold leading-none">
                  {deals.length}
                </span>
              </div>
            </div>
            {deals.length > 0 && (
              <p className="text-[11px] text-gray-400 px-1 mb-2">{money(total)} total</p>
            )}

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
              {deals.length > 0 ? (
                deals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    draggable={canMove}
                    isDragging={draggedDealId === deal.id}
                    onDragStart={setDraggedDealId}
                    onDragEnd={() => { setDraggedDealId(null); setDragOverStage(null); }}
                    canDelete={canDeleteDeal}
                    onDelete={onDeleteDeal ? () => onDeleteDeal(deal) : undefined}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-[100px] text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  No deals in {stage.name}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
