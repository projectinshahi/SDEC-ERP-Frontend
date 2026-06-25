import { apiClient } from './api-client';
import { Project, ProjectMember } from '@/components/projects/ProjectCard';

/**
 * Fetch all projects from backend Express API
 */
export async function fetchProjects(): Promise<Project[]> {
  const response = await apiClient.get<Project[]>('/projects');
  return response.data;
}

/**
 * Create a new project via backend Express API
 */
export async function createProjectApi(data: any): Promise<any> {
  const response = await apiClient.post('/projects', data);
  return response.data;
}

/**
 * Fetch a single project by ID from backend Express API
 */
export async function fetchProjectById(id: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/projects/${id}`);
  return response.data;
}

/**
 * Update an existing project via backend Express API
 */
export async function updateProjectApi(id: string, data: any): Promise<any> {
  const response = await apiClient.put(`/projects/${id}`, data);
  return response.data;
}

/**
 * Archive a project (soft-delete) via backend Express API
 */
export async function archiveProjectApi(id: string): Promise<any> {
  const response = await apiClient.patch(`/projects/${id}/archive`);
  return response.data;
}

/**
 * Restore an archived project via backend Express API
 */
export async function restoreProjectApi(id: string): Promise<any> {
  const response = await apiClient.patch(`/projects/${id}/restore`);
  return response.data;
}

/**
 * Permanently delete a project via backend Express API
 */
export async function deleteProjectApi(id: string): Promise<any> {
  const response = await apiClient.delete(`/projects/${id}`);
  return response.data;
}

/**
 * Fetch members of a specific project
 */
export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`);
  return response.data;
}

/**
 * Add a member to a project
 */
export async function addProjectMemberApi(projectId: string, data: { userId: number; role: string }): Promise<any> {
  const response = await apiClient.post(`/projects/${projectId}/members`, data);
  return response.data;
}

/**
 * Bulk update members of a project
 */
export async function bulkUpdateProjectMembersApi(projectId: string, members: any[]): Promise<any> {
  const response = await apiClient.put(`/projects/${projectId}/members/bulk`, { members });
  return response.data;
}

/**
 * Update the role of a project member
 */
export async function updateProjectMemberRoleApi(projectId: string, memberId: string | number, role: string): Promise<any> {
  const response = await apiClient.put(`/projects/${projectId}/members/${memberId}`, { role });
  return response.data;
}

/**
 * Remove a member from a project
 */
export async function removeProjectMemberApi(projectId: string, memberId: string | number): Promise<any> {
  const response = await apiClient.delete(`/projects/${projectId}/members/${memberId}`);
  return response.data;
}

// --- Scoped Data Fetching APIs ---

export async function fetchProjectBoards(projectId: string): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/projects/${projectId}/boards`);
  return response.data;
}

export async function fetchProjectTasks(projectId: string): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/projects/${projectId}/tasks`);
  return response.data;
}

export async function fetchProjectBugs(projectId: string): Promise<any[]> {
  const response = await apiClient.get<{ success: boolean; data: any[] }>(`/projects/${projectId}/bugs`);
  return response.data.data;
}

export async function fetchProjectAnalytics(projectId: string): Promise<any> {
  const response = await apiClient.get<any>(`/projects/${projectId}/analytics`);
  return response.data;
}

export async function fetchGlobalAnalytics(): Promise<any> {
  const response = await apiClient.get<any>(`/projects/global/analytics`);
  return response.data;
}

export async function fetchProjectActivities(projectId: string): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/projects/${projectId}/activities`);
  return response.data;
}

/**
 * Import backlog tasks (CSV/XLSX parsed to JSON)
 */
export async function importProjectBacklogApi(projectId: string, tasks: any[]): Promise<any> {
  const response = await apiClient.post(`/projects/${projectId}/import`, { tasks });
  return response.data;
}

// --- Project Categories (live, DB-backed; managed by admins) ---

export interface ProjectCategory {
  id: number;
  name: string;
  orderIndex?: number;
  isActive?: boolean;
}

/** List all project categories (any authenticated user) — drives dropdowns/filters. */
export async function fetchProjectCategories(): Promise<ProjectCategory[]> {
  const response = await apiClient.get<ProjectCategory[]>('/project-categories');
  return response.data;
}

/** Create a new category (Admin/SuperAdmin only). */
export async function createProjectCategoryApi(name: string): Promise<ProjectCategory> {
  const response = await apiClient.post<ProjectCategory>('/project-categories', { name });
  return response.data;
}

/** Rename / toggle a category (Admin/SuperAdmin only). Renames cascade to projects. */
export async function updateProjectCategoryApi(
  id: number,
  data: { name?: string; isActive?: boolean },
): Promise<ProjectCategory> {
  const response = await apiClient.put<ProjectCategory>(`/project-categories/${id}`, data);
  return response.data;
}

/** Delete a category (Admin/SuperAdmin only). Projects in it become uncategorized. */
export async function deleteProjectCategoryApi(id: number): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(`/project-categories/${id}`);
  return response.data;
}

