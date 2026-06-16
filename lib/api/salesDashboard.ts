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
