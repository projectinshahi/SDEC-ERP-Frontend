/**
 * Finance module API service (Phase 1). Income + Expense CRUD, the unified
 * transactions feed, and the live overview (totals + net profit + recent
 * transactions) that powers the Dashboard and Reports.
 */

import { apiClient } from './api-client';

export type IncomeStatus = 'pending' | 'received';
export type ExpenseStatus = 'pending' | 'paid';

export interface IncomeEntry {
  id: number;
  title: string;
  customer: string | null;
  project: string | null;
  amount: number;
  incomeDate: string;
  paymentMethod: string;
  status: IncomeStatus;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseEntry {
  id: number;
  title: string;
  category: string;
  vendor: string | null;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  status: ExpenseStatus;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: string; // e.g. "income-12" / "expense-7"
  type: 'income' | 'expense';
  title: string;
  amount: number;
  status: string;
  date: string;
  category: string | null;
  party: string | null;
}

export interface FinanceOverview {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeCount: number;
  expenseCount: number;
  transactionCount: number;
  recentTransactions: FinanceTransaction[];
}

export interface IncomePayload {
  title: string;
  customer?: string | null;
  project?: string | null;
  amount: number;
  date: string; // ISO
  paymentMethod: string;
  status: IncomeStatus;
  notes?: string | null;
}

export interface ExpensePayload {
  title: string;
  category: string;
  vendor?: string | null;
  amount: number;
  date: string; // ISO
  paymentMethod: string;
  status: ExpenseStatus;
  notes?: string | null;
}

export interface ListFilters {
  search?: string;
  status?: string; // 'all' | specific status
}

function listQuery(filters?: ListFilters): string {
  const p = new URLSearchParams();
  if (filters?.search?.trim()) p.set('search', filters.search.trim());
  if (filters?.status && filters.status !== 'all') p.set('status', filters.status);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

// ── Income ──────────────────────────────────────────────────────────────────

export async function fetchIncome(filters?: ListFilters): Promise<IncomeEntry[]> {
  const res = await apiClient.get<IncomeEntry[]>(`/finance/income${listQuery(filters)}`);
  return res.data;
}
export async function createIncome(payload: IncomePayload): Promise<IncomeEntry> {
  const res = await apiClient.post<IncomeEntry>('/finance/income', payload);
  return res.data;
}
export async function updateIncome(id: number, payload: Partial<IncomePayload>): Promise<IncomeEntry> {
  const res = await apiClient.put<IncomeEntry>(`/finance/income/${id}`, payload);
  return res.data;
}
export async function deleteIncome(id: number): Promise<void> {
  await apiClient.delete(`/finance/income/${id}`);
}

// ── Expenses ────────────────────────────────────────────────────────────────

export async function fetchExpenses(filters?: ListFilters): Promise<ExpenseEntry[]> {
  const res = await apiClient.get<ExpenseEntry[]>(`/finance/expenses${listQuery(filters)}`);
  return res.data;
}
export async function createExpense(payload: ExpensePayload): Promise<ExpenseEntry> {
  const res = await apiClient.post<ExpenseEntry>('/finance/expenses', payload);
  return res.data;
}
export async function updateExpense(id: number, payload: Partial<ExpensePayload>): Promise<ExpenseEntry> {
  const res = await apiClient.put<ExpenseEntry>(`/finance/expenses/${id}`, payload);
  return res.data;
}
export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/finance/expenses/${id}`);
}

// ── Transactions + overview ───────────────────────────────────────────────────

export async function fetchTransactions(): Promise<FinanceTransaction[]> {
  const res = await apiClient.get<FinanceTransaction[]>('/finance/transactions');
  return res.data;
}
export async function fetchFinanceOverview(): Promise<FinanceOverview> {
  const res = await apiClient.get<FinanceOverview>('/finance/overview');
  return res.data;
}
