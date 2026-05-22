import { apiClient } from './api-client';

export interface UserCountResponse {
  totalUsers: number;
}

export interface UserDbResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

/**
 * Fetch total number of users from Neon database via backend API
 */
export async function fetchUserCount(): Promise<UserCountResponse> {
  const response = await apiClient.get<UserCountResponse>('/users/count');
  return response.data;
}

/**
 * Fetch all users from Neon database via backend API raw SQL query
 */
export async function fetchUsers(): Promise<UserDbResponse[]> {
  const response = await apiClient.get<UserDbResponse[]>('/users');
  return response.data;
}

/**
 * Create a new user on the live database
 */
export async function createUserApi(data: any): Promise<any> {
  const response = await apiClient.post('/users', {
    name: data.name,
    email: data.email,
    roles: data.roles,
    status: data.status,
  });
  return response.data;
}

/**
 * Update an existing user on the live database
 */
export async function updateUserApi(id: string, data: any): Promise<any> {
  const response = await apiClient.put(`/users/${id}`, {
    name: data.name,
    email: data.email,
    roles: data.roles,
    status: data.status,
  });
  return response.data;
}

/**
 * Delete an existing user from the live database
 */
export async function deleteUserApi(id: string): Promise<any> {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
}
