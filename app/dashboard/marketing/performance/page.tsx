'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  TrendingUp, Plus, Search, X, AlertTriangle, Pencil, Trash2, Target, MousePointerClick, Users,
  IndianRupee as IndianRupeeIcon,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { formatINR } from '@/lib/utils/currency';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import { fieldErrorsFromApi, invalidInputCls, type FieldErrors } from '@/lib/marketing/contentValidation';
import { validate, campaignSchema } from '@/lib/marketing/financeValidation';
import {
  fetchCampaigns, createCampaign, updateCampaign, deleteCampaign,
  type AdCampaign, type CampaignListResponse,
} from '@/lib/api/marketingFinance';
import { fetchProjectWorkspace, type MarketingProject } from '@/lib/api/marketingProjects';

/**
 * MK-004.4 — performance marketing tracker.
 *
 * Every rate on this page (CPL, CPC, CTR, ROI, budget used) is computed by the
 * SERVER from the raw counters and arrives as a number or `null`. `null` means
 * "not computable yet" and renders as an em dash — this page never divides, so
 * a zero-lead campaign can never produce Infinity or a fabricated 0.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

/** The one place a non-computable metric becomes visible text. */
const orDash = (v: number | null, fmt: (n: number) => string): string => (v === null ? '—' : fmt(v));
const pct = (n: number) => `${n}%`;
const num = (n: number) => n.toLocaleString('en-IN');

interface CampaignForm {
  name: string; clientId: string; projectId: string; platform: string;
  budget: string; spend: string; revenue: string;
  startDate: string; endDate: string;
  impressions: string; clicks: string; leads: string; conversions: string; notes: string;
}
const emptyForm = (clientId: number | null): CampaignForm => ({
  name: '', clientId: clientId ? String(clientId) : '', projectId: '', platform: '',
  budget: '', spend: '', revenue: '',
  startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10),
  impressions: '', clicks: '', leads: '', conversions: '', notes: '',
});

export default function MarketingPerformancePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const toastOk = useCallback((m: string) => toast(m, 'success'), [toast]);
  const toastErr = useCallback((m: string) => toast(m, 'error'), [toast]);
  const { confirm } = useConfirm();

  const clientId = params.get('clientId') ? Number(params.get('clientId')) : null;
  const platform = params.get('platform') || '';
  const search = params.get('q') || '';
  const selectedId = params.get('campaign') ? Number(params.get('campaign')) : null;

  const [data, setData] = useState<CampaignListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  /* Seeded from the URL; the input is keyed on `search`, so an external
     * change (Back/Forward, a pasted link) remounts it with the new value. */
  const [searchDraft, setSearchDraft] = useState(search);

  const setParams = useCallback((patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    // Detail open/close PUSHES so Back closes the panel; filters REPLACE so Back
    // does not walk back through every filter change.
    // Opening a detail renders from data already on screen; only a real refetch
    // raises the spinner.
    if (!('campaign' in patch)) setLoading(true);
    const nav = 'campaign' in patch ? router.push : router.replace;
    nav(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  /** The request for the CURRENT filters. Pure — it sets no state, so both the
   *  effect below and the imperative refetch can share it. */
  const fetchPage = useCallback(() => fetchCampaigns({ clientId, platform, search }), [clientId, platform, search]);

  const applyResult = useCallback((res: CampaignListResponse) => {
    setData(res);
    setError(null);
    if (!clientId && res.clients[0]) setParams({ clientId: res.clients[0].id });
  }, [clientId, setParams]);

  const applyError = useCallback((err: unknown) => {
    setData(null);
    setError(apiError(err) || 'Unable to load campaigns');
  }, []);

  /* Fetch on mount and whenever the filters change. State is written from the
   * promise callbacks, never synchronously while the effect commits, and the
   * `cancelled` guard stops a slow response from an abandoned filter landing on
   * top of a newer one. */
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

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (v: string) => {
    setSearchDraft(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParams({ q: v || null }), 350);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!clientId) { setProjects([]); return; }
      try {
        const ws = await fetchProjectWorkspace();
        if (!cancelled) setProjects(ws.clients.find((c) => c.id === clientId)?.projects ?? []);
      } catch { if (!cancelled) setProjects([]); }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const clients = data?.clients ?? [];
  const perms = data?.permissions ?? { canCreate: false, canEdit: false, canDelete: false };
  const selected = data?.campaigns.find((c) => c.id === selectedId) ?? null;

  /* ── Create / edit ───────────────────────────────────────────────────────── */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdCampaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm(clientId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null); setForm(emptyForm(clientId)); setErrors({}); setFormOpen(true);
  };
  const openEdit = (c: AdCampaign) => {
    setEditing(c);
    setForm({
      name: c.name, clientId: String(c.clientId), projectId: c.projectId ? String(c.projectId) : '',
      platform: c.platform, budget: String(c.budget), spend: String(c.spend), revenue: String(c.revenue),
      startDate: c.startDate ?? '', endDate: c.endDate ?? '',
      impressions: String(c.impressions), clicks: String(c.clicks),
      leads: String(c.leads), conversions: String(c.conversions), notes: c.notes ?? '',
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = async () => {
    if (saving) return;                                   // duplicate-submit lock
    const { errors: zerr, data: parsed } = validate(campaignSchema, form);
    if (Object.keys(zerr).length || !parsed) { setErrors(zerr); return; }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        clientId: parsed.clientId, projectId: parsed.projectId, name: parsed.name,
        platform: parsed.platform, budget: parsed.budget, spend: parsed.spend, revenue: parsed.revenue,
        startDate: parsed.startDate, endDate: parsed.endDate,
        impressions: parsed.impressions, clicks: parsed.clicks,
        leads: parsed.leads, conversions: parsed.conversions, notes: parsed.notes || null,
      };
      if (editing) await updateCampaign(editing.id, payload);
      else await createCampaign(payload);
      toastOk(editing ? 'Campaign updated' : 'Campaign created');
      setFormOpen(false);
      await load();
    } catch (err) {
      const fe = fieldErrorsFromApi(err);
      if (Object.keys(fe).length) setErrors(fe);           // values are preserved
      else toastErr(apiError(err) || 'Could not save the campaign');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: AdCampaign) => {
    const ok = await confirm({
      title: 'Delete this campaign?',
      message: `“${c.name}” and its recorded metrics will be removed.`,
      warning: 'This cannot be undone.',
      confirmLabel: 'Delete', intent: 'danger', icon: Trash2,
    });
    if (!ok) return;
    try {
      await deleteCampaign(c.id);
      toastOk('Campaign deleted');
      setParams({ campaign: null });
      await load();
    } catch (err) { toastErr(apiError(err) || 'Could not delete the campaign'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-violet-50 dark:bg-violet-900/30 p-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Performance Marketing</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paid campaign spend, reach and cost per lead, per client.
            </p>
          </div>
        </div>
        {perms.canCreate && (
          <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> New campaign</Button>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="c-client">Client</label>
            <select id="c-client" className={inputCls} value={clientId ?? ''}
              onChange={(e) => setParams({ clientId: e.target.value || null, campaign: null })}>
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className={labelCls} htmlFor="c-platform">Platform</label>
            <select id="c-platform" className={inputCls} value={platform}
              onChange={(e) => setParams({ platform: e.target.value || null })}>
              <option value="">All platforms</option>
              {(data?.platforms ?? []).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="c-search">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input key={search} id="c-search" className={classNames(inputCls, 'pl-8 pr-8')} value={searchDraft}
                placeholder="Campaign name…" onChange={(e) => onSearchChange(e.target.value)} />
              {searchDraft && (
                <button type="button" aria-label="Clear search"
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  onClick={() => { setSearchDraft(''); setParams({ q: null }); }}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Blended totals over the filtered set ────────────────────────────── */}
      {!!data?.campaigns.length && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['Budget', formatINR(data.totals.budget), Target, 'text-gray-800 dark:text-gray-200'],
            ['Spend', formatINR(data.totals.spend), IndianRupeeIcon, data.totals.overBudget ? 'text-rose-600' : 'text-gray-800 dark:text-gray-200'],
            ['Leads', num(data.totals.leads), Users, 'text-gray-800 dark:text-gray-200'],
            ['Blended CPL', orDash(data.totals.cpl, formatINR), MousePointerClick, 'text-gray-800 dark:text-gray-200'],
          ] as const).map(([label, value, Icon, tone]) => (
            <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <Icon className="h-3.5 w-3.5" /> {label}
              </p>
              <p className={classNames('mt-1 text-xl font-bold', tone)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Campaign list ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {error ? (
          <div className="px-4 py-10 text-center text-sm text-rose-600">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : !data?.campaigns.length ? (
          <div className="px-4 py-12 text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No campaigns yet.</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {perms.canCreate ? 'Create a campaign to start tracking spend and cost per lead.' : 'Campaigns for this client will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5">Campaign</th>
                  <th className="px-4 py-2.5">Platform</th>
                  <th className="px-4 py-2.5">Dates</th>
                  <th className="px-4 py-2.5 text-right">Budget</th>
                  <th className="px-4 py-2.5 text-right">Spend</th>
                  <th className="px-4 py-2.5 text-right">Leads</th>
                  <th className="px-4 py-2.5 text-right">CPL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {data.campaigns.map((c) => (
                  <tr key={c.id} onClick={() => setParams({ campaign: c.id })}
                    className={classNames(
                      'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      selectedId === c.id && 'bg-violet-50/60 dark:bg-violet-900/20',
                    )}>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</span>
                      {c.projectName && <span className="block text-[11px] text-gray-400">{c.projectName}</span>}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-gray-600 dark:text-gray-400">{c.platform}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">{c.startDate} → {c.endDate}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">
                      {c.budget > 0 ? formatINR(c.budget) : <span className="text-gray-400">Not set</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={classNames('font-semibold',
                        c.metrics.overBudget ? 'text-rose-600' : 'text-gray-800 dark:text-gray-200')}>
                        {formatINR(c.spend)}
                      </span>
                      {/* Budget alert — the app's existing danger tone, no new colour system. */}
                      {c.metrics.overBudget && (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" /> Over budget
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">{num(c.leads)}</td>
                    {/* null CPL renders '—' — never Infinity, never a fabricated 0. */}
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {orDash(c.metrics.cpl, formatINR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Same-page detail panel ──────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true"
          aria-label={`Campaign: ${selected.name}`}>
          <button type="button" aria-label="Close details" className="absolute inset-0 bg-gray-900/40"
            onClick={() => setParams({ campaign: null })} />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">{selected.name}</h2>
                <p className="text-xs capitalize text-gray-500">{selected.platform} · {selected.startDate} → {selected.endDate}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setParams({ campaign: null })}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              {selected.metrics.overBudget && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    Spend of {formatINR(selected.spend)} exceeds the {formatINR(selected.budget)} budget
                    {selected.metrics.budgetUsedPercent !== null && ` (${selected.metrics.budgetUsedPercent}% used)`}.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {([
                  ['Budget', selected.budget > 0 ? formatINR(selected.budget) : 'Not set'],
                  ['Spend', formatINR(selected.spend)],
                  ['Impressions', num(selected.impressions)],
                  ['Clicks', num(selected.clicks)],
                  ['Leads', num(selected.leads)],
                  ['Conversions', num(selected.conversions)],
                  ['Revenue', formatINR(selected.revenue)],
                  ['Budget used', orDash(selected.metrics.budgetUsedPercent, pct)],
                ] as const).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{k}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{v}</p>
                  </div>
                ))}
              </div>

              {/* Derived rates. Each is null when its denominator is zero, and a
                  null renders '—' with an explanation rather than a fake number. */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Efficiency</p>
                <dl className="space-y-1.5 text-sm">
                  {([
                    ['Cost per lead', orDash(selected.metrics.cpl, formatINR), selected.leads === 0 ? 'No leads recorded yet' : null],
                    ['Cost per click', orDash(selected.metrics.cpc, formatINR), selected.clicks === 0 ? 'No clicks recorded yet' : null],
                    ['Click-through rate', orDash(selected.metrics.ctr, pct), selected.impressions === 0 ? 'No impressions recorded yet' : null],
                    ['Return on spend', orDash(selected.metrics.roi, pct), selected.spend === 0 ? 'No spend recorded yet' : null],
                  ] as const).map(([k, v, hint]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3">
                      <dt className="text-gray-500 dark:text-gray-400">
                        {k}
                        {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
                      </dt>
                      <dd className="font-semibold text-gray-800 dark:text-gray-200">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{selected.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                {perms.canEdit && (
                  <Button variant="secondary" className="gap-1.5" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
                {perms.canDelete && (
                  <Button variant="secondary" className="gap-1.5 text-rose-600" onClick={() => void remove(selected)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Create / edit ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={formOpen}
        onClose={() => { if (!saving) setFormOpen(false); }}
        title={editing ? 'Edit campaign' : 'New campaign'}
        size="lg"
        busy={saving}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="p-name">Campaign name <span className="text-rose-500">*</span></label>
            <input id="p-name" className={classNames(inputCls, errors.name && invalidInputCls)}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label className={labelCls} htmlFor="p-client">Client <span className="text-rose-500">*</span></label>
            <select id="p-client" className={classNames(inputCls, errors.clientId && invalidInputCls)}
              value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, projectId: '' })}>
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FieldError message={errors.clientId} />
          </div>

          <div>
            <label className={labelCls} htmlFor="p-platform">Platform <span className="text-rose-500">*</span></label>
            <select id="p-platform" className={classNames(inputCls, errors.platform && invalidInputCls)}
              value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="">Choose a platform…</option>
              {(data?.platforms ?? []).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <FieldError message={errors.platform} />
          </div>

          <div>
            <label className={labelCls} htmlFor="p-project">Project</label>
            <select id="p-project" className={classNames(inputCls, errors.projectId && invalidInputCls)}
              value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              disabled={String(clientId ?? '') !== form.clientId}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldError message={errors.projectId} />
          </div>

          <div />

          <div>
            <label className={labelCls} htmlFor="p-start">Start date <span className="text-rose-500">*</span></label>
            <input id="p-start" type="date" className={classNames(inputCls, errors.startDate && invalidInputCls)}
              value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <FieldError message={errors.startDate} />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-end">End date <span className="text-rose-500">*</span></label>
            <input id="p-end" type="date" className={classNames(inputCls, errors.endDate && invalidInputCls)}
              value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <FieldError message={errors.endDate} />
          </div>

          {([
            ['budget', 'Budget (₹)'], ['spend', 'Spend (₹)'],
            ['impressions', 'Impressions'], ['clicks', 'Clicks'],
            ['leads', 'Leads'], ['conversions', 'Conversions'],
            ['revenue', 'Revenue (₹)'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className={labelCls} htmlFor={`p-${key}`}>{label}</label>
              <input id={`p-${key}`} inputMode="decimal"
                className={classNames(inputCls, errors[key] && invalidInputCls)}
                value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              <FieldError message={errors[key]} />
            </div>
          ))}

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="p-notes">Notes</label>
            <textarea id="p-notes" rows={2} className={classNames(inputCls, errors.notes && invalidInputCls)}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <FieldError message={errors.notes} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
