/**
 * Manager + Executive performance dashboards. Wrappers over `/sales/analytics`.
 */
import { apiClient } from './api-client';
import type { ManagerDashboard, ExecutiveDashboard } from '@/lib/types/salesExecution';

export async function fetchManagerDashboard(): Promise<ManagerDashboard> {
  const res = await apiClient.get<ManagerDashboard>('/sales/analytics/manager-dashboard');
  return res.data;
}

export async function fetchExecutiveDashboard(): Promise<ExecutiveDashboard> {
  const res = await apiClient.get<ExecutiveDashboard>('/sales/analytics/executive-dashboard');
  return res.data;
}
