import { apiClient } from './api-client';

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: string[];
}

/**
 * Send POST request to backend to create a new access permission role
 */
export async function createRoleApi(data: CreateRoleData): Promise<any> {
  const response = await apiClient.post('/roles', data);
  return response.data;
}

/**
 * Fetch all custom security roles (with permission matrix + user counts) from the
 * `role.read`-gated `/roles` endpoint. Use ONLY on Role-Management screens.
 */
export async function fetchRolesApi(): Promise<any[]> {
  const response = await apiClient.get<any[]>('/roles');
  return response.data;
}

/**
 * Slim id+name role list for the role-assignment dropdown in the user
 * create/edit modal. Hits the authenticate-only `/roles/picklist`, so a user
 * with `user.create`/`user.update` but not `role.read` can still pick a role
 * (no permission matrix exposed).
 */
export async function fetchRolesPicklist(): Promise<{ id: number; name: string }[]> {
  const response = await apiClient.get<{ id: number; name: string }[]>('/roles/picklist');
  return response.data;
}

/**
 * Send PUT request to backend to update an existing authorization role
 */
export async function updateRoleApi(id: string | number, data: CreateRoleData): Promise<any> {
  const response = await apiClient.put(`/roles/${id}`, data);
  return response.data;
}

/**
 * Send DELETE request to backend to remove a custom security role
 */
export async function deleteRoleApi(id: string | number): Promise<any> {
  const response = await apiClient.delete(`/roles/${id}`);
  return response.data;
}

