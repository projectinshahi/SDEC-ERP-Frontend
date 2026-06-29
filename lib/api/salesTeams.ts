/**
 * SE-044 — Sales team + membership API. Wrappers over `/sales/teams`.
 */
import { apiClient } from './api-client';
import type { SalesTeam, SalesTeamMember, TeamMemberRole } from '@/lib/types/salesExecution';

export async function fetchTeams(includeArchived = false): Promise<SalesTeam[]> {
  const qs = includeArchived ? '?includeArchived=true' : '';
  const res = await apiClient.get<SalesTeam[]>(`/sales/teams${qs}`);
  return res.data;
}

export async function fetchTeam(id: number): Promise<SalesTeam> {
  const res = await apiClient.get<SalesTeam>(`/sales/teams/${id}`);
  return res.data;
}

export interface CreateTeamPayload {
  name: string;
  description?: string | null;
  managerId?: number;
}

export async function createTeam(payload: CreateTeamPayload): Promise<SalesTeam> {
  const res = await apiClient.post<SalesTeam>('/sales/teams', payload);
  return res.data;
}

export async function updateTeam(
  id: number,
  payload: { name?: string; description?: string | null; managerId?: number; archived?: boolean },
): Promise<SalesTeam> {
  const res = await apiClient.put<SalesTeam>(`/sales/teams/${id}`, payload);
  return res.data;
}

/** Archive (soft delete) — keeps members & history. Requires sales.team.manage. */
export async function archiveTeam(id: number): Promise<SalesTeam> {
  const res = await apiClient.post<SalesTeam>(`/sales/teams/${id}/archive`);
  return res.data;
}

/** Restore an archived team to active (no recreate). Requires sales.team.manage. */
export async function unarchiveTeam(id: number): Promise<SalesTeam> {
  const res = await apiClient.post<SalesTeam>(`/sales/teams/${id}/unarchive`);
  return res.data;
}

/**
 * Permanently delete a team. Requires the independent `sales.teams.delete`
 * permission (or sales.team.manage). The backend returns 409 if the team still
 * has assigned members or linked targets.
 */
export async function deleteTeam(id: number): Promise<void> {
  await apiClient.delete(`/sales/teams/${id}`);
}

export async function addTeamMember(teamId: number, userId: number, role: TeamMemberRole = 'bde'): Promise<SalesTeamMember> {
  const res = await apiClient.post<SalesTeamMember>(`/sales/teams/${teamId}/members`, { userId, role });
  return res.data;
}

export async function removeTeamMember(teamId: number, userId: number): Promise<void> {
  await apiClient.delete(`/sales/teams/${teamId}/members/${userId}`);
}
