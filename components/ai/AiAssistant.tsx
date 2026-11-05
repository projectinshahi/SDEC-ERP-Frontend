'use client';

import { useCallback, useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Sparkles, X, Send, Trash2, Loader2, AlertTriangle, RotateCcw, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatINR } from '@/lib/utils/currency';
import { askAiAssistant, fetchAiAssistantMeta, confirmAiAction, cancelAiAction, AiDisplay, AiMeta, AiTurn, AiProposal, AiActionResult } from '@/lib/api/aiAssistant';

/**
 * Floating ERP AI Assistant (Phase 1, read-only).
 *
 * Rendered only for holders of `ai.assistant.access` (Admin/Super Admin bypass via
 * usePermissions) — the backend re-checks that key AND each module's own
 * permission on every request, so this gate is presentation only.
 *
 * Conversation lives in component state: per user, per tab, never persisted.
 * It is reset whenever the signed-in user changes and on "Clear".
 */

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  displays?: AiDisplay[];
  /** Pending task-action previews; each card confirms or cancels ONE server-stored proposal. */
  proposals?: AiProposal[];
  asOf?: string;
  error?: boolean;
}

const HISTORY_TURNS = 12;
const MAX_CHARS = 2000;

export function AiAssistant() {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const allowed = hasPermission('ai.assistant.access');

  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const sendingRef = useRef(false);      // synchronous duplicate-submit guard
  const generation = useRef(0);          // bumps on clear / user change → stale answers are dropped
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A different user in this tab never sees the previous user's conversation.
  useEffect(() => {
    generation.current++;
    setMessages([]); setMeta(null); setMetaError(null); setOpen(false);
    sendingRef.current = false; setSending(false);
  }, [user?.id]);

  useEffect(() => {
    if (!open || meta || metaError) return;
    fetchAiAssistantMeta()
      .then(setMeta)
      .catch((e: unknown) => setMetaError((e as Error)?.message || 'The AI Assistant is unavailable.'));
  }, [open, meta, metaError]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setMetaError(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(async (text: string, base?: Msg[]) => {
    const question = text.trim().slice(0, MAX_CHARS);
    if (!question || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const gen = generation.current;

    const userMsg: Msg = { id: nextId.current++, role: 'user', content: question };
    // History excludes failed turns; the server re-validates and re-queries everything.
    const history: AiTurn[] = [...(base ?? messages), userMsg]
      .filter((m) => !m.error)
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const res = await askAiAssistant(history);
      if (gen !== generation.current) return;
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', content: res.answer, displays: res.displays, proposals: res.proposals, asOf: res.asOf }]);
    } catch (e: unknown) {
      if (gen !== generation.current) return;
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', error: true, content: (e as Error)?.message || 'Something went wrong. Please try again.' }]);
    } finally {
      if (gen === generation.current) { sendingRef.current = false; setSending(false); }
    }
  }, [messages]);

  // Closing forgets a failed /meta load, so reopening retries it.
  const close = () => { setOpen(false); setMetaError(null); };

  const retryLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    // Drop the failed exchange, then ask again on top of what remains.
    const base = messages.slice(0, messages.lastIndexOf(lastUser));
    setMessages(base);
    send(lastUser.content, base);
  };

  const clear = () => {
    generation.current++;
    setMessages([]); setInput('');
    sendingRef.current = false; setSending(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  if (!allowed) return null;

  const unavailable = !!metaError || meta?.configured === false;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 sm:bottom-5 sm:right-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="AI Assistant"
          className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100vh-2.5rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl dark:sm:border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Read-only answers from your ERP data</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={clear} disabled={messages.length === 0 && !sending} aria-label="Clear conversation" title="Clear conversation"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800">
                <Trash2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={close} aria-label="Close AI Assistant" title="Close"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Ask about employees, attendance, leave, tasks, projects, sales, finance or marketing. Answers only include data you already have access to.
                </p>
                {unavailable && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{metaError || 'The AI Assistant is not configured yet. Please contact your administrator.'}</span>
                  </div>
                )}
                {!meta && !metaError && <Loader2 className="h-4 w-4 animate-spin text-gray-300" />}
                {meta?.configured && (
                  <div className="flex flex-wrap gap-2">
                    {meta.suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} disabled={sending}
                        className="rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-left text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="w-full max-w-[95%] space-y-2">
                    <div className={`whitespace-pre-wrap break-words rounded-2xl rounded-bl-md px-4 py-2 text-sm shadow-sm ${m.error
                      ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                      : 'border border-gray-100 bg-gray-50 text-gray-800 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100'}`}>
                      {m.error && <AlertTriangle className="mr-1.5 inline h-4 w-4 align-[-3px]" />}
                      {m.content}
                    </div>
                    {m.displays?.map((d, i) => <DisplayBlock key={i} d={d} />)}
                    {m.proposals?.map((p) => <ProposalCard key={p.id} p={p} />)}
                    {m.error && m === messages[messages.length - 1] && !sending && (
                      <button type="button" onClick={retryLast} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline dark:text-rose-300">
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                    )}
                    {m.asOf && (
                      <p className="text-[10px] text-gray-400">
                        As of {new Date(m.asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> Looking up your ERP data…
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-gray-100 p-3 dark:border-gray-800"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={MAX_CHARS}
                disabled={unavailable}
                placeholder={unavailable ? 'AI Assistant unavailable' : 'Ask a question…'}
                aria-label="Message the AI Assistant"
                className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-indigo-500/20"
              />
              <button type="submit" disabled={sending || unavailable || !input.trim()} aria-label="Send"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400">Enter to send · Shift+Enter for a new line · AI answers can be wrong — check important figures in the module.</p>
          </form>
        </div>
      )}
    </>
  );
}

const CONFIRM_LABEL: Record<AiProposal['action'], string> = {
  create_task: 'Confirm & Create', update_task: 'Confirm & Update', assign_task: 'Confirm Assignment', change_task_status: 'Confirm Status Change',
};
type ProposalState = 'pending' | 'executing' | 'confirmed' | 'failed' | 'cancelled' | 'expired';

/**
 * Action preview card. The server has only STORED a proposal; this card is the one
 * place it can be executed (Confirm → POST /actions/:id/confirm, single use) or
 * dropped (Cancel). It expires client- and server-side; a remount after expiry
 * cannot revive it.
 */
function ProposalCard({ p }: { p: AiProposal }) {
  const expiresAtMs = new Date(p.expiresAt).getTime();
  const [state, setState] = useState<ProposalState>(() => (expiresAtMs - Date.now() <= 0 ? 'expired' : 'pending'));
  const [left, setLeft] = useState(() => expiresAtMs - Date.now());
  const [result, setResult] = useState<AiActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false); // synchronous double-click guard

  useEffect(() => {
    if (state !== 'pending') return;
    const t = setInterval(() => {
      const ms = expiresAtMs - Date.now();
      setLeft(ms);
      if (ms <= 0) setState('expired');
    }, 1000);
    return () => clearInterval(t);
  }, [state, expiresAtMs]);

  const confirm = async () => {
    if (busy.current || state !== 'pending') return;
    busy.current = true;
    setState('executing');
    try {
      setResult(await confirmAiAction(p.id));
      setState('confirmed');
    } catch (e: unknown) {
      const msg = (e as Error)?.message || 'The action could not be completed.';
      setError(msg);
      setState(/expired/i.test(msg) ? 'expired' : 'failed');
    } finally {
      busy.current = false;
    }
  };
  const cancel = async () => {
    if (busy.current || state !== 'pending') return;
    busy.current = true;
    try {
      await cancelAiAction(p.id);
      setState('cancelled');
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Could not cancel.');
    } finally {
      busy.current = false;
    }
  };

  const mm = Math.max(0, Math.floor(left / 60_000)), ss = Math.max(0, Math.floor((left % 60_000) / 1000));
  const showCurrent = p.changes.some((c) => c.current !== null);
  const tone = state === 'confirmed' ? 'border-emerald-200 dark:border-emerald-500/30' : state === 'failed' ? 'border-rose-200 dark:border-rose-500/30' : state === 'pending' || state === 'executing' ? 'border-indigo-200 dark:border-indigo-500/30' : 'border-gray-200 dark:border-gray-700';

  return (
    <div className={`overflow-hidden rounded-xl border bg-white dark:bg-gray-900 ${tone}`} data-proposal-id={p.id} data-proposal-state={state}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-500" />
          <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
            {p.label}{p.taskId !== null && <span className="ml-1 font-normal text-gray-500">#{p.taskId}</span>}
          </p>
        </div>
        {(state === 'pending' || state === 'executing') && (
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400"><Clock className="h-3 w-3" /> expires in {mm}:{String(ss).padStart(2, '0')}</span>
        )}
      </div>
      <p className="px-3 pt-2 text-xs text-gray-700 dark:text-gray-200">{p.title}</p>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-gray-400">
            <th className="px-3 py-1 font-semibold">Field</th>
            {showCurrent && <th className="px-3 py-1 font-semibold">Current</th>}
            <th className="px-3 py-1 font-semibold">Proposed</th>
          </tr>
        </thead>
        <tbody>
          {p.changes.map((c) => (
            <tr key={c.field} className="border-t border-gray-50 align-top dark:border-gray-800">
              <td className="whitespace-nowrap px-3 py-1.5 font-medium text-gray-600 dark:text-gray-300">{c.field}</td>
              {showCurrent && <td className="break-words px-3 py-1.5 text-gray-500 dark:text-gray-400">{c.current ?? '—'}</td>}
              <td className="break-words px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100">{c.proposed ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {p.notes.length > 0 && (
        <ul className="space-y-0.5 px-3 pt-1 text-[11px] text-amber-700 dark:text-amber-300">
          {p.notes.map((n) => <li key={n}>• {n}</li>)}
        </ul>
      )}
      <div className="px-3 pb-3 pt-2">
        {(state === 'pending' || state === 'executing') && (
          <>
            <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">No changes have been made yet.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={confirm} disabled={state !== 'pending'} aria-label={CONFIRM_LABEL[p.action]}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {state === 'executing' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying…</> : CONFIRM_LABEL[p.action]}
              </button>
              <button type="button" onClick={cancel} disabled={state !== 'pending'} aria-label="Cancel proposal"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </>
        )}
        {state === 'confirmed' && result && (
          <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" role="status">
            <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="h-4 w-4" /> {result.label} completed</p>
            <p className="mt-1">#{result.taskId}{result.title ? ` · ${result.title}` : ''}</p>
            <p className="mt-0.5 text-[11px]">
              {[result.status && `Status: ${result.status}`, result.priority && `Priority: ${result.priority}`, result.due && `Due: ${result.due}`,
                result.members && `Members: ${result.members.length ? result.members.join(', ') : 'none'}`, result.inCharge && `In-Charge: ${result.inCharge}`].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-0.5 text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
              {new Date(result.executedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
            </p>
          </div>
        )}
        {state === 'failed' && (
          <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>Not applied: {error}</span>
          </p>
        )}
        {state === 'cancelled' && <p className="text-xs text-gray-500 dark:text-gray-400">Cancelled — nothing was changed.</p>}
        {state === 'expired' && <p className="text-xs text-gray-500 dark:text-gray-400">This preview has expired and cannot be applied. Ask again for a fresh preview.</p>}
      </div>
    </div>
  );
}

const SERIES_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b'];

/** Server-built table (and bar / line / pie chart) from ERP query results. */
function DisplayBlock({ d }: { d: AiDisplay }) {
  const fmt = (v: string | number | null, col: string) =>
    v === null || v === undefined || v === '' ? '—'
      : typeof v === 'number' ? (col.includes('INR') ? formatINR(v) : v.toLocaleString('en-IN')) : v;
  const series = (d.chartSeries ?? (d.chartValueIndex !== undefined ? [d.chartValueIndex] : [])).filter((i) => i > 0 && i < d.columns.length);
  const kind = d.chart ?? 'bar';
  // Line charts keep every point (chronological); bar/pie keep the first 15 rows. Nulls stay null (gaps), never 0.
  const chartRows = series.length
    ? d.rows.slice(0, kind === 'line' ? 120 : 15).map((r) => {
        const row: Record<string, string | number | null> = { label: String(r[0] ?? '—') };
        for (const i of series) row[d.columns[i]] = typeof r[i] === 'number' ? (r[i] as number) : null;
        return row;
      })
    : [];
  const pieRows = kind === 'pie' ? chartRows.filter((r) => typeof r[d.columns[series[0]]] === 'number' && (r[d.columns[series[0]]] as number) > 0) : [];
  const showChart = kind === 'pie' ? pieRows.length >= 2 : chartRows.length >= 2;
  const height = kind === 'bar' ? Math.min(40 + chartRows.length * (series.length > 1 ? 40 : 26), 300) : 200;
  const num = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('en-IN') : '—');

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-200">{d.title}</p>
      {showChart && (
        <div className="px-2 pt-2" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 340, height }}>
            {kind === 'line' ? (
              <LineChart data={chartRows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals />
                <Tooltip formatter={(v, name) => [num(v), String(name)]} />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
                {series.map((i, k) => (
                  <Line key={i} type="monotone" dataKey={d.columns[i]} stroke={SERIES_COLORS[k % SERIES_COLORS.length]} strokeWidth={2} dot={chartRows.length <= 31} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            ) : kind === 'pie' ? (
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie data={pieRows} dataKey={d.columns[series[0]]} nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={34} isAnimationActive={false}>
                  {pieRows.map((_, k) => <Cell key={k} fill={SERIES_COLORS[k % SERIES_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [num(v), String(name)]} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            ) : (
              <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals />
                <YAxis type="category" dataKey="label" width={96} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, name) => [num(v), String(name)]} />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
                {series.map((i, k) => (
                  <Bar key={i} dataKey={d.columns[i]} fill={SERIES_COLORS[k % SERIES_COLORS.length]} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <div className="max-h-64 overflow-auto">
        {d.rows.length === 0 ? (
          <p className="px-3 py-3 text-xs text-gray-500">No records.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
              <tr>{d.columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">{c}</th>)}</tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-50 dark:border-gray-800">
                  {r.map((v, j) => <td key={j} className="whitespace-nowrap px-3 py-1.5 text-gray-700 dark:text-gray-200">{fmt(v, d.columns[j] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
