import { apiClient } from './api-client';

export interface ColumnConfig {
  id?: number;
  table_name?: string;
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

/**
 * Fetch column configurations for a specific table
 * GET /api/columns?table=users
 */
export async function fetchColumnsApi(table: string): Promise<ColumnConfig[]> {
  const response = await apiClient.get<ColumnConfig[]>(`/columns?table=${table}`);
  return response.data;
}

/**
 * Save updated columns configurations for a specific table
 * POST /api/columns
 */
export async function saveColumnsApi(table: string, columns: ColumnConfig[]): Promise<any> {
  const response = await apiClient.post('/columns', {
    table,
    columns,
  });
  return response.data;
}
