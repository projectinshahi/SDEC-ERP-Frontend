'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DealCard } from './DealCard';
import { StageColumnMenu } from '@/components/sales-execution/pipeline/StageColumnMenu';
import { dealStageTheme } from '@/lib/data/dealStages';
import type { Deal, DealStage } from '@/lib/types/leadLifecycle';
import { formatINR } from '@/lib/utils/currency';

interface DealPipelineBoardProps {
  stages: DealStage[];
  dealsByStage: Record<string, Deal[]>;
  canMove: boolean;
  /** Can delete individual deal cards (sales.deals.delete). */
  canDeleteDeal?: boolean;
  /** Called when a deal card's delete control is used. */
  onDeleteDeal?: (deal: Deal) => void;
  /** Can add / rename / reorder stage columns (sales.deals.pipeline.manage). */
  canManageStages?: boolean;
  /** Can delete stage columns (sales.deals.pipeline.delete). */
  canDeleteStages?: boolean;
  onAddStage?: () => void;
  onRenameStage?: (stage: DealStage) => void;
  onDeleteStage?: (stage: DealStage) => void;
  /** Shift a stage one position left (-1) or right (+1). */
  onMoveStage?: (stage: DealStage, dir: -1 | 1) => void;
  /** Called when a deal is dropped on a different stage column. */
  onMove: (dealId: number, targetStage: string) => void;
}

// Centralized INR formatter (single source of truth for the ₹ symbol + Indian
// digit grouping); change lib/utils/currency.ts to adjust currency app-wide.
const money = (n: number) => formatINR(n || 0);

/**
 * Deal pipeline Kanban board (native HTML5 drag-and-drop). Mirrors the lead
 * pipeline board. Columns render in fixed stage order, including empty stages.
 */
export function DealPipelineBoard({
  stages, dealsByStage, canMove, canDeleteDeal, onDeleteDeal,
  canManageStages, canDeleteStages, onAddStage, onRenameStage, onDeleteStage, onMoveStage,
  onMove,
}: DealPipelineBoardProps) {
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
            <div className="flex items-center gap-2 pb-2 mb-1 px-1">
              <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate" title={stage.name}>{stage.name}</h2>
              <span className="bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs font-bold leading-none">
                {deals.length}
              </span>
              {canManageStages && onRenameStage && onMoveStage && onDeleteStage && (
                <StageColumnMenu
                  stageName={stage.name}
                  canDelete={!!canDeleteStages}
                  isFirst={index === 0}
                  isLast={index === stages.length - 1}
                  disableDelete={stages.length <= 1}
                  onRename={() => onRenameStage(stage)}
                  onMoveLeft={() => onMoveStage(stage, -1)}
                  onMoveRight={() => onMoveStage(stage, 1)}
                  onDelete={() => onDeleteStage(stage)}
                />
              )}
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

      {/* Add-stage ghost column (CRM-style) — mirrors the Lead pipeline. */}
      {canManageStages && onAddStage && (
        <button
          type="button"
          onClick={onAddStage}
          className="shrink-0 w-[300px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors min-h-[160px] py-8"
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
