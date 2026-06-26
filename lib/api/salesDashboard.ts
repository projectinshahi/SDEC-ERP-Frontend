/** Sales Command Center + Manager Workspace API service. */

import { apiClient } from './api-client';
import type { SalesDashboard, ManagerWorkspace } from '@/lib/types/salesDashboard';

export async function fetchSalesDashboard(): Promise<SalesDashboard> {
  const res = await apiClient.get<SalesDashboard>('/sales/analytics/dashboard');
  return res.data;
}

export async function fetchManagerWorkspace(): Promise<ManagerWorkspace> {
  const res = await apiClient.get<ManagerWorkspace>('/sales/analytics/manager');
  return res.data;
}

import type { TeamPerformance, TeamPerformanceDetail } from '@/lib/types/salesDashboard';

/** Live per-team aggregated performance (auto-includes every current team). */
export async function fetchTeamPerformance(): Promise<TeamPerformance[]> {
  const res = await apiClient.get<TeamPerformance[]>('/sales/teams/performance');
  return res.data;
}

/** Drill-down: one team's metrics + per-member breakdown + recent activity. */
export async function fetchTeamPerformanceDetail(teamId: number): Promise<TeamPerformanceDetail> {
  const res = await apiClient.get<TeamPerformanceDetail>(`/sales/teams/${teamId}/performance`);
  return res.data;
}
