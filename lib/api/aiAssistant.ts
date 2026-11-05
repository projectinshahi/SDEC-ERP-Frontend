import { apiClient } from './api-client';

/** A table (optionally charted) built server-side straight from ERP query results — never model-generated. */
export interface AiDisplay {
  title: string;
  columns: string[];
  rows: Array<Array<string | number | null>>;
  chartValueIndex?: number;
}
export interface AiTurn { role: 'user' | 'assistant'; content: string }
export interface AiAnswer { answer: string; displays: AiDisplay[]; asOf: string }
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
