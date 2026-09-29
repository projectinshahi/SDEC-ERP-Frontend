'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Megaphone, Plus, Search, X, Pencil, Trash2, BadgeCheck, Clock, Ban, Wallet,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { formatINR } from '@/lib/utils/currency';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import { fieldErrorsFromApi, invalidInputCls, type FieldErrors } from '@/lib/marketing/contentValidation';
import { validate, influencerSchema } from '@/lib/marketing/financeValidation';
import {
  fetchInfluencers, createInfluencer, updateInfluencer, setInfluencerPayment, deleteInfluencer,
  type Influencer, type InfluencerListResponse, type PaymentStatus,
} from '@/lib/api/marketingFinance';
import { fetchProjectWorkspace, type MarketingProject } from '@/lib/api/marketingProjects';

/**
 * MK-004.5 — influencer marketing tracker.
 *
 * The agreed fee is the ONE stored amount. Whether it counts as client spend is
 * decided server-side from the payment status (`countsAsSpend`), and the cost
 * dashboard reads the same rule — the fee is never copied into a second table,
 * so there is nothing to double count.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

const PAYMENT_STYLE: Record<PaymentStatus, { cls: string; label: string; Icon: typeof Clock }> = {
  pending: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Pending', Icon: Clock },
  paid: { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Paid', Icon: BadgeCheck },
  cancelled: { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: 'Cancelled', Icon: Ban },
};

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STYLE[status] ?? PAYMENT_STYLE.pending;
  return (
    <span className={classNames('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', s.cls)}>
      <s.Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

interface InfluencerForm {
  name: string; handle: string; clientId: string; projectId: string; platform: string;
  fee: string; deliverables: string; startDate: string; endDate: string; notes: string;
}
const emptyForm = (clientId: number | null): InfluencerForm => ({
  name: '', handle: '', clientId: clientId ? String(clientId) : '', projectId: '', platform: '',
  fee: '', deliverables: '',
  startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

export default function MarketingInfluencersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const toastOk = useCallback((m: string) => toast(m, 'success'), [toast]);
  const toastErr = useCallback((m: string) => toast(m, 'error'), [toast]);
  const { confirm } = useConfirm();

  const clientId = params.get('clientId') ? Number(params.get('clientId')) : null;
  const platform = params.get('platform') || '';
  const paymentStatus = (params.get('payment') as PaymentStatus | '') || '';
  const search = params.get('q') || '';
  const selectedId = params.get('influencer') ? Number(params.get('influencer')) : null;

  const [data, setData] = useState<InfluencerListResponse | null>(null);
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
    if (!('influencer' in patch)) setLoading(true);
    const nav = 'influencer' in patch ? router.push : router.replace;
    nav(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  /** The request for the CURRENT filters. Pure — it sets no state, so both the
   *  effect below and the imperative refetch can share it. */
  const fetchPage = useCallback(() => fetchInfluencers({ clientId, platform, paymentStatus, search }), [clientId, platform, paymentStatus, search]);

  const applyResult = useCallback((res: InfluencerListResponse) => {
    setData(res);
    setError(null);
    if (!clientId && res.clients[0]) setParams({ clientId: res.clients[0].id });
  }, [clientId, setParams]);

  const applyError = useCallback((err: unknown) => {
    setData(null);
    setError(apiError(err) || 'Unable to load influencer campaigns');
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
  const selected = data?.influencers.find((i) => i.id === selectedId) ?? null;

  /* ── Create / edit ───────────────────────────────────────────────────────── */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [form, setForm] = useState<InfluencerForm>(emptyForm(clientId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm(emptyForm(clientId)); setErrors({}); setFormOpen(true); };
  const openEdit = (i: Influencer) => {
    setEditing(i);
    setForm({
      name: i.name, handle: i.handle ?? '', clientId: String(i.clientId),
      projectId: i.projectId ? String(i.projectId) : '', platform: i.platform,
      fee: String(i.fee), deliverables: i.deliverables ?? '',
      startDate: i.startDate ?? '', endDate: i.endDate ?? '', notes: i.notes ?? '',
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = async () => {
    if (saving) return;                                   // duplicate-submit lock
    const { errors: zerr, data: parsed } = validate(influencerSchema, form);
    if (Object.keys(zerr).length || !parsed) { setErrors(zerr); return; }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        clientId: parsed.clientId, projectId: parsed.projectId, name: parsed.name,
        handle: parsed.handle || null, platform: parsed.platform, fee: parsed.fee,
        deliverables: parsed.deliverables, startDate: parsed.startDate, endDate: parsed.endDate,
        notes: parsed.notes || null,
      };
      if (editing) await updateInfluencer(editing.id, payload);
      else await createInfluencer(payload);
      toastOk(editing ? 'Influencer campaign updated' : 'Influencer campaign added');
      setFormOpen(false);
      await load();
    } catch (err) {
      const fe = fieldErrorsFromApi(err);
      if (Object.keys(fe).length) setErrors(fe);           // values are preserved
      else toastErr(apiError(err) || 'Could not save the influencer campaign');
    } finally {
      setSaving(false);
    }
  };

  /* ── Payment transitions ─────────────────────────────────────────────────── */
  const [payingId, setPayingId] = useState<number | null>(null);

  const changePayment = async (i: Influencer, next: PaymentStatus) => {
    if (payingId) return;
    // Marking money paid (or writing a fee off) is a settling action, so it is
    // confirmed through the app's shared dialog rather than a bare click.
    const ok = await confirm({
      title: next === 'paid' ? 'Mark this payout as paid?'
        : next === 'cancelled' ? 'Cancel this payout?' : 'Reopen this payout?',
      message: `${i.name} — ${formatINR(i.fee)}.`,
      warning: next === 'paid'
        ? 'The agreed fee can no longer be edited once the payout is paid.'
        : next === 'cancelled'
          ? 'A cancelled payout stops counting towards this client’s spend.'
          : 'Reopening returns this payout to pending and it counts as spend again.',
      confirmLabel: next === 'paid' ? 'Mark paid' : next === 'cancelled' ? 'Cancel payout' : 'Reopen',
      intent: next === 'cancelled' ? 'danger' : 'primary',
      icon: Wallet,
    });
    if (!ok) return;
    setPayingId(i.id);
    try {
      await setInfluencerPayment(i.id, next);
      toastOk(`Payout marked ${next}`);
      await load();
    } catch (err) {
      toastErr(apiError(err) || 'Could not update the payment status');
      await load();
    } finally {
      setPayingId(null);
    }
  };

  const remove = async (i: Influencer) => {
    const ok = await confirm({
      title: 'Delete this influencer campaign?',
      message: `“${i.name}” will be removed.`,
      warning: 'This cannot be undone.',
      confirmLabel: 'Delete', intent: 'danger', icon: Trash2,
    });
    if (!ok) return;
    try {
      await deleteInfluencer(i.id);
      toastOk('Influencer campaign deleted');
      setParams({ influencer: null });
      await load();
    } catch (err) { toastErr(apiError(err) || 'Could not delete the influencer campaign'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-pink-50 dark:bg-pink-900/30 p-2">
            <Megaphone className="h-5 w-5 text-pink-600" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Influencer Marketing</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Influencer campaigns, agreed fees and payout status, per client.
            </p>
          </div>
        </div>
        {perms.canCreate && (
          <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add influencer</Button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="i-client">Client</label>
            <select id="i-client" className={inputCls} value={clientId ?? ''}
              onChange={(e) => setParams({ clientId: e.target.value || null, influencer: null })}>
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className={labelCls} htmlFor="i-platform">Platform</label>
            <select id="i-platform" className={inputCls} value={platform}
              onChange={(e) => setParams({ platform: e.target.value || null })}>
              <option value="">All platforms</option>
              {(data?.platforms ?? []).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className={labelCls} htmlFor="i-payment">Payment status</label>
            <select id="i-payment" className={inputCls} value={paymentStatus}
              onChange={(e) => setParams({ payment: e.target.value || null })}>
              <option value="">All statuses</option>
              {(data?.paymentStatuses ?? []).map((s) => (
                <option key={s} value={s}>{PAYMENT_STYLE[s]?.label ?? s}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="i-search">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input key={search} id="i-search" className={classNames(inputCls, 'pl-8 pr-8')} value={searchDraft}
                placeholder="Name or handle..." onChange={(e) => onSearchChange(e.target.value)} />
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

      {/* Committed is what the cost dashboard counts; cancelled is shown so it is
          visible without ever being added in. */}
      {!!data?.influencers.length && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['Committed spend', data.totals.committed, 'text-gray-900 dark:text-gray-100', 'Pending + paid, counts towards client cost'],
            ['Paid', data.totals.paid, 'text-emerald-600', 'Payout settled'],
            ['Pending', data.totals.pending, 'text-amber-600', 'Agreed, not yet paid'],
            ['Cancelled', data.totals.cancelled, 'text-gray-400', 'Excluded from client cost'],
          ] as const).map(([label, value, tone, hint]) => (
            <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
              <p className={classNames('mt-1 text-xl font-bold', tone)}>{formatINR(value)}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {error ? (
          <div className="px-4 py-10 text-center text-sm text-rose-600">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : !data?.influencers.length ? (
          <div className="px-4 py-12 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No influencer campaigns yet.</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {perms.canCreate ? 'Add an influencer to track the fee and payout.' : 'Influencer campaigns will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5">Influencer</th>
                  <th className="px-4 py-2.5">Platform</th>
                  <th className="px-4 py-2.5">Campaign dates</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5 text-right">Agreed fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {data.influencers.map((i) => (
                  <tr key={i.id} onClick={() => setParams({ influencer: i.id })}
                    className={classNames(
                      'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      selectedId === i.id && 'bg-pink-50/60 dark:bg-pink-900/20',
                    )}>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{i.name}</span>
                      {i.handle && <span className="block text-[11px] text-gray-400">{i.handle}</span>}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-gray-600 dark:text-gray-400">{i.platform}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">{i.startDate} to {i.endDate}</td>
                    <td className="px-4 py-2.5"><PaymentBadge status={i.paymentStatus} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <span className={classNames('font-semibold',
                        i.countsAsSpend ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 line-through')}>
                        {formatINR(i.fee)}
                      </span>
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
          aria-label={`Influencer: ${selected.name}`}>
          <button type="button" aria-label="Close details" className="absolute inset-0 bg-gray-900/40"
            onClick={() => setParams({ influencer: null })} />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">{selected.name}</h2>
                <div className="mt-1"><PaymentBadge status={selected.paymentStatus} /></div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setParams({ influencer: null })}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Agreed fee</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatINR(selected.fee)}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {selected.countsAsSpend
                    ? 'Counts towards this client&apos;s production cost.'
                    : 'Cancelled — excluded from production cost.'}
                </p>
              </div>

              <dl className="space-y-2 text-sm">
                {([
                  ['Handle', selected.handle ?? '—'],
                  ['Platform', selected.platform],
                  ['Project', selected.projectName ?? '—'],
                  ['Campaign dates', `${selected.startDate ?? '—'} to ${selected.endDate ?? '—'}`],
                  ['Paid on', selected.paidAt ? new Date(selected.paidAt).toLocaleDateString('en-GB') : '—'],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                    <dd className="text-right font-medium capitalize text-gray-800 dark:text-gray-200">{v}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Deliverables</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {selected.deliverables || '—'}
                </p>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{selected.notes}</p>
                </div>
              )}

              {perms.canEdit && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Payment</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.paymentStatus === 'pending' ? (
                      <>
                        <Button className="gap-1.5" disabled={payingId === selected.id}
                          onClick={() => void changePayment(selected, 'paid')}>
                          <BadgeCheck className="h-4 w-4" /> Mark paid
                        </Button>
                        <Button variant="secondary" className="gap-1.5" disabled={payingId === selected.id}
                          onClick={() => void changePayment(selected, 'cancelled')}>
                          <Ban className="h-4 w-4" /> Cancel payout
                        </Button>
                      </>
                    ) : (
                      /* Settled states are reversible only by a manager — the
                         server enforces that, this only reflects it. */
                      <Button variant="secondary" className="gap-1.5" disabled={payingId === selected.id}
                        onClick={() => void changePayment(selected, 'pending')}>
                        <Clock className="h-4 w-4" /> Reopen as pending
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                {perms.canEdit && (
                  <Button variant="secondary" className="gap-1.5" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
                {perms.canDelete && selected.paymentStatus !== 'paid' && (
                  <Button variant="secondary" className="gap-1.5 text-rose-600" onClick={() => void remove(selected)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
              {selected.paymentStatus === 'paid' && (
                <p className="text-[11px] text-gray-400">
                  A paid payout is a settled record: its fee is frozen and it cannot be deleted.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Create / edit ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={formOpen}
        onClose={() => { if (!saving) setFormOpen(false); }}
        title={editing ? 'Edit influencer campaign' : 'Add influencer campaign'}
        size="lg"
        busy={saving}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="n-name">Influencer name <span className="text-rose-500">*</span></label>
            <input id="n-name" className={classNames(inputCls, errors.name && invalidInputCls)}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className={labelCls} htmlFor="n-handle">Handle</label>
            <input id="n-handle" className={classNames(inputCls, errors.handle && invalidInputCls)}
              placeholder="@username" value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value })} />
            <FieldError message={errors.handle} />
          </div>

          <div>
            <label className={labelCls} htmlFor="n-client">Client <span className="text-rose-500">*</span></label>
            <select id="n-client" className={classNames(inputCls, errors.clientId && invalidInputCls)}
              value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, projectId: '' })}>
              <option value="">Choose a client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FieldError message={errors.clientId} />
          </div>
          <div>
            <label className={labelCls} htmlFor="n-platform">Platform <span className="text-rose-500">*</span></label>
            <select id="n-platform" className={classNames(inputCls, errors.platform && invalidInputCls)}
              value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="">Choose a platform...</option>
              {(data?.platforms ?? []).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <FieldError message={errors.platform} />
          </div>

          <div>
            <label className={labelCls} htmlFor="n-project">Project</label>
            <select id="n-project" className={classNames(inputCls, errors.projectId && invalidInputCls)}
              value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              disabled={String(clientId ?? '') !== form.clientId}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldError message={errors.projectId} />
          </div>
          <div>
            <label className={labelCls} htmlFor="n-fee">Agreed fee (INR) <span className="text-rose-500">*</span></label>
            <input id="n-fee" inputMode="decimal"
              className={classNames(inputCls, errors.fee && invalidInputCls)}
              value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })}
              disabled={editing?.paymentStatus === 'paid'} />
            <FieldError message={errors.fee} />
            {editing?.paymentStatus === 'paid' && (
              <p className="mt-1 text-[11px] text-gray-400">Frozen: this payout is already marked paid.</p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor="n-start">Start date <span className="text-rose-500">*</span></label>
            <input id="n-start" type="date" className={classNames(inputCls, errors.startDate && invalidInputCls)}
              value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <FieldError message={errors.startDate} />
          </div>
          <div>
            <label className={labelCls} htmlFor="n-end">End date <span className="text-rose-500">*</span></label>
            <input id="n-end" type="date" className={classNames(inputCls, errors.endDate && invalidInputCls)}
              value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <FieldError message={errors.endDate} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="n-deliv">Deliverables <span className="text-rose-500">*</span></label>
            <textarea id="n-deliv" rows={3} className={classNames(inputCls, errors.deliverables && invalidInputCls)}
              placeholder="e.g. 2 reels, 3 stories, 1 static post"
              value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} />
            <FieldError message={errors.deliverables} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="n-notes">Notes</label>
            <textarea id="n-notes" rows={2} className={classNames(inputCls, errors.notes && invalidInputCls)}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <FieldError message={errors.notes} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add influencer'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
