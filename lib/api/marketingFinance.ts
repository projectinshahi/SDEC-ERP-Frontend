import { apiClient } from './api-client';

/* ── Marketing finance API (MK-004.2 … MK-004.6) ──────────────────────────────
 * One module for expenses, approvals, ad campaigns, influencers and the export.
 * Every figure here is computed SERVER-SIDE from the shared marketingFinance
 * service — nothing on this side recomputes a total, a CPL or a share, so the
 * screen can never disagree with the export. */

export interface FinanceClient { id: number; name: string }
export interface ReferenceOption { id: number; name: string }

export interface FinanceSettings {
  /** At or below this an expense is auto-approved; above it a manager decides. */
  approvalThreshold: number;
  /** At or above this the form asks the submitter to confirm before saving. */
  largeExpenseThreshold: number;
}

export type ApprovalStatus = 'approved' | 'pending' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface Expense {
  id: number;
  title: string;
  category: string;
  vendor: string | null;
  amount: number;
  date: string | null;
  approvalStatus: ApprovalStatus;
  /** The FINANCE module's payment state ('pending' | 'paid'). Distinct from
   *  approvalStatus — the two are deliberately not the same column. */
  paymentStatus: string;
  notes: string | null;
  clientId: number | null;
  projectId: number | null;
  projectName: string | null;
  submittedBy: number | null;
  submittedByName: string | null;
  decidedBy: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
}

export interface ExpensePermissions {
  canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  page: number; pageSize: number; total: number;
  clients: FinanceClient[];
  categories: ReferenceOption[];
  settings: FinanceSettings;
  permissions: ExpensePermissions;
  totals: { approved: number; pending: number; rejected: number; count: number };
}

export interface ExpenseQuery {
  clientId?: number | null;
  projectId?: number | null;
  category?: string;
  approvalStatus?: ApprovalStatus | 'all';
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const qs = (params: Record<string, unknown>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export async function fetchExpenses(q: ExpenseQuery = {}): Promise<ExpenseListResponse> {
  const res = await apiClient.get<{ success: boolean } & ExpenseListResponse>(
    `/marketing/expenses${qs(q as Record<string, unknown>)}`,
  );
  const d = res.data;
  return {
    expenses: d?.expenses ?? [],
    page: d?.page ?? 1,
    pageSize: d?.pageSize ?? 25,
    total: d?.total ?? 0,
    clients: d?.clients ?? [],
    categories: d?.categories ?? [],
    settings: d?.settings ?? { approvalThreshold: 0, largeExpenseThreshold: 0 },
    permissions: d?.permissions ?? { canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    totals: d?.totals ?? { approved: 0, pending: 0, rejected: 0, count: 0 },
  };
}

export async function fetchExpense(id: number): Promise<{ expense: Expense; permissions: Partial<ExpensePermissions> }> {
  const res = await apiClient.get<{ success: boolean; expense: Expense; permissions: Partial<ExpensePermissions> }>(
    `/marketing/expenses/${id}`,
  );
  return { expense: res.data.expense, permissions: res.data.permissions ?? {} };
}

export interface ExpensePayload {
  clientId: number;
  projectId?: number | null;
  title: string;
  category: string;
  amount: number;
  /** 'YYYY-MM-DD' — a date-only value, never a timestamp. */
  date: string;
  vendor?: string | null;
  notes?: string | null;
}

export async function createExpense(payload: ExpensePayload): Promise<{ expense: Expense; approvalStatus: ApprovalStatus }> {
  const res = await apiClient.post<{ success: boolean; expense: Expense; approvalStatus: ApprovalStatus }>(
    '/marketing/expenses', payload,
  );
  return { expense: res.data.expense, approvalStatus: res.data.approvalStatus };
}

export async function updateExpense(id: number, payload: ExpensePayload): Promise<Expense> {
  const res = await apiClient.put<{ success: boolean; expense: Expense }>(`/marketing/expenses/${id}`, payload);
  return res.data.expense;
}

export async function decideExpense(id: number, decision: 'approved' | 'rejected', note: string): Promise<Expense> {
  const res = await apiClient.patch<{ success: boolean; expense: Expense }>(
    `/marketing/expenses/${id}/decision`, { decision, note },
  );
  return res.data.expense;
}

export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/marketing/expenses/${id}`);
}

export async function uploadReceipt(id: number, file: File): Promise<{ receiptUrl: string; receiptName: string }> {
  const form = new FormData();
  form.append('receipt', file);
  // Let the browser set the multipart boundary — forcing a Content-Type here
  // produces a body the server cannot parse.
  const res = await apiClient.post<{ success: boolean; receiptUrl: string; receiptName: string }>(
    `/marketing/expenses/${id}/receipt`, form, { headers: { 'Content-Type': undefined } } as never,
  );
  return { receiptUrl: res.data.receiptUrl, receiptName: res.data.receiptName };
}

export async function fetchFinanceSettings(): Promise<{ settings: FinanceSettings; canManage: boolean }> {
  const res = await apiClient.get<{ success: boolean; settings: FinanceSettings; canManage: boolean }>(
    '/marketing/finance-settings',
  );
  return { settings: res.data.settings, canManage: !!res.data.canManage };
}

export async function updateFinanceSettings(patch: Partial<FinanceSettings>): Promise<FinanceSettings> {
  const res = await apiClient.put<{ success: boolean; settings: FinanceSettings }>('/marketing/finance-settings', patch);
  return res.data.settings;
}

/* ── MK-004.4 Performance marketing ────────────────────────────────────────── */

export interface CampaignMetrics {
  /** null = NOT COMPUTABLE (no leads / clicks / spend yet). Never Infinity and
   *  never a fabricated 0 — the UI renders null as an em dash. */
  cpl: number | null;
  cpc: number | null;
  ctr: number | null;
  roi: number | null;
  overBudget: boolean;
  budgetUsedPercent: number | null;
}

export interface AdCampaign {
  id: number;
  clientId: number;
  projectId: number | null;
  projectName: string | null;
  name: string;
  platform: string;
  budget: number;
  spend: number;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  notes: string | null;
  metrics: CampaignMetrics;
}

export interface CampaignTotals extends CampaignMetrics {
  budget: number; spend: number; leads: number; clicks: number; impressions: number; revenue: number;
}

export interface CampaignListResponse {
  campaigns: AdCampaign[];
  clients: FinanceClient[];
  platforms: ReferenceOption[];
  totals: CampaignTotals;
  permissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean };
}

export interface CampaignQuery {
  clientId?: number | null; platform?: string; search?: string; from?: string; to?: string;
}

const EMPTY_METRICS: CampaignMetrics = {
  cpl: null, cpc: null, ctr: null, roi: null, overBudget: false, budgetUsedPercent: null,
};

export async function fetchCampaigns(q: CampaignQuery = {}): Promise<CampaignListResponse> {
  const res = await apiClient.get<{ success: boolean } & CampaignListResponse>(
    `/marketing/ad-campaigns${qs(q as Record<string, unknown>)}`,
  );
  const d = res.data;
  return {
    campaigns: d?.campaigns ?? [],
    clients: d?.clients ?? [],
    platforms: d?.platforms ?? [],
    totals: d?.totals ?? { budget: 0, spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, ...EMPTY_METRICS },
    permissions: d?.permissions ?? { canCreate: false, canEdit: false, canDelete: false },
  };
}

export interface CampaignPayload {
  clientId: number; projectId?: number | null; name: string; platform: string;
  budget: number; spend: number; revenue: number;
  startDate: string; endDate: string;
  impressions: number; clicks: number; leads: number; conversions: number;
  notes?: string | null;
}

export async function createCampaign(payload: CampaignPayload): Promise<AdCampaign> {
  const res = await apiClient.post<{ success: boolean; campaign: AdCampaign }>('/marketing/ad-campaigns', payload);
  return res.data.campaign;
}

export async function updateCampaign(id: number, payload: CampaignPayload): Promise<AdCampaign> {
  const res = await apiClient.put<{ success: boolean; campaign: AdCampaign }>(`/marketing/ad-campaigns/${id}`, payload);
  return res.data.campaign;
}

export async function deleteCampaign(id: number): Promise<void> {
  await apiClient.delete(`/marketing/ad-campaigns/${id}`);
}

/* ── MK-004.5 Influencer marketing ─────────────────────────────────────────── */

export interface Influencer {
  id: number;
  clientId: number;
  projectId: number | null;
  projectName: string | null;
  name: string;
  handle: string | null;
  platform: string;
  fee: number;
  deliverables: string | null;
  startDate: string | null;
  endDate: string | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  notes: string | null;
  /** Whether this fee reaches the cost dashboard. Decided server-side from ONE
   *  rule so the tracker and the dashboard cannot disagree. */
  countsAsSpend: boolean;
}

export interface InfluencerListResponse {
  influencers: Influencer[];
  clients: FinanceClient[];
  platforms: ReferenceOption[];
  paymentStatuses: PaymentStatus[];
  totals: { committed: number; paid: number; pending: number; cancelled: number; count: number };
  permissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean };
}

export interface InfluencerQuery {
  clientId?: number | null; platform?: string; paymentStatus?: PaymentStatus | ''; search?: string;
}

export async function fetchInfluencers(q: InfluencerQuery = {}): Promise<InfluencerListResponse> {
  const res = await apiClient.get<{ success: boolean } & InfluencerListResponse>(
    `/marketing/influencers${qs(q as Record<string, unknown>)}`,
  );
  const d = res.data;
  return {
    influencers: d?.influencers ?? [],
    clients: d?.clients ?? [],
    platforms: d?.platforms ?? [],
    paymentStatuses: d?.paymentStatuses ?? ['pending', 'paid', 'cancelled'],
    totals: d?.totals ?? { committed: 0, paid: 0, pending: 0, cancelled: 0, count: 0 },
    permissions: d?.permissions ?? { canCreate: false, canEdit: false, canDelete: false },
  };
}

export interface InfluencerPayload {
  clientId: number; projectId?: number | null; name: string; handle?: string | null;
  platform: string; fee: number; deliverables: string;
  startDate: string; endDate: string; notes?: string | null;
}

export async function createInfluencer(payload: InfluencerPayload): Promise<Influencer> {
  const res = await apiClient.post<{ success: boolean; influencer: Influencer }>('/marketing/influencers', payload);
  return res.data.influencer;
}

export async function updateInfluencer(id: number, payload: InfluencerPayload): Promise<Influencer> {
  const res = await apiClient.put<{ success: boolean; influencer: Influencer }>(`/marketing/influencers/${id}`, payload);
  return res.data.influencer;
}

export async function setInfluencerPayment(id: number, paymentStatus: PaymentStatus): Promise<Influencer | null> {
  const res = await apiClient.patch<{ success: boolean; influencer?: Influencer; unchanged?: boolean }>(
    `/marketing/influencers/${id}/payment`, { paymentStatus },
  );
  return res.data.influencer ?? null;
}

export async function deleteInfluencer(id: number): Promise<void> {
  await apiClient.delete(`/marketing/influencers/${id}`);
}

/* ── MK-004.6 Export ───────────────────────────────────────────────────────── */

export interface ExpenseReport {
  client: FinanceClient;
  range: { from: string | null; to: string | null };
  generatedAt: string;
  currency: 'INR';
  scope: string;
  rows: Expense[];
  categories: { name: string; amount: number; count: number; percent: number }[];
  grandTotal: number;
  count: number;
}

/**
 * The report payload. BOTH export formats start here: the PDF is rendered from
 * this exact object, and the Excel endpoint serialises the same structure
 * server-side. There is no second query and no second total.
 */
export async function fetchExpenseReport(
  clientId: number, from?: string, to?: string,
): Promise<ExpenseReport> {
  const res = await apiClient.get<{ success: boolean; report: ExpenseReport }>(
    `/marketing/expenses/export${qs({ clientId, from, to })}`,
  );
  return res.data.report;
}

/**
 * Download the XLSX the SERVER builds from the same query the screen used.
 *
 * Goes through the axios client so the Authorization header is attached — a bare
 * window.open() would hit the endpoint unauthenticated and 401. Mirrors the
 * existing downloadAttendanceSummaryXlsx helper.
 */
export async function downloadExpenseXlsx(clientId: number, clientName: string, from?: string, to?: string): Promise<void> {
  const res = await apiClient.get(`/marketing/expenses/export.xlsx${qs({ clientId, from, to })}`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = clientName.replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase();
  a.download = `expenses-${safe}-${from || 'all'}-${to || 'all'}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
