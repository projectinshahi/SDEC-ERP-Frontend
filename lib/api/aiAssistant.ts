import { apiClient } from './api-client';

/** A table (optionally charted) built server-side straight from ERP query results — never model-generated. */
export interface AiDisplay {
  title: string;
  columns: string[];
  rows: Array<Array<string | number | null>>;
  chartValueIndex?: number;
  /** bar (default) for breakdowns, line for chronological series, pie for shares of a whole. */
  chart?: 'bar' | 'line' | 'pie';
  /** Value columns drawn together (grouped bars / several lines); defaults to [chartValueIndex]. */
  chartSeries?: number[];
}
export interface AiTurn { role: 'user' | 'assistant'; content: string }
/** A server-stored, user-bound task-action proposal: nothing changes until it is confirmed here. */
export interface AiProposal {
  id: number;
  action: 'create_task' | 'update_task' | 'assign_task' | 'change_task_status';
  label: string;
  taskId: number | null;
  title: string;
  changes: Array<{ field: string; current: string | null; proposed: string | null }>;
  notes: string[];
  expiresAt: string;
  status: 'pending';
}
export interface AiActionResult {
  taskId: number; title?: string; status?: string; priority?: string; due?: string | null;
  members?: string[]; inCharge?: string | null; action: string; label: string; executedAt: string;
}
export interface AiAnswer { answer: string; displays: AiDisplay[]; proposals?: AiProposal[]; asOf: string }
export interface AiMeta { configured: boolean; suggestions: string[] }

export async function fetchAiAssistantMeta(): Promise<AiMeta> {
  const res = await apiClient.get<{ success: boolean; data: AiMeta }>('/ai-assistant/meta');
  return res.data.data;
}

/** Sends the recent conversation; the server re-queries ERP data for every answer. */
export async function askAiAssistant(messages: AiTurn[]): Promise<AiAnswer> {
  const res = await apiClient.post<{ success: boolean; data: AiAnswer }>('/ai-assistant/chat', { messages }, { timeout: 100_000 });
  return res.data.data;
}

/** Executes ONE pending proposal (single use, owner only, expiring); the server re-checks permissions and the task first. */
export async function confirmAiAction(id: number): Promise<AiActionResult> {
  const res = await apiClient.post<{ success: boolean; data: { id: number; status: string; result: AiActionResult } }>(`/ai-assistant/actions/${id}/confirm`, {}, { timeout: 30_000 });
  return res.data.data.result;
}

export async function cancelAiAction(id: number): Promise<void> {
  await apiClient.post(`/ai-assistant/actions/${id}/cancel`, {});
}
