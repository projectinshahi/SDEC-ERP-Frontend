'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import {
  collect, hasErrors, requiredText, validDate, dateOrder, fieldErrorsFromApi, invalidInputCls,
  type FieldErrors,
} from '@/lib/marketing/contentValidation';
import {
  fetchProjectWorkspace, createProject,
  type MarketingClientWithProjects,
} from '@/lib/api/marketingProjects';

/**
 * MK-001.1 — the Marketing project workspace shell.
 *
 * The client → project switcher lives in the LAYOUT, not in each page, so the
 * active project survives moving between the project's calendar and its board,
 * and the list is fetched once rather than per tab.
 *
 * The active project comes from the URL. That is deliberate: refresh, deep link
 * and browser Back/Forward all keep working, and there is no separate "selected
 * project" state that could disagree with the page being shown.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

export default function MarketingProjectsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();

  const [clients, setClients] = useState<MarketingClientWithProjects[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [creating, setCreating] = useState(false);

  // The project id is parsed from the path — one source of truth for "active".
  const activeProjectId = useMemo(() => {
    const m = pathname?.match(/\/dashboard\/marketing\/projects\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [pathname]);

  const load = useCallback(async () => {
    try {
      const ws = await fetchProjectWorkspace();
      setClients(ws.clients);
      setCanManage(ws.canManageProjects);
    } catch {
      toast('Unable to load Marketing projects', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  // Open the client that owns the active project, so a deep link never lands on
  // a collapsed tree with nothing highlighted.
  useEffect(() => {
    if (activeProjectId == null) return;
    const owner = clients.find((c) => c.projects.some((p) => p.id === activeProjectId));
    if (owner) setExpanded((e) => (e[owner.id] ? e : { ...e, [owner.id]: true }));
  }, [activeProjectId, clients]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* ── Switcher ──────────────────────────────────────────────────────────
          Full-width above the content on narrow screens, a fixed rail from lg
          up. It never forces the PAGE to scroll sideways. */}
      <aside
        className={classNames(
          'shrink-0 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
          collapsed ? 'lg:w-14' : 'lg:w-64',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2.5">
          {!collapsed && (
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Briefcase className="h-4 w-4 text-cyan-600" /> Projects
            </h2>
          )}
          <div className="ml-auto flex items-center gap-1">
            {canManage && !collapsed && (
              <button type="button" onClick={() => setCreating(true)}
                aria-label="New project"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-cyan-600 dark:hover:bg-gray-800">
                <Plus className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand project list' : 'Collapse project list'}
              className="hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:block">
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-gray-400">
                No clients configured yet. Add one in Marketing → Administration.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {clients.map((client) => {
                  const open = expanded[client.id] ?? false;
                  return (
                    <li key={client.id}>
                      <button type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [client.id]: !open }))}
                        aria-expanded={open}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                        <span className="min-w-0 flex-1 truncate">{client.name}</span>
                        <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                          {client.projects.length}
                        </span>
                      </button>

                      {open && (
                        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 dark:border-gray-800 pl-2">
                          {client.projects.length === 0 ? (
                            /* The stated empty state — a client can genuinely
                               have no active projects. */
                            <li className="px-2 py-2 text-[11px] leading-snug text-gray-400">
                              No active projects found for this client.
                            </li>
                          ) : (
                            client.projects.map((project) => {
                              const active = project.id === activeProjectId;
                              return (
                                <li key={project.id}>
                                  <Link
                                    href={`/dashboard/marketing/projects/${project.id}`}
                                    aria-current={active ? 'page' : undefined}
                                    className={classNames(
                                      'block truncate rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
                                      active
                                        ? 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-800'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                                    )}
                                    title={project.name}
                                  >
                                    {project.name}
                                  </Link>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </aside>

      {/* min-w-0 is what stops a wide Kanban board from stretching this column
          and making the whole PAGE scroll horizontally. */}
      <section className="min-w-0 flex-1">{children}</section>

      {canManage && creating && (
        <NewProjectModal
          isOpen
          onClose={() => setCreating(false)}
          clients={clients}
          onCreated={async () => { setCreating(false); await load(); }}
        />
      )}

    </div>
  );
}

/* ── New project ─────────────────────────────────────────────────────────── */

function NewProjectModal({ isOpen, onClose, clients, onCreated }: {
  isOpen: boolean; onClose: () => void;
  clients: MarketingClientWithProjects[]; onCreated: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  // Mounted only while open (see the caller), so the initial state IS the reset.
  const [form, setForm] = useState({ clientId: '', name: '', description: '', startDate: '', endDate: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const errs = collect({
      clientId: form.clientId ? undefined : 'Choose a client.',
      name: requiredText(form.name, 'Project name'),
      startDate: validDate(form.startDate, 'Start date'),
      endDate: validDate(form.endDate, 'End date')
        ?? dateOrder(form.startDate, form.endDate, 'Start date', 'End date'),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);                       // also blocks double-submit
    try {
      await createProject({
        clientId: Number(form.clientId),
        name: form.name.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      toast('Project created successfully', 'success');
      await onCreated();
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setErrors(mapped);
      if (!hasErrors(mapped)) {
        toast((err as { details?: { error?: string } })?.details?.error || 'Unable to create the project', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal confirmDiscard isOpen={isOpen} onClose={onClose} busy={saving} title="New project" size="md">
      <div className="space-y-3">
        <div>
          <label htmlFor="np-client" className={labelCls}>Client <span className="text-rose-500">*</span></label>
          <select id="np-client" value={form.clientId} onChange={set('clientId')}
            aria-invalid={!!errors.clientId}
            className={classNames(inputCls, errors.clientId && invalidInputCls)}>
            <option value="">Select a client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <FieldError message={errors.clientId} />
        </div>
        <div>
          <label htmlFor="np-name" className={labelCls}>Project name <span className="text-rose-500">*</span></label>
          <input id="np-name" value={form.name} onChange={set('name')} maxLength={160}
            aria-invalid={!!errors.name}
            className={classNames(inputCls, errors.name && invalidInputCls)} placeholder="e.g. Q4 Launch Campaign" />
          <FieldError message={errors.name} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="np-start" className={labelCls}>Start date</label>
            <input id="np-start" type="date" value={form.startDate} onChange={set('startDate')}
              max={form.endDate || undefined} aria-invalid={!!errors.startDate}
              className={classNames(inputCls, errors.startDate && invalidInputCls)} />
            <FieldError message={errors.startDate} />
          </div>
          <div>
            <label htmlFor="np-end" className={labelCls}>End date</label>
            <input id="np-end" type="date" value={form.endDate} onChange={set('endDate')}
              min={form.startDate || undefined} aria-invalid={!!errors.endDate}
              className={classNames(inputCls, errors.endDate && invalidInputCls)} />
            <FieldError message={errors.endDate} />
          </div>
        </div>
        <div>
          <label htmlFor="np-desc" className={labelCls}>Description</label>
          <textarea id="np-desc" value={form.description} onChange={set('description')} rows={3}
            className={classNames(inputCls, 'resize-y')} placeholder="What this project covers" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} isLoading={saving}>Create project</Button>
        </div>
      </div>
    </Modal>
  );
}

