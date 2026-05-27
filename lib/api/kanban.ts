import { apiClient } from './api-client';
import type { Task } from '@/components/tasks/CreateTaskModal';

export interface BoardColumn {
  id: string;
  label: string;
  order?: number;
  boardId?: number;
}

export interface Board {
  id: number;
  name: string;
  projectName: string;
  createdAt?: string;
}

// ─────────────────────────────────────────────
// BOARD API
// ─────────────────────────────────────────────

/**
 * Fetch all boards from the database
 * GET /api/kanban/boards
 */
export async function fetchBoards(): Promise<Board[]> {
  const response = await apiClient.get<Board[]>('/kanban/boards');
  return response.data;
}

/**
 * Create a new board
 * POST /api/kanban/boards
 */
export async function createBoardApi(name: string, projectName: string): Promise<Board> {
  const response = await apiClient.post<Board>('/kanban/boards', { name, projectName });
  return response.data;
}

/**
 * Delete a board and all its columns + tasks
 * DELETE /api/kanban/boards/:id
 */
export async function deleteBoardApi(id: number): Promise<any> {
  const response = await apiClient.delete(`/kanban/boards/${id}`);
  return response.data;
}

// ─────────────────────────────────────────────
// COLUMN API (filtered by boardId)
// ─────────────────────────────────────────────

/**
 * Fetch columns for a specific board from PostgreSQL Neon Database
 * GET /api/kanban/columns?boardId=xxx
 */
export async function fetchKanbanColumns(boardId?: number): Promise<BoardColumn[]> {
  const params = boardId ? { boardId } : {};
  const response = await apiClient.get<BoardColumn[]>('/kanban/columns', { params });
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
    order: col.order || 0,
    boardId: col.boardId
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

// ─────────────────────────────────────────────
// TASK API (filtered by boardId)
// ─────────────────────────────────────────────

/**
 * Fetch all Tasks from the PostgreSQL Neon Database for a specific board
 * GET /api/kanban/boards/:id/tasks
 */
export async function fetchKanbanTasks(boardId?: number): Promise<Task[]> {
  if (!boardId) {
    return []; // Enforce strict isolation: no boardId means no tasks
  }
  const response = await apiClient.get<Task[]>(`/kanban/boards/${boardId}/tasks`);
  return response.data;
}

/**
 * Create a new task in database
 * POST /api/kanban/tasks
 */
export async function createKanbanTask(task: Task & { boardId?: number }): Promise<any> {
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
