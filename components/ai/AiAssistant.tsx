'use client';

import { useCallback, useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Sparkles, X, Send, Trash2, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatINR } from '@/lib/utils/currency';
import { askAiAssistant, fetchAiAssistantMeta, AiDisplay, AiMeta, AiTurn } from '@/lib/api/aiAssistant';

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
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', content: res.answer, displays: res.displays, asOf: res.asOf }]);
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

/** Server-built table (and bar chart) from ERP query results. */
function DisplayBlock({ d }: { d: AiDisplay }) {
  const fmt = (v: string | number | null, col: string) =>
    v === null || v === undefined || v === '' ? '—'
      : typeof v === 'number' ? (col.includes('INR') ? formatINR(v) : v.toLocaleString('en-IN')) : v;
  const vi = d.chartValueIndex;
  const chartRows = vi !== undefined
    ? d.rows.slice(0, 15).map((r) => ({ label: String(r[0] ?? '—'), value: Number(r[vi]) || 0 }))
    : [];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-200">{d.title}</p>
      {chartRows.length >= 2 && (
        <div className="px-2 pt-2" style={{ height: Math.min(40 + chartRows.length * 26, 300) }}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 340, height: Math.min(40 + chartRows.length * 26, 300) }}>
            <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals />
              <YAxis type="category" dataKey="label" width={96} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('en-IN'), d.columns[vi!]]} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
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
