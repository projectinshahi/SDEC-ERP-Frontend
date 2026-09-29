'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, CalendarClock, UserX, Inbox, Archive } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { StageBackReasonModal, type StageBackRequest } from '@/components/marketing/StageBackReasonModal';
import { moveContentStage, setContentArchived, isBackwardMove, type MarketingContent } from '@/lib/api/marketingContent';
import { BOARD_COLUMNS, groupByColumn, stageLabel, type BoardColumn } from '@/lib/marketing/projectBoard';

/**
 * MK-001.4 — the project Content Kanban.
 *
 * Five production columns plus one read-only "Other stages" column, all mapped
 * onto the canonical CONTENT_STAGES keys (see lib/marketing/projectBoard). This
 * board defines no stages of its own and persists no stage of its own: every
 * move goes through moveContentStage → applyStageMove on the server, so the
 * gates, the audit entry and the notifications are the same ones the main
 * Content Production board uses.
 */

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

const PRIORITY_TONE: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

function CardTile({ item, draggable, isDragging, showStage, canArchive, onDragStart, onDragEnd, onArchive }: {
  item: MarketingContent; draggable: boolean; isDragging: boolean; showStage: boolean;
  canArchive: boolean;
  onDragStart: (id: number) => void; onDragEnd: () => void; onArchive: (c: MarketingContent) => void;
}) {
  const assignee = item.ownerName || item.editorName || item.designerName || item.videographerName;
  return (
    <Link
      href={`/dashboard/marketing/content/${item.id}`}
      draggable={draggable}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(item.id); }}
      onDragEnd={onDragEnd}
      className={classNames(
        'block rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 shadow-sm transition-all hover:border-cyan-300 hover:shadow',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs font-bold leading-snug text-gray-800 dark:text-gray-100 line-clamp-2">
          {item.title}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {item.priority && (
            <span className={classNames('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', PRIORITY_TONE[item.priority] ?? PRIORITY_TONE.low)}>
              {item.priority}
            </span>
          )}
          {canArchive && (
            <button
              type="button"
              title="Archive card"
              aria-label={`Archive ${item.title}`}
              /* The tile is a link to the card detail page; without these the
                 archive click would navigate instead of opening the dialog. */
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(item); }}
              className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-amber-600 dark:hover:bg-gray-800"
            >
              <Archive className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {item.content_id && <p className="mt-1 text-[10px] font-semibold text-gray-400">{item.content_id}</p>}

      {/* Only the overflow column needs this: there, one column holds several
          stages, so the tile has to say which one it is actually in. */}
      {showStage && (
        <span className="mt-1.5 inline-block rounded border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500 dark:text-gray-400">
          {stageLabel(item.stage)}
        </span>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {item.deadline && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
            <CalendarClock className="h-3 w-3" />{item.deadline}
          </span>
        )}
        {assignee ? (
          <span className="truncate text-[10px] font-semibold text-gray-500 dark:text-gray-400">{assignee}</span>
        ) : (
          /* MK-001.5 — unassigned cards stay valid, but they are flagged so the
             board does not quietly hide work with nobody on it. */
          <span
            title="No editor or producer assigned"
            className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          >
            <UserX className="h-2.5 w-2.5" /> Unassigned
          </span>
        )}
      </div>
    </Link>
  );
}

interface Props {
  cards: MarketingContent[];
  setCards: React.Dispatch<React.SetStateAction<MarketingContent[]>>;
  canMove: boolean;
  canCreate: boolean;
  canArchive: boolean;
  loading?: boolean;
  onAddCard: (columnKey: string) => void;
  onMoved: () => void;
}

export function ProjectBoard({ cards, setCards, canMove, canCreate, canArchive, loading, onAddCard, onMoved }: Props) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [stageBack, setStageBack] = useState<StageBackRequest | null>(null);

  const byColumn = useMemo(() => groupByColumn(cards), [cards]);

  /** The ONE place this board persists a stage move. */
  const commitMove = async (id: number, prevStage: string, stageKey: string, reason?: string) => {
    // Optimistic, then reverted if the server refuses — the card never sits in a
    // column the backend did not agree to.
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage: stageKey } : c)));
    try {
      await moveContentStage(id, stageKey, reason);
      onMoved();
    } catch (err) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage: prevStage } : c)));
      throw err;
    }
  };

  /* MK-001.5 — archive. Confirmed through the app-wide dialog, which owns the
   * loading state and the double-click guard; the card is removed from local
   * state only AFTER the server confirms, so a failure leaves the board honest. */
  const onArchive = async (card: MarketingContent) => {
    await confirm({
      title: 'Archive card',
      message: `Archive "${card.title}"? It is removed from the active board.`,
      warning: 'The card is not deleted — its history and attachments are kept.',
      confirmLabel: 'Archive',
      intent: 'danger',
      onConfirm: async () => {
        await setContentArchived(card.id, true);
        setCards((prev) => prev.filter((c) => c.id !== card.id));
        toast('Card archived successfully', 'success');
      },
    });
  };

  const handleDrop = async (column: BoardColumn) => {
    const id = draggedId;
    setDraggedId(null);
    setDragOver(null);
    if (id == null || !column.droppable) return;

    const item = cards.find((c) => c.id === id);
    if (!item || item.stage === column.key) return;
    const prevStage = item.stage;

    // Backward moves use the EXISTING reason workflow — nothing is moved or
    // persisted until a reason is given, so cancelling leaves the card put. No
    // second confirmation is stacked on top of it.
    if (isBackwardMove(prevStage, column.key)) {
      setStageBack({ cardId: id, cardTitle: item.title, from: prevStage, to: column.key });
      return;
    }
    try {
      await commitMove(id, prevStage, column.key);
      toast(`Card moved to ${column.label}`, 'success');
    } catch (err) {
      toast(apiError(err) || `Card cannot be moved to ${column.label}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((c) => (
          <div key={c.key} className="w-[264px] shrink-0 space-y-2 rounded-xl border border-gray-200 dark:border-gray-800 p-2.5">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* The BOARD scrolls horizontally, not the page. */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((column) => {
          const items = byColumn[column.key] ?? [];
          const isOver = dragOver === column.key;
          const overflow = !column.droppable;
          return (
            <div
              key={column.key}
              onDragOver={(e) => { if (!canMove || overflow) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDragEnter={(e) => { if (!canMove || overflow) return; e.preventDefault(); setDragOver(column.key); }}
              onDragLeave={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) {
                  setDragOver((s) => (s === column.key ? null : s));
                }
              }}
              onDrop={(e) => { if (!canMove || overflow) return; e.preventDefault(); void handleDrop(column); }}
              className={classNames(
                'flex max-h-[70vh] w-[264px] shrink-0 flex-col rounded-xl border p-2.5 transition-all',
                overflow
                  ? 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-950/30'
                  : 'border-gray-200/70 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40',
                isOver && 'ring-2 ring-cyan-500/30 bg-cyan-50/30 dark:bg-cyan-950/10',
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="truncate text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  {column.label}
                </h3>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="rounded-full bg-gray-200/80 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold leading-none text-gray-600 dark:text-gray-400">
                    {items.length}
                  </span>
                  {canCreate && !overflow && (
                    <button type="button" onClick={() => onAddCard(column.key)}
                      aria-label={`Add a card to ${column.label}`}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-200/70 hover:text-cyan-600 dark:hover:bg-gray-800">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                {items.length === 0 ? (
                  /* Empty columns stay visible — a stage with no work is
                     information, not something to collapse away. */
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-6 text-center">
                    <Inbox className="h-4 w-4 text-gray-300" />
                    <p className="mt-1 px-2 text-[10px] font-medium text-gray-400">
                      {overflow ? 'Nothing outside the production stages' : 'No cards in this stage'}
                    </p>
                  </div>
                ) : (
                  items.map((item) => (
                    <CardTile
                      key={item.id}
                      item={item}
                      draggable={canMove && !overflow}
                      isDragging={draggedId === item.id}
                      showStage={overflow}
                      canArchive={canArchive}
                      onDragStart={setDraggedId}
                      onDragEnd={() => { setDraggedId(null); setDragOver(null); }}
                      onArchive={(c) => void onArchive(c)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Existing backward-move workflow, reused verbatim. */}
      <StageBackReasonModal
        request={stageBack}
        onCancel={() => setStageBack(null)}
        onConfirm={async (reason) => {
          const req = stageBack;
          if (!req) return;
          await commitMove(req.cardId, req.from, req.to, reason);
          setStageBack(null);
          toast(`Card moved to ${stageLabel(req.to)}`, 'success');
        }}
      />
    </>
  );
}
