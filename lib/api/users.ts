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
  /** Real account creation timestamp (ISO) — null on legacy rows without one. */
  createdAt?: string | null;
}

/**
 * Fetch total number of users from Neon database via backend API
 */
export async function fetchUserCount(): Promise<UserCountResponse> {
  const response = await apiClient.get<UserCountResponse>('/users/count');
  return response.data;
}

/**
 * Slim user list for assignee / member pickers across the Development module
 * (tasks, blockers, meetings, bugs, project members). Hits the authenticate-only
 * `/users/picklist` so it works for ANY logged-in user without the `user.read`
 * directory permission. Returns the same shape as the directory minus `createdAt`.
 *
 * `module` (default 'development') asks the backend to return only users who
 * belong to that module, so Sales/HR users never appear in dev pickers — the
 * filtering is enforced server-side. Pass a different module key for future
 * modules, or '' to get the unfiltered list.
 */
export async function fetchUsers(module: string = 'development'): Promise<UserDbResponse[]> {
  const qs = module ? `?module=${encodeURIComponent(module)}` : '';
  const response = await apiClient.get<UserDbResponse[]>(`/users/picklist${qs}`);
  return response.data;
}

/**
 * Full User-Management directory (includes real `createdAt`). Backed by the
 * `user.read`-gated `/users` endpoint — use ONLY on User-Management screens, not
 * in pickers (those would 403 for non-admins). Use {@link fetchUsers} for pickers.
 */
export async function fetchUsersDirectory(): Promise<UserDbResponse[]> {
  const response = await apiClient.get<UserDbResponse[]>('/users');
  return response.data;
}

/**
 * EVERY ACTIVE user in the system (across all modules), from the User-Management
 * users table — the single source of truth. Hits the authenticate-only picklist
 * with NO module/team/role filter; the backend returns the complete active-user
 * list (excluding only deactivated/deleted accounts), so callers should NOT apply
 * any further filtering. For cross-module member pickers (e.g. My Tasks).
 *
 * Deliberately takes NO `module` argument so it can never accidentally scope the
 * result to one module (the bug this guards against).
 */
export async function fetchAllUsers(): Promise<UserDbResponse[]> {
  const response = await apiClient.get<UserDbResponse[]>('/users/picklist');
  return response.data;
}

/**
 * Create a new user on the live database
 */
export async function createUserApi(data: any): Promise<any> {
  const response = await apiClient.post('/users', {
    name: data.name,
    email: data.email,
    password: data.password,   // required — stored as SHA-256 hash on the backend
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
    password: data.password,   // optional — only sent if the admin is resetting the password
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
