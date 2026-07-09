/**
 * SE-025/040/041/043 — BDE Dashboard + Targets API. Wrappers over `/sales/bde/*`
 * and `/sales/targets`.
 */
import { apiClient } from './api-client';
import {
  BdeDashboard, SalesTarget, TargetType, PeriodType, TargetHistoryResponse,
  TargetListResponse, TargetFilters, TargetDetail,
} from '@/lib/types/salesExecution';
import { jsPDF } from 'jspdf';

export async function fetchBdeDashboard(ownerId?: number): Promise<BdeDashboard> {
  const qs = ownerId != null ? `?ownerId=${ownerId}` : '';
  const res = await apiClient.get<BdeDashboard>(`/sales/bde/dashboard${qs}`);
  return res.data;
}

export interface FetchTargetOpts {
  type?: TargetType;
  period?: string;
  periodType?: PeriodType;
  ownerId?: number;
}

export async function fetchMyTarget(opts: FetchTargetOpts = {}): Promise<SalesTarget> {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.period) params.set('period', opts.period);
  if (opts.periodType) params.set('periodType', opts.periodType);
  if (opts.ownerId != null) params.set('ownerId', String(opts.ownerId));
  const qs = params.toString();
  const res = await apiClient.get<SalesTarget>(`/sales/targets/my${qs ? `?${qs}` : ''}`);
  return res.data;
}

export interface SetTargetPayload {
  targetAmount: number;
  type?: TargetType;
  period?: string;
  periodType?: PeriodType;
  ownerId?: number;
  name?: string | null;
  description?: string | null;
}

export async function setTarget(payload: SetTargetPayload): Promise<SalesTarget> {
  const res = await apiClient.put<SalesTarget>('/sales/targets', payload);
  return res.data;
}

export async function fetchTargetHistory(ownerId?: number): Promise<TargetHistoryResponse> {
  const qs = ownerId != null ? `?ownerId=${ownerId}` : '';
  const res = await apiClient.get<TargetHistoryResponse>(`/sales/targets/history${qs}`);
  return res.data;
}

/** Target Management — list targets in scope with live achievement + summary. */
export async function fetchTargets(filters: TargetFilters = {}): Promise<TargetListResponse> {
  const params = new URLSearchParams();
  if (filters.ownerId != null) params.set('ownerId', String(filters.ownerId));
  if (filters.period) params.set('period', filters.period);
  if (filters.periodType) params.set('periodType', filters.periodType);
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());
  const qs = params.toString();
  const res = await apiClient.get<TargetListResponse>(`/sales/targets${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function fetchTargetById(id: number): Promise<TargetDetail> {
  const res = await apiClient.get<TargetDetail>(`/sales/targets/${id}`);
  return res.data;
}

export async function deleteTarget(id: number): Promise<void> {
  await apiClient.delete(`/sales/targets/${id}`);
}

export async function exportBdeSummary(type: 'daily' | 'weekly'): Promise<void> {
  const p = new URLSearchParams();
  p.set('type', type);
  p.set('format', 'json');
  const res = await apiClient.get<{ name: string; headers: string[]; rows: (string | number)[][] }>(`/sales/bde/dashboard/export?${p.toString()}`);
  const sheet = res.data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header color block
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, 210, 36, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SKPC Solutions Pvt Ltd', 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Sales / BDE — ${sheet.name}`, 15, 24);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 155, 16);

  // Table Details
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY METRICS', 15, 52);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 55, 195, 55);

  // Headers
  doc.setFillColor(249, 250, 251);
  doc.rect(15, 60, 180, 8, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text(sheet.headers[0], 20, 65);
  doc.text(sheet.headers[1], 155, 65);

  // Values
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  let y = 76;
  sheet.rows.forEach(row => {
    doc.text(String(row[0]), 20, y);
    doc.text(String(row[1]), 155, y);
    y += 8;
  });

  doc.save(`bde_${type}_summary_${new Date().toISOString().split('T')[0]}.pdf`);
}
