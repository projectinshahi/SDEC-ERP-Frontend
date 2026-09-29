import { apiClient } from './api-client';

/* ── Marketing → Production cost dashboard (MK-004.1) ─────────────────────────
 * Reads the existing finance_expense data through the Marketing cost endpoint.
 * `budget: null` means NOT CONFIGURED — this system has no budget model — and is
 * carried through as null so the UI can say so rather than rendering a zero. */

export interface CostClient { id: number; name: string }

export interface CostCategory {
  name: string;
  amount: number;
  count: number;
  percent: number;
}

export interface CostExpense {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  /** The Finance module's PAYMENT state. Distinct from approvalStatus. */
  status?: string;
  paymentStatus?: string;
  /** Always 'approved' here — the dashboard is approved-only by design. */
  approvalStatus?: string;
  vendor: string | null;
  projectId: number | null;
  projectName?: string | null;
}

/** MK-004.4 roll-up for the selected client + range. */
export interface CampaignSpendSummary {
  budget: number;
  spend: number;
  leads: number;
  count: number;
  /** null when not computable (no leads). Never Infinity, never a fake 0. */
  cpl: number | null;
  overBudget: boolean;
  budgetUsedPercent: number | null;
}

/** MK-004.5 roll-up. `committed` (pending + paid) is what counts as spend. */
export interface InfluencerSpendSummary {
  committed: number;
  paid: number;
  pending: number;
  count: number;
}

export interface ClientCosts {
  clients: CostClient[];
  client: CostClient | null;
  canLog: boolean;
  /** MK-004.6 — whether this caller may take the figures out of the system. */
  canExport: boolean;
  /** APPROVED logged expenses only (MK-004.3 reporting rule). */
  totalSpend: number;
  /** null = no budget configured anywhere in this system. NEVER coerce to 0. */
  budget: number | null;
  variance: number | null;
  currency: string;
  categories: CostCategory[];
  expenses: CostExpense[];
  campaignSpend: CampaignSpendSummary | null;
  influencerSpend: InfluencerSpendSummary | null;
  /** Expenses + ad spend + committed influencer fees. */
  combinedSpend: number;
}

export async function fetchClientCosts(clientId?: number): Promise<ClientCosts> {
  const qs = clientId ? `?clientId=${clientId}` : '';
  const res = await apiClient.get<{ success: boolean } & ClientCosts>(`/marketing/costs${qs}`);
  const d = res.data;
  return {
    clients: d?.clients ?? [],
    client: d?.client ?? null,
    canLog: !!d?.canLog,
    canExport: !!d?.canExport,
    totalSpend: d?.totalSpend ?? 0,
    budget: d?.budget ?? null,
    variance: d?.variance ?? null,
    currency: d?.currency ?? 'INR',
    categories: d?.categories ?? [],
    expenses: d?.expenses ?? [],
    campaignSpend: d?.campaignSpend ?? null,
    influencerSpend: d?.influencerSpend ?? null,
    combinedSpend: d?.combinedSpend ?? d?.totalSpend ?? 0,
  };
}

export interface LogCostPayload {
  clientId: number;
  projectId?: number | null;
  title: string;
  category?: string;
  amount: number;
  /** 'YYYY-MM-DD' — a date-only value, never a timestamp. */
  date: string;
  vendor?: string | null;
  notes?: string | null;
}

export async function logClientCost(payload: LogCostPayload): Promise<CostExpense> {
  const res = await apiClient.post<{ success: boolean; expense: CostExpense }>('/marketing/costs', payload);
  return res.data.expense;
}
