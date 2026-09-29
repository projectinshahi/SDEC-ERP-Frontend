import { CONTENT_STAGES, BLOCKED_STAGE } from '@/lib/api/marketingContent';

/**
 * MK-001.4 — the project board's column model.
 *
 * The sprint asks for five production columns. The module already has ONE
 * canonical pipeline (CONTENT_STAGES, 10 stages + blocked) that the stage gates,
 * the approval routing, the scheduling flow and the audit trail are all built
 * on. So this file does not define stages — it defines a VIEW over them:
 *
 *   • five primary columns, each mapped to an existing canonical stage key
 *   • one "Other stages" column collecting every remaining canonical stage
 *
 * That last column is the difference between a focused board and a board that
 * silently loses cards. A card in Ideas, Strategy, Creative, Scheduled,
 * Analytics or Blocked still belongs to the project, and a board that simply
 * omitted it would be the "missing cards" bug rather than a cleaner layout.
 *
 * Nothing here is a second stage definition: every key below is an existing
 * CONTENT_STAGES key, and moving a card still goes through moveContentStage →
 * applyStageMove on the server.
 */

export interface BoardColumn {
  /** Canonical stage key a drop into this column moves the card to. */
  key: string;
  label: string;
  /** Canonical stages whose cards appear here. */
  stages: string[];
  /** The overflow column cannot be a drop target — it holds several stages, so
   *  "drop here" would have no single meaning. */
  droppable: boolean;
}

/** The five production columns, in order, mapped onto canonical stage keys. */
export const PRIMARY_COLUMNS: BoardColumn[] = [
  { key: 'script', label: 'Script Ready', stages: ['script'], droppable: true },
  { key: 'production', label: 'With Production', stages: ['production'], droppable: true },
  { key: 'editing', label: 'Editing', stages: ['editing'], droppable: true },
  { key: 'review', label: 'Ready for Review', stages: ['review'], droppable: true },
  { key: 'published', label: 'Published', stages: ['published'], droppable: true },
];

const PRIMARY_STAGE_KEYS = PRIMARY_COLUMNS.flatMap((c) => c.stages);

/** Every canonical stage that is not one of the five. */
export const OTHER_STAGES: string[] = [
  ...CONTENT_STAGES.map((s) => s.key).filter((k) => !PRIMARY_STAGE_KEYS.includes(k)),
  BLOCKED_STAGE.key,
];

export const OTHER_COLUMN: BoardColumn = {
  key: '__other__',
  label: 'Other stages',
  stages: OTHER_STAGES,
  droppable: false,
};

export const BOARD_COLUMNS: BoardColumn[] = [...PRIMARY_COLUMNS, OTHER_COLUMN];

/** Human label for a canonical stage key (used on the overflow column's tiles). */
export const stageLabel = (key: string): string =>
  CONTENT_STAGES.find((s) => s.key === key)?.label
  ?? (key === BLOCKED_STAGE.key ? BLOCKED_STAGE.label : key);

/** Which column a card belongs in. Exhaustive by construction: PRIMARY + OTHER
 *  together cover every canonical stage, so a card can never land nowhere —
 *  and, because the lookup returns the FIRST match, never in two places. */
export function columnForStage(stage: string): BoardColumn {
  return BOARD_COLUMNS.find((c) => c.stages.includes(stage)) ?? OTHER_COLUMN;
}

/**
 * Group cards into columns, preserving the order they arrived in.
 *
 * The server orders by `updated_at desc`, which is a stable, meaningful order —
 * so cards do not shuffle on refresh. Grouping here keeps that order inside each
 * column rather than re-sorting.
 */
export function groupByColumn<T extends { stage: string }>(cards: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = Object.fromEntries(BOARD_COLUMNS.map((c) => [c.key, [] as T[]]));
  for (const card of cards) out[columnForStage(card.stage).key].push(card);
  return out;
}
