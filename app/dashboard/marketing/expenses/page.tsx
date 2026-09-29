'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Receipt, Search, X, FileSpreadsheet, FileText,
  CheckCircle2, XCircle, Clock, Filter, Paperclip, Pencil, Trash2, AlertTriangle,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { formatINR } from '@/lib/utils/currency';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import { fieldErrorsFromApi, invalidInputCls, type FieldErrors } from '@/lib/marketing/contentValidation';
import { validate, expenseSchema, exportFilterSchema } from '@/lib/marketing/financeValidation';
import { downloadExpenseReportPdf } from '@/lib/marketing/expenseReportPdf';
import {
  fetchExpenses, createExpense, updateExpense, decideExpense, deleteExpense,
  uploadReceipt, fetchExpenseReport, downloadExpenseXlsx,
  type Expense, type ExpenseListResponse, type ApprovalStatus,
} from '@/lib/api/marketingFinance';
import { fetchProjectWorkspace, type MarketingProject } from '@/lib/api/marketingProjects';

/**
 * MK-004.2 Expense Logger + MK-004.3 Approval workflow + MK-004.6 Export.
 *
 * ONE page, not three. The list, the approval decision and the export all act on
 * the same filtered set, and a row opens in a same-page detail panel rather than
 * a separate route — the user never tab-hops to read an expense.
 *
 * The selected expense is mirrored into `?expense=<id>` so the panel survives a
 * refresh and Back closes it, and the filters live in the URL too so returning
 * from a detail lands on the same list the user left.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

const fmtDate = (ymd: string | null) =>
  ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_TABS: { key: ApprovalStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Awaiting approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_STYLE: Record<ApprovalStatus, { cls: string; label: string; Icon: typeof Clock }> = {
  approved: { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Approved', Icon: CheckCircle2 },
  pending: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Awaiting approval', Icon: Clock },
  rejected: { cls: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', label: 'Rejected', Icon: XCircle },
};

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span className={classNames('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', s.cls)}>
      <s.Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

interface ExpenseForm {
  title: string; category: string; clientId: string; projectId: string;
  amount: string; date: string; vendor: string; notes: string;
}
const emptyForm = (clientId: number | null): ExpenseForm => ({
  title: '', category: '', clientId: clientId ? String(clientId) : '', projectId: '',
  amount: '', date: new Date().toISOString().slice(0, 10), vendor: '', notes: '',
});

export default function MarketingExpensesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  // The provider exposes one toast(message, type); these keep the call sites
  // readable without inventing a second toast API.
  const toastOk = useCallback((m: string) => toast(m, 'success'), [toast]);
  const toastErr = useCallback((m: string) => toast(m, 'error'), [toast]);
  const { confirm } = useConfirm();

  /* Filters live in the URL so Back from a detail restores the exact list. */
  const clientId = params.get('clientId') ? Number(params.get('clientId')) : null;
  const status = (params.get('status') as ApprovalStatus | 'all') || 'all';
  const category = params.get('category') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const search = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const selectedId = params.get('expense') ? Number(params.get('expense')) : null;

  const [data, setData] = useState<ExpenseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  /* Seeded from the URL; the input is keyed on `search`, so an external
     * change (Back/Forward, a pasted link) remounts it with the new value. */
  const [searchDraft, setSearchDraft] = useState(search);

  const setParams = useCallback((patch: Record<string, string | number | null>, resetPage = true) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage && !('page' in patch)) next.delete('page');
    /* Opening or closing a DETAIL is a navigation step the user expects Back to
     * undo, so it PUSHES. Filter and page changes REPLACE: pushing them would
     * bury the previous page under one history entry per keystroke, and Back
     * would walk the filter history instead of leaving the list. */
    const isDetailChange = 'expense' in patch;
    // Opening a detail renders from data already on screen; only a real refetch
    // raises the spinner.
    if (!isDetailChange) setLoading(true);
    const nav = isDetailChange ? router.push : router.replace;
    nav(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  /** The request for the CURRENT filters. Pure — it sets no state, so both the
   *  effect below and the imperative refetch can share it. */
  const fetchPage = useCallback(
    () => fetchExpenses({ clientId, approvalStatus: status, category, from, to, search, page, pageSize: 25 }),
    [clientId, status, category, from, to, search, page],
  );

  const applyResult = useCallback((res: ExpenseListResponse) => {
    setData(res);
    setError(null);
    // Land on a client rather than an org-wide list, without ever aggregating
    // across clients.
    if (!clientId && res.clients[0]) setParams({ clientId: res.clients[0].id });
  }, [clientId, setParams]);

  const applyError = useCallback((err: unknown) => {
    setData(null);
    setError(apiError(err) || 'Unable to load expenses');
  }, []);

  /* Fetch on mount and whenever the filters change. State is written from the
   * promise callbacks, never synchronously while the effect commits, and the
   * `cancelled` guard means a slow response from an abandoned filter can no
   * longer land on top of a newer one. */
  useEffect(() => {
    let cancelled = false;
    fetchPage()
      .then((res) => { if (!cancelled) { applyResult(res); setLoading(false); } })
      .catch((err) => { if (!cancelled) { applyError(err); setLoading(false); } });
    return () => { cancelled = true; };
  }, [fetchPage, applyResult, applyError]);

  /** Imperative refetch after a mutation. Called from event handlers only. */
  const load = useCallback(async () => {
    setLoading(true);
    try { applyResult(await fetchPage()); }
    catch (err) { applyError(err); }
    finally { setLoading(false); }
  }, [fetchPage, applyResult, applyError]);

  // Debounced remote search — one request per pause, not per keystroke.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (v: string) => {
    setSearchDraft(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParams({ q: v || null }), 350);
  };

  // Projects for the chosen client, so the form never offers another client's.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!clientId) { setProjects([]); return; }
      try {
        const ws = await fetchProjectWorkspace();
        // Only THIS client's projects — a cost must not be filed against another
        // client's project, and the server rejects it if it is.
        if (!cancelled) setProjects(ws.clients.find((c) => c.id === clientId)?.projects ?? []);
      } catch { if (!cancelled) setProjects([]); }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const clients = data?.clients ?? [];
  const client = clients.find((c) => c.id === clientId) ?? null;
  const perms = data?.permissions ?? { canCreate: false, canEdit: false, canDelete: false, canApprove: false };
  const selected = useMemo(
    () => data?.expenses.find((e) => e.id === selectedId) ?? null,
    [data, selectedId],
  );
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize || 25)));
  const filtersActive = !!(status !== 'all' || category || from || to || search);

  /* ── Create / edit ───────────────────────────────────────────────────────── */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm(clientId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(clientId));
    setErrors({});
    setReceipt(null);
    setFormOpen(true);
  };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      title: e.title, category: e.category, clientId: String(e.clientId ?? ''),
      projectId: e.projectId ? String(e.projectId) : '', amount: String(e.amount),
      date: e.date ?? '', vendor: e.vendor ?? '', notes: e.notes ?? '',
    });
    setErrors({});
    setReceipt(null);
    setFormOpen(true);
  };

  const submit = async () => {
    if (saving) return;                                   // duplicate-submit lock
    const { errors: zodErrors, data: parsed } = validate(expenseSchema, form);
    if (Object.keys(zodErrors).length || !parsed) { setErrors(zodErrors); return; }
    setErrors({});

    /* MK-004.2 — large expenses ask for confirmation BEFORE anything is written.
     * The threshold is the server's configured value, never a number written
     * into this file. */
    const threshold = data?.settings.largeExpenseThreshold ?? 0;
    if (threshold > 0 && parsed.amount >= threshold) {
      const ok = await confirm({
        title: 'Confirm a large expense',
        message: `You are about to log ${formatINR(parsed.amount)} against ${client?.name ?? 'this client'}.`,
        warning: `This is at or above the ${formatINR(threshold)} review threshold.`,
        confirmLabel: 'Yes, log it',
        intent: 'primary',
        icon: AlertTriangle,
      });
      // Cancel means nothing is created — the form stays exactly as typed.
      if (!ok) return;
    }

    setSaving(true);
    try {
      const payload = {
        clientId: parsed.clientId, projectId: parsed.projectId, title: parsed.title,
        category: parsed.category, amount: parsed.amount, date: parsed.date,
        vendor: parsed.vendor || null, notes: parsed.notes || null,
      };
      const saved = editing
        ? await updateExpense(editing.id, payload)
        : (await createExpense(payload)).expense;

      if (receipt) {
        try {
          await uploadReceipt(saved.id, receipt);
        } catch (err) {
          // The expense IS saved; only the attachment failed. Say exactly that
          // rather than letting the whole save look failed.
          toastErr(apiError(err) || 'Expense saved, but the receipt could not be attached.');
        }
      }

      toastOk(
        editing ? 'Expense updated'
          : saved.approvalStatus === 'pending'
            ? 'Expense submitted — awaiting manager approval'
            : 'Expense logged and auto-approved',
      );
      setFormOpen(false);
      await load();
    } catch (err) {
      const fe = fieldErrorsFromApi(err);
      // Entered values are preserved: only the errors change.
      if (Object.keys(fe).length) setErrors(fe);
      else toastErr(apiError(err) || 'Could not save the expense');
    } finally {
      setSaving(false);
    }
  };

  /* ── MK-004.3 decision ───────────────────────────────────────────────────── */
  const [decisionFor, setDecisionFor] = useState<{ expense: Expense; decision: 'approved' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>();
  const [deciding, setDeciding] = useState(false);

  const submitDecision = async () => {
    if (!decisionFor || deciding) return;                 // duplicate-submit lock
    if (decisionFor.decision === 'rejected' && !note.trim()) {
      setNoteError('A reason is required when rejecting.');
      return;
    }
    setNoteError(undefined);
    setDeciding(true);
    try {
      await decideExpense(decisionFor.expense.id, decisionFor.decision, note.trim());
      toastOk(decisionFor.decision === 'approved' ? 'Expense approved' : 'Expense rejected');
      setDecisionFor(null);
      setNote('');
      await load();
    } catch (err) {
      // A 409 means someone else decided first — reload so the screen shows the
      // decision that actually stands.
      toastErr(apiError(err) || 'Could not record the decision');
      await load();
    } finally {
      setDeciding(false);
    }
  };

  const removeExpense = async (e: Expense) => {
    const ok = await confirm({
      title: 'Delete this expense?',
      message: `“${e.title}” (${formatINR(e.amount)}) will be removed.`,
      warning: 'This cannot be undone.',
      confirmLabel: 'Delete',
      intent: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    try {
      await deleteExpense(e.id);
      toastOk('Expense deleted');
      setParams({ expense: null });
      await load();
    } catch (err) {
      toastErr(apiError(err) || 'Could not delete the expense');
    }
  };

  /* ── MK-004.6 export ─────────────────────────────────────────────────────── */
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm, setExportForm] = useState({ clientId: '', from: '', to: '' });
  const [exportErrors, setExportErrors] = useState<FieldErrors>({});
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const openExport = () => {
    // Pre-filled from the list the user is looking at, so the export defaults to
    // exactly what is on screen.
    setExportForm({ clientId: clientId ? String(clientId) : '', from, to });
    setExportErrors({});
    setExportOpen(true);
  };

  const runExport = async (format: 'xlsx' | 'pdf') => {
    if (exporting) return;
    const { errors: ferr, data: parsed } = validate(exportFilterSchema, exportForm);
    if (Object.keys(ferr).length || !parsed) { setExportErrors(ferr); return; }
    setExportErrors({});
    setExporting(format);
    try {
      const name = clients.find((c) => c.id === parsed.clientId)?.name ?? 'client';
      if (format === 'xlsx') {
        await downloadExpenseXlsx(parsed.clientId, name, parsed.from || undefined, parsed.to || undefined);
      } else {
        // The PDF is rendered from the SERVER's report payload — the same object
        // the Excel endpoint serialises — so the two files cannot disagree.
        const report = await fetchExpenseReport(parsed.clientId, parsed.from || undefined, parsed.to || undefined);
        downloadExpenseReportPdf(report);
        if (!report.count) toastOk('Report generated — no approved expenses in that period.');
      }
      setExportOpen(false);
    } catch (err) {
      const fe = fieldErrorsFromApi(err);
      if (Object.keys(fe).length) setExportErrors(fe);
      else toastErr(apiError(err) || 'Could not build the report');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-cyan-50 dark:bg-cyan-900/30 p-2">
            <Receipt className="h-5 w-5 text-cyan-600" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ad spend, asset rental and other production costs — logged, approved and reported per client.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={openExport} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" /> Export
          </Button>
          {perms.canCreate && (
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Log expense
            </Button>
          )}
        </div>
      </div>

      {/* ── Client + status ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="exp-client">Client</label>
            <select
              id="exp-client" className={inputCls} value={clientId ?? ''}
              onChange={(e) => setParams({ clientId: e.target.value || null, expense: null })}
            >
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className={labelCls} htmlFor="exp-category">Category</label>
            <select
              id="exp-category" className={inputCls} value={category}
              onChange={(e) => setParams({ category: e.target.value || null })}
            >
              <option value="">All categories</option>
              {(data?.categories ?? []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className={labelCls} htmlFor="exp-from">From</label>
            <input id="exp-from" type="date" className={inputCls} value={from}
              onChange={(e) => setParams({ from: e.target.value || null })} />
          </div>
          <div className="min-w-[140px]">
            <label className={labelCls} htmlFor="exp-to">To</label>
            <input
              id="exp-to" type="date"
              className={classNames(inputCls, to && from && to < from ? invalidInputCls : '')}
              value={to} onChange={(e) => setParams({ to: e.target.value || null })}
            />
            {to && from && to < from && (
              <FieldError message="The end date cannot be earlier than the start date." />
            )}
          </div>
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="exp-search">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                key={search}
                id="exp-search" className={classNames(inputCls, 'pl-8 pr-8')} value={searchDraft}
                placeholder="Title, vendor, description…"
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchDraft && (
                <button
                  type="button" aria-label="Clear search"
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  onClick={() => { setSearchDraft(''); setParams({ q: null }); }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {filtersActive && (
            <Button
              variant="secondary" className="gap-1.5"
              onClick={() => setParams({ status: null, category: null, from: null, to: null, q: null })}
            >
              <Filter className="h-4 w-4" /> Clear filters
            </Button>
          )}
        </div>

        {/* Approval status tabs — the module's underline tab style. */}
        <div className="mt-3 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key} type="button"
              onClick={() => setParams({ status: t.key === 'all' ? null : t.key, expense: null })}
              className={classNames(
                'border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                status === t.key
                  ? 'border-cyan-500 text-cyan-700 dark:text-cyan-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Totals across the WHOLE filtered set, not just this page ─────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ['Approved', data?.totals.approved ?? 0, 'text-emerald-600', 'Counts towards client cost reporting'],
          ['Awaiting approval', data?.totals.pending ?? 0, 'text-amber-600', 'Excluded from cost reporting'],
          ['Rejected', data?.totals.rejected ?? 0, 'text-rose-600', 'Excluded from cost reporting'],
        ] as const).map(([label, value, tone, hint]) => (
          <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
            <p className={classNames('mt-1 text-xl font-bold', tone)}>{formatINR(value)}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>
          </div>
        ))}
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {error ? (
          <div className="px-4 py-10 text-center text-sm text-rose-600">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : !data?.expenses.length ? (
          <div className="px-4 py-12 text-center">
            <Receipt className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
              {filtersActive ? 'No expenses match these filters.' : 'No expenses logged yet.'}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {filtersActive
                ? 'Try widening the date range or clearing a filter.'
                : perms.canCreate ? 'Log the first production cost to see it here.' : 'Expenses logged for this client will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {data.expenses.map((e) => (
                  <tr
                    key={e.id}
                    // The whole row opens the detail panel — one click to inspect,
                    // no separate page, no tab hop.
                    onClick={() => setParams({ expense: e.id }, false)}
                    className={classNames(
                      'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      selectedId === e.id && 'bg-cyan-50/60 dark:bg-cyan-900/20',
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-400">{fmtDate(e.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{e.title}</span>
                      {e.receiptUrl && <Paperclip className="ml-1.5 inline h-3 w-3 text-gray-400" />}
                      {e.vendor && <span className="block text-[11px] text-gray-400">{e.vendor}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{e.category}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{e.projectName ?? '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={e.approvalStatus} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {formatINR(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 text-xs text-gray-500">
            <span>Page {page} of {totalPages} — {data?.total} expenses</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1}
                onClick={() => setParams({ page: page - 1 }, false)}>Previous</Button>
              <Button variant="secondary" disabled={page >= totalPages}
                onClick={() => setParams({ page: page + 1 }, false)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Same-page detail panel ──────────────────────────────────────────────
        * A slide-over rather than a separate route: the list stays mounted
        * behind it, so closing returns to the exact scroll/filter/page state.
        * The selection lives in `?expense=`, so a refresh reopens the same
        * record and Back closes the panel. */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true"
          aria-label={`Expense: ${selected.title}`}>
          <button
            type="button" aria-label="Close details"
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setParams({ expense: null }, false)}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">{selected.title}</h2>
                <div className="mt-1"><StatusBadge status={selected.approvalStatus} /></div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setParams({ expense: null }, false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatINR(selected.amount)}</p>
              </div>

              <dl className="space-y-2 text-sm">
                {([
                  ['Date', fmtDate(selected.date)],
                  ['Category', selected.category],
                  ['Client', client?.name ?? '—'],
                  ['Project', selected.projectName ?? '—'],
                  ['Vendor', selected.vendor ?? '—'],
                  ['Submitted by', selected.submittedByName ?? '—'],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                    <dd className="text-right font-medium text-gray-800 dark:text-gray-200">{v}</dd>
                  </div>
                ))}
              </dl>

              {selected.notes && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{selected.notes}</p>
                </div>
              )}

              {selected.receiptUrl && (
                <a href={selected.receiptUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-900/20">
                  <Paperclip className="h-4 w-4" />
                  {selected.receiptName || 'View receipt'}
                </a>
              )}

              {/* The decision, once made, with its reason — so a rejected
                  submitter can see exactly what to correct. */}
              {selected.approvalStatus !== 'pending' && (selected.decidedByName || selected.decisionNote) && (
                <div className={classNames(
                  'rounded-xl p-3 text-sm',
                  selected.approvalStatus === 'rejected'
                    ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
                )}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    {selected.approvalStatus === 'rejected' ? 'Rejected' : 'Approved'}
                    {selected.decidedByName ? ` by ${selected.decidedByName}` : ''}
                  </p>
                  {selected.decisionNote && (
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{selected.decisionNote}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                {perms.canApprove && selected.approvalStatus === 'pending' && (
                  <>
                    <Button className="gap-1.5"
                      onClick={() => { setNote(''); setNoteError(undefined); setDecisionFor({ expense: selected, decision: 'approved' }); }}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button variant="danger" className="gap-1.5"
                      onClick={() => { setNote(''); setNoteError(undefined); setDecisionFor({ expense: selected, decision: 'rejected' }); }}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </>
                )}
                {perms.canEdit && selected.approvalStatus !== 'approved' && (
                  <Button variant="secondary" className="gap-1.5" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4" />
                    {selected.approvalStatus === 'rejected' ? 'Correct and resubmit' : 'Edit'}
                  </Button>
                )}
                {perms.canDelete && selected.approvalStatus !== 'approved' && (
                  <Button variant="secondary" className="gap-1.5 text-rose-600" onClick={() => void removeExpense(selected)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
              {selected.approvalStatus === 'approved' && (
                <p className="text-[11px] text-gray-400">
                  Approved expenses are part of reported client spend and can no longer be edited or deleted.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Create / edit form ──────────────────────────────────────────────── */}
      <Modal
        isOpen={formOpen}
        onClose={() => { if (!saving) setFormOpen(false); }}
        title={editing ? 'Edit expense' : 'Log an expense'}
        size="lg"
        busy={saving}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="f-title">Title <span className="text-rose-500">*</span></label>
            <input id="f-title" className={classNames(inputCls, errors.title && invalidInputCls)}
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <FieldError message={errors.title} />
          </div>

          <div>
            <label className={labelCls} htmlFor="f-amount">Amount (₹) <span className="text-rose-500">*</span></label>
            <input id="f-amount" inputMode="decimal"
              className={classNames(inputCls, errors.amount && invalidInputCls)}
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <FieldError message={errors.amount} />
          </div>

          <div>
            <label className={labelCls} htmlFor="f-date">Date <span className="text-rose-500">*</span></label>
            <input id="f-date" type="date" className={classNames(inputCls, errors.date && invalidInputCls)}
              value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <FieldError message={errors.date} />
          </div>

          <div>
            <label className={labelCls} htmlFor="f-category">Category <span className="text-rose-500">*</span></label>
            <select id="f-category" className={classNames(inputCls, errors.category && invalidInputCls)}
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Choose a category…</option>
              {(data?.categories ?? []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <FieldError message={errors.category} />
          </div>

          <div>
            <label className={labelCls} htmlFor="f-client">Client <span className="text-rose-500">*</span></label>
            <select id="f-client" className={classNames(inputCls, errors.clientId && invalidInputCls)}
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value, projectId: '' })}>
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FieldError message={errors.clientId} />
          </div>

          <div>
            <label className={labelCls} htmlFor="f-project">Project</label>
            <select id="f-project" className={classNames(inputCls, errors.projectId && invalidInputCls)}
              value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              disabled={String(clientId ?? '') !== form.clientId}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldError message={errors.projectId} />
            {String(clientId ?? '') !== form.clientId && form.clientId && (
              <p className="mt-1 text-[11px] text-gray-400">Switch the list to this client to pick one of its projects.</p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor="f-vendor">Vendor</label>
            <input id="f-vendor" className={classNames(inputCls, errors.vendor && invalidInputCls)}
              value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            <FieldError message={errors.vendor} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="f-notes">Description</label>
            <textarea id="f-notes" rows={3} className={classNames(inputCls, errors.notes && invalidInputCls)}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <FieldError message={errors.notes} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="f-receipt">Receipt</label>
            <input id="f-receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              className={classNames(inputCls, 'py-1.5')}
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
            <p className="mt-1 text-[11px] text-gray-400">JPG, PNG, WEBP or PDF, up to 10 MB. Optional.</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
          {/* Disabled while in flight — a double click cannot create two rows. */}
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Log expense'}
          </Button>
        </div>
      </Modal>

      {/* ── Approve / reject ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!decisionFor}
        onClose={() => { if (!deciding) setDecisionFor(null); }}
        title={decisionFor?.decision === 'rejected' ? 'Reject this expense' : 'Approve this expense'}
        size="md"
        busy={deciding}
      >
        {decisionFor && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{decisionFor.expense.title}</span>
              {' — '}{formatINR(decisionFor.expense.amount)}
              {decisionFor.expense.submittedByName ? `, submitted by ${decisionFor.expense.submittedByName}` : ''}.
            </p>
            {decisionFor.decision === 'approved' && (
              <p className="mt-1.5 text-xs text-gray-500">
                Approving includes this amount in the client&apos;s production cost reporting and exports.
              </p>
            )}
            <div className="mt-3">
              <label className={labelCls} htmlFor="d-note">
                {decisionFor.decision === 'rejected' ? 'Reason' : 'Note'}
                {decisionFor.decision === 'rejected' && <span className="text-rose-500"> *</span>}
              </label>
              <textarea
                id="d-note" rows={3}
                className={classNames(inputCls, noteError && invalidInputCls)}
                placeholder={decisionFor.decision === 'rejected'
                  ? 'What needs correcting before this can be resubmitted?'
                  : 'Optional'}
                value={note}
                onChange={(e) => { setNote(e.target.value); if (noteError) setNoteError(undefined); }}
              />
              <FieldError message={noteError} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" disabled={deciding} onClick={() => setDecisionFor(null)}>Cancel</Button>
              <Button
                variant={decisionFor.decision === 'rejected' ? 'danger' : 'primary'}
                disabled={deciding}
                onClick={() => void submitDecision()}
              >
                {deciding ? 'Saving…' : decisionFor.decision === 'rejected' ? 'Reject expense' : 'Approve expense'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ── MK-004.6 Export ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={exportOpen}
        onClose={() => { if (!exporting) setExportOpen(false); }}
        title="Export expense report"
        size="md"
        busy={!!exporting}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Reports contain <span className="font-semibold">approved expenses only</span> — pending and rejected
          submissions are never exported.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className={labelCls} htmlFor="x-client">Client <span className="text-rose-500">*</span></label>
            <select id="x-client" className={classNames(inputCls, exportErrors.clientId && invalidInputCls)}
              value={exportForm.clientId}
              onChange={(e) => setExportForm({ ...exportForm, clientId: e.target.value })}>
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FieldError message={exportErrors.clientId} />
          </div>
          <div>
            <label className={labelCls} htmlFor="x-from">From</label>
            <input id="x-from" type="date" className={classNames(inputCls, exportErrors.from && invalidInputCls)}
              value={exportForm.from} onChange={(e) => setExportForm({ ...exportForm, from: e.target.value })} />
            <FieldError message={exportErrors.from} />
          </div>
          <div>
            <label className={labelCls} htmlFor="x-to">To</label>
            <input id="x-to" type="date" className={classNames(inputCls, exportErrors.to && invalidInputCls)}
              value={exportForm.to} onChange={(e) => setExportForm({ ...exportForm, to: e.target.value })} />
            <FieldError message={exportErrors.to} />
          </div>
          <div className="flex items-end">
            <p className="text-[11px] text-gray-400">Leave both blank for all dates.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={!!exporting} onClick={() => setExportOpen(false)}>Cancel</Button>
          <Button variant="secondary" className="gap-1.5" disabled={!!exporting} onClick={() => void runExport('pdf')}>
            <FileText className="h-4 w-4" /> {exporting === 'pdf' ? 'Building…' : 'Download PDF'}
          </Button>
          <Button className="gap-1.5" disabled={!!exporting} onClick={() => void runExport('xlsx')}>
            <FileSpreadsheet className="h-4 w-4" /> {exporting === 'xlsx' ? 'Building…' : 'Download Excel'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
