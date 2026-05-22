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
 * Fetch all custom security roles from Neon database via backend API
 */
export async function fetchRolesApi(): Promise<any[]> {
  const response = await apiClient.get<any[]>('/roles');
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

