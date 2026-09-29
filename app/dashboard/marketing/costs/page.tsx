'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { IndianRupee, PieChart as PieIcon, Plus, Receipt, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { classNames } from '@/lib/utils';
import { formatINR } from '@/lib/utils/currency';
import { useToast } from '@/lib/hooks/useToast';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import {
  collect, hasErrors, requiredText, validDate, nonNegativeNumber,
  fieldErrorsFromApi, invalidInputCls, type FieldErrors,
} from '@/lib/marketing/contentValidation';
import {
  fetchClientCosts, logClientCost, type ClientCosts, type CostClient,
} from '@/lib/api/marketingCosts';
import { fetchProjectWorkspace, type MarketingProject } from '@/lib/api/marketingProjects';

/**
 * MK-004.1 — production cost dashboard, per client.
 *
 * Every figure comes from the server's aggregation of the existing
 * finance_expense rows. The chart is rendered from the SAME `categories` array
 * the table lists, so the picture and the numbers cannot disagree.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

/** Chart palette. Cycled so any number of admin-defined categories renders. */
const SLICE_COLORS = ['#0891b2', '#7c3aed', '#059669', '#d97706', '#db2777', '#2563eb', '#65a30d', '#dc2626'];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function MarketingCostsPage() {
  const [data, setData] = useState<ClientCosts | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);

  const load = useCallback(async (id: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchClientCosts(id ?? undefined);
      setData(res);
      // Default to the first client so the page is useful on arrival, without
      // ever aggregating across clients.
      setClientId((cur) => cur ?? res.clients[0]?.id ?? null);
    } catch (err) {
      setData(null);
      setError(apiError(err) || 'Unable to load production costs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(null); }, [load]);
  useEffect(() => { if (clientId) void load(clientId); }, [clientId]);   // eslint-disable-line react-hooks/exhaustive-deps

  const clients: CostClient[] = data?.clients ?? [];
  const hasExpenses = (data?.expenses.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Production Costs</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Logged production spend, per client.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
            Client
            <select
              value={clientId ?? ''}
              onChange={(e) => setClientId(Number(e.target.value) || null)}
              aria-label="Client"
              disabled={!clients.length}
              className={classNames(inputCls, 'w-auto py-1 text-xs')}
            >
              {!clients.length && <option value="">No clients</option>}
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {/* The dashboard answers "how much"; the Expenses workspace answers
              "which ones, and what still needs approving". Linking them with the
              client carried over means no re-picking a filter to cross over. */}
          <Link
            href={clientId ? `/dashboard/marketing/expenses?clientId=${clientId}` : '/dashboard/marketing/expenses'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Receipt className="h-3.5 w-3.5" /> All expenses
          </Link>
          {data?.canLog && clientId && (
            <Button onClick={() => setLogging(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Log cost
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-12 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
          <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <button type="button" onClick={() => void load(clientId)}
            className="mt-2 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-400">Try again</button>
        </div>
      ) : !clients.length ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-12 text-center">
          <Receipt className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No clients configured yet.</p>
          <p className="mt-0.5 text-xs text-gray-400">Add one in Marketing → Administration to start tracking costs.</p>
        </div>
      ) : (
        <>
          {/* ── Headline figures ───────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Logged expenses</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatINR(data?.totalSpend ?? 0)}</p>
              {/* MK-004.3 — this figure is APPROVED-only. Saying so matters:
                  without it a reader cannot tell why a submitted cost is absent. */}
              <p className="mt-0.5 text-[11px] text-gray-400">
                {data?.expenses.length ?? 0} approved {(data?.expenses.length ?? 0) === 1 ? 'cost' : 'costs'}
                {' '}&middot; pending and rejected excluded
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Budget</p>
              {/* budget === null means NOT CONFIGURED. Rendering 0 here would
                  read as "a budget of zero", i.e. 100% overspent — a different
                  and false claim. */}
              {data?.budget === null || data?.budget === undefined ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-gray-400 dark:text-gray-500">Not configured</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">No budget is set up for this client.</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatINR(data.budget)}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {data.variance === null ? 'Variance unavailable' : `Variance ${formatINR(data.variance)}`}
                  </p>
                </>
              )}
            </div>

            {/* MK-004.4 / MK-004.5 — media spend lives in its own trackers and is
                reported here beside logged expenses. It is NEVER copied into
                finance_expense, so nothing below is double counted. */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Media spend</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatINR((data?.campaignSpend?.spend ?? 0) + (data?.influencerSpend?.committed ?? 0))}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Ads {formatINR(data?.campaignSpend?.spend ?? 0)} &middot; Influencers {formatINR(data?.influencerSpend?.committed ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Total client cost</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatINR(data?.combinedSpend ?? 0)}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Approved expenses + ad spend + influencer fees</p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Categories</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data?.categories.length ?? 0}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {data?.categories[0] ? `Largest: ${data.categories[0].name}` : 'Nothing logged yet'}
              </p>
            </div>
          </div>

          {!hasExpenses ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-12 text-center">
              <Receipt className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                No expenses recorded for {data?.client?.name ?? 'this client'}.
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {data?.canLog ? 'Log the first production cost to see the breakdown.' : 'Costs logged against this client will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {/* ── Chart ────────────────────────────────────────────────── */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  <PieIcon className="h-4 w-4 text-cyan-600" /> Spend by category
                </h2>
                {/* Fed from the SAME array the table below renders, so the chart
                    cannot show a different total than the figures. */}
                <div className="mt-2 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.categories ?? []}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius="45%"
                        outerRadius="78%"
                        paddingAngle={2}
                      >
                        {(data?.categories ?? []).map((c, i) => (
                          <Cell key={c.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(Number(v ?? 0))} />
                      <Legend verticalAlign="bottom" height={28} iconSize={9}
                        wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Breakdown table ──────────────────────────────────────── */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Category breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {(data?.categories ?? []).map((c, i) => (
                        <tr key={c.name}>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                              {c.name}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-gray-200">{formatINR(c.amount)}</td>
                          <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{c.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-2 text-xs font-bold uppercase text-gray-500">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">{formatINR(data?.totalSpend ?? 0)}</td>
                        <td className="px-4 py-2" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {hasExpenses && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Logged costs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {(data?.expenses ?? []).map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-2">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{e.title}</div>
                          {e.vendor && <div className="text-[10px] text-gray-400">{e.vendor}</div>}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{e.category}</td>
                        <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{fmtDate(e.date)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-gray-200">{formatINR(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {logging && clientId && (
        <LogCostModal
          key={clientId}
          clientId={clientId}
          onClose={() => setLogging(false)}
          onLogged={async () => { setLogging(false); await load(clientId); }}
        />
      )}
    </div>
  );
}

/* ── Log a production cost ───────────────────────────────────────────────── */

function LogCostModal({ clientId, onClose, onLogged }: {
  clientId: number; onClose: () => void; onLogged: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  const [form, setForm] = useState({ title: '', category: '', amount: '', date: '', vendor: '', projectId: '', notes: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  /* `saving` is React state; two clicks in one tick would both read it as false.
     The ref updates synchronously. */
  const submittingRef = useRef(false);

  useEffect(() => {
    // Only this client's projects — a cost must not be filed against another
    // client's project, and the server rejects it if it is.
    fetchProjectWorkspace()
      .then((ws) => setProjects(ws.clients.find((c) => c.id === clientId)?.projects ?? []))
      .catch(() => setProjects([]));
  }, [clientId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (submittingRef.current) return;
    const errs = collect({
      title: requiredText(form.title, 'Title'),
      amount: requiredText(form.amount, 'Amount')
        ?? nonNegativeNumber(form.amount, 'Amount')
        ?? (Number(form.amount) > 0 ? undefined : 'Enter an amount greater than zero.'),
      date: requiredText(form.date, 'Date') ?? validDate(form.date, 'Date'),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    submittingRef.current = true;
    setSaving(true);
    try {
      await logClientCost({
        clientId,
        projectId: form.projectId ? Number(form.projectId) : null,
        title: form.title.trim(),
        category: form.category.trim() || undefined,
        amount: Number(form.amount),
        date: form.date,
        vendor: form.vendor.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast('Production cost logged successfully', 'success');
      await onLogged();
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setErrors(mapped);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to log the production cost', 'error');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal confirmDiscard isOpen onClose={onClose} busy={saving} title="Log production cost" size="md">
      <div className="space-y-3">
        <div>
          <label htmlFor="lc-title" className={labelCls}>Title <span className="text-rose-500">*</span></label>
          <input id="lc-title" value={form.title} onChange={set('title')} maxLength={255} aria-invalid={!!errors.title}
            className={classNames(inputCls, errors.title && invalidInputCls)} placeholder="e.g. Studio hire" />
          <FieldError message={errors.title} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lc-amount" className={labelCls}>Amount (₹) <span className="text-rose-500">*</span></label>
            <input id="lc-amount" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')}
              aria-invalid={!!errors.amount} className={classNames(inputCls, errors.amount && invalidInputCls)} placeholder="15000" />
            <FieldError message={errors.amount} />
          </div>
          <div>
            <label htmlFor="lc-date" className={labelCls}>Date <span className="text-rose-500">*</span></label>
            <input id="lc-date" type="date" value={form.date} onChange={set('date')} aria-invalid={!!errors.date}
              className={classNames(inputCls, errors.date && invalidInputCls)} />
            <FieldError message={errors.date} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lc-category" className={labelCls}>Category</label>
            <input id="lc-category" value={form.category} onChange={set('category')} maxLength={100}
              className={inputCls} placeholder="Production, Editing, Travel…" list="cost-categories" />
            {/* Suggestions only — categories are free text in the existing
                finance data, so the dashboard reports whatever is stored. */}
            <datalist id="cost-categories">
              {['Production', 'Editing', 'Travel', 'Equipment', 'Talent', 'Miscellaneous'].map((c) => <option key={c} value={c} />)}
            </datalist>
            <FieldError message={errors.category} />
          </div>
          <div>
            <label htmlFor="lc-project" className={labelCls}>Project</label>
            <select id="lc-project" value={form.projectId} onChange={set('projectId')}
              aria-invalid={!!errors.projectId} className={classNames(inputCls, errors.projectId && invalidInputCls)}>
              <option value="">Not project-specific</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldError message={errors.projectId} />
          </div>
        </div>
        <div>
          <label htmlFor="lc-vendor" className={labelCls}>Vendor</label>
          <input id="lc-vendor" value={form.vendor} onChange={set('vendor')} maxLength={255} className={inputCls} />
        </div>
        <div>
          <label htmlFor="lc-notes" className={labelCls}>Notes</label>
          <textarea id="lc-notes" value={form.notes} onChange={set('notes')} rows={2} className={classNames(inputCls, 'resize-y')} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} isLoading={saving}>Log cost</Button>
        </div>
      </div>
    </Modal>
  );
}
