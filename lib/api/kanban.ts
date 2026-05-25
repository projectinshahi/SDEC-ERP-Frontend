import { apiClient } from './api-client';
import type { Task } from '@/components/tasks/CreateTaskModal';

export interface BoardColumn {
  id: string;
  label: string;
  order?: number;
}

/**
 * Fetch all columns for Kanban Board from PostgreSQL Neon Database
 * GET /api/kanban/columns
 */
export async function fetchKanbanColumns(): Promise<BoardColumn[]> {
  const response = await apiClient.get<BoardColumn[]>('/kanban/columns');
  return response.data;
}

/**
 * Create a new dynamic Column in database
 * POST /api/kanban/columns
 */
export async function createKanbanColumn(col: BoardColumn): Promise<any> {
  const response = await apiClient.post('/kanban/columns', {
    id: col.id,
    label: col.label,
    order: col.order || 0
  });
  return response.data;
}

/**
 * Rename/update an existing Column in database
 * PUT /api/kanban/columns/:id
 */
export async function updateKanbanColumn(id: string, data: Partial<BoardColumn>): Promise<any> {
  const response = await apiClient.put(`/kanban/columns/${id}`, data);
  return response.data;
}

/**
 * Delete a Column (and cascade delete its tasks) in database
 * DELETE /api/kanban/columns/:id
 */
export async function deleteKanbanColumn(id: string): Promise<any> {
  const response = await apiClient.delete(`/kanban/columns/${id}`);
  return response.data;
}

/**
 * Reorder column index positions in database
 * POST /api/kanban/columns/reorder
 */
export async function reorderKanbanColumns(columns: { id: string; order: number }[]): Promise<any> {
  const response = await apiClient.post('/kanban/columns/reorder', { columns });
  return response.data;
}

/**
 * Fetch all Tasks from PostgreSQL database
 * GET /api/kanban/tasks
 */
export async function fetchKanbanTasks(): Promise<Task[]> {
  const response = await apiClient.get<Task[]>('/kanban/tasks');
  return response.data;
}

/**
 * Create a new task in database
 * POST /api/kanban/tasks
 */
export async function createKanbanTask(task: Task): Promise<any> {
  const response = await apiClient.post('/kanban/tasks', task);
  return response.data;
}

/**
 * Update an existing task in database
 * PUT /api/kanban/tasks/:id
 */
export async function updateKanbanTask(id: string, task: Partial<Task>): Promise<any> {
  const response = await apiClient.put(`/kanban/tasks/${id}`, task);
  return response.data;
}

/**
 * Delete an existing task in database
 * DELETE /api/kanban/tasks/:id
 */
export async function deleteKanbanTask(id: string): Promise<any> {
  const response = await apiClient.delete(`/kanban/tasks/${id}`);
  return response.data;
}

/**
 * Persist drag-and-drop movements & order positions in database
 * POST /api/kanban/tasks/move
 */
export async function moveKanbanTask(taskId: string, targetStatus: string, taskIdsOrder?: string[]): Promise<any> {
  const response = await apiClient.post('/kanban/tasks/move', {
    taskId,
    targetStatus,
    taskIdsOrder
  });
  return response.data;
}

/**
 * Reset board schema and seeded defaults in database
 * POST /api/kanban/reset
 */
export async function resetKanbanBoardDb(): Promise<any> {
  const response = await apiClient.post('/kanban/reset');
  return response.data;
}
