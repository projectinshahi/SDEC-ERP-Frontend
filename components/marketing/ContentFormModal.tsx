'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { UserDbResponse } from '@/lib/api/users';
import {
  createContent,
  CONTENT_STAGES,
  BLOCKED_STAGE,
  CONTENT_PRIORITIES,
  CONTENT_PLATFORMS,
  CONTENT_FORMATS,
  CONTENT_OBJECTIVES,
  fetchReferenceData,
  isDesignType,
  isShootType,
  type ReferenceData,
  type ProductionData,
  type MarketingContent,
} from '@/lib/api/marketingContent';

/** Shared field styling (matches the ERP form controls used across modules). */
const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

interface ContentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Marketing-module users for every assignee picker (server-filtered). */
  users: UserDbResponse[];
  onCreated: (content: MarketingContent) => void;
}

/**
 * Create Content modal — new items default to Ideas / Backlog unless another
 * starting stage is explicitly chosen. Reuses the shared Modal + the existing
 * marketing-scoped user picklist; no data is fabricated (unassigned stays null).
 */
export function ContentFormModal({ isOpen, onClose, users, onCreated }: ContentFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /** Dropdown options come from ADMIN REFERENCE DATA — never hardcoded here. */
  const [ref, setRef] = useState<ReferenceData>({ clients: [], categories: [], pillars: [], campaigns: [], platforms: [], objectives: [] });
  const [refError, setRefError] = useState(false);
  /**
   * BOTH production field sets live here at once. Changing Content Type only
   * changes which set is RENDERED — neither is ever cleared, so
   * Poster → Reel → Poster restores every previously entered value.
   */
  const [production, setProduction] = useState<ProductionData>({ design: {}, shoot: {} });
  const [form, setForm] = useState({
    title: '', description: '', format: 'poster', stage: 'idea', priority: 'medium',
    objective: '', targetAudience: '', cta: '', references: '', notes: '',
    deadline: '', ownerId: '', designerId: '', videographerId: '', editorId: '',
    clientId: '', categoryId: '', pillarId: '', campaignId: '',
  });
  const [platforms, setPlatforms] = useState<string[]>([]);
  /** Distinguishes "not fetched yet" from "fetched and genuinely empty" — the
   *  constant fallback below must only apply to the second case, otherwise a
   *  deactivated value flashes into the form while the request is in flight. */
  const [refLoaded, setRefLoaded] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setRefLoaded(false);
    fetchReferenceData()
      .then((d) => { if (!cancelled) { setRef(d); setRefError(false); setRefLoaded(true); } })
      .catch(() => { if (!cancelled) { setRefError(true); setRefLoaded(true); } });
    return () => { cancelled = true; };
  }, [isOpen]);

  const showDesign = isDesignType(form.format);
  const showShoot = isShootType(form.format);
  const setDesign = (k: 'dimensions' | 'slideCount' | 'designReference', v: string) =>
    setProduction((p) => ({ ...p, design: { ...p.design, [k]: v } }));
  const setShoot = (k: 'location' | 'props' | 'equipment' | 'shootDate' | 'editDeadline', v: string) =>
    setProduction((p) => ({ ...p, shoot: { ...p.shoot, [k]: v } }));
  const togglePlatform = (v: string) =>
    setPlatforms((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  /* M10 #43 — Platforms and Objectives now come from the ADMIN-MANAGED lists,
   * so deactivating one removes it from this form immediately. The former
   * constants remain only as a fallback for a not-yet-populated list, which
   * keeps the form usable rather than empty. */
  const platformOptions = useMemo(() => {
    if (!refLoaded) return [];                      // nothing until the real list arrives
    return ref.platforms.length ? ref.platforms.map((p) => p.name) : [...CONTENT_PLATFORMS];
  }, [ref.platforms, refLoaded]);
  const objectiveOptions = useMemo(() => {
    if (!refLoaded) return [];
    return ref.objectives.length ? ref.objectives.map((o) => o.name) : [...CONTENT_OBJECTIVES];
  }, [ref.objectives, refLoaded]);

  const refOptions = useMemo(
    () => ({ clients: ref.clients, categories: ref.categories, pillars: ref.pillars, campaigns: ref.campaigns }),

    [ref],
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Inline, field-specific validation. The backend re-validates identically —
    // this is a convenience, not the enforcement point.
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Content Title is required';
    if (!form.format) errs.format = 'Content Type is required';
    if (!form.objective) errs.objective = 'Objective is required';
    setFieldErrors(errs);
    if (Object.keys(errs).length) { setError(null); return; }

    setSaving(true);
    setError(null);
    try {
      const created = await createContent({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        format: form.format,
        stage: form.stage,
        priority: form.priority,
        objective: form.objective,
        targetAudience: form.targetAudience.trim() || undefined,
        platforms,
        cta: form.cta.trim() || undefined,
        references: form.references.trim() || undefined,
        notes: form.notes.trim() || undefined,
        deadline: form.deadline || undefined,
        ownerId: form.ownerId ? Number(form.ownerId) : undefined,
        designerId: form.designerId ? Number(form.designerId) : undefined,
        videographerId: form.videographerId ? Number(form.videographerId) : undefined,
        editorId: form.editorId ? Number(form.editorId) : undefined,
        clientId: form.clientId ? Number(form.clientId) : undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        pillarId: form.pillarId ? Number(form.pillarId) : undefined,
        campaignId: form.campaignId ? Number(form.campaignId) : undefined,
        // Both sets are sent; the server merges per section and never clears the
        // set that is currently hidden.
        productionData: production,
        // NOTE: Created By is NOT sent — the backend derives it from the session.
      });
      onCreated(created);
      setForm({
        title: '', description: '', format: 'poster', stage: 'idea', priority: 'medium',
        objective: '', targetAudience: '', cta: '', references: '', notes: '',
        deadline: '', ownerId: '', designerId: '', videographerId: '', editorId: '',
        clientId: '', categoryId: '', pillarId: '', campaignId: '',
      });
      setPlatforms([]);
      setProduction({ design: {}, shoot: {} });
      setFieldErrors({});
      onClose();
    } catch (err: any) {
      // Surface the backend's field-specific message rather than a generic one.
      const detail = err?.details;
      if (Array.isArray(detail?.errors) && detail.errors.length) {
        setFieldErrors(Object.fromEntries(detail.errors.map((x: { field: string; message: string }) => [x.field, x.message])));
      }
      setError(detail?.error || err?.message || 'Failed to create content.');
    } finally {
      setSaving(false);
    }
  };

  const userOptions = (
    <>
      <option value="">Unassigned</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Content" size="xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="cc-title">Content Title *</label>
            <input id="cc-title" value={form.title} onChange={set('title')} className={inputCls}
              placeholder="e.g. ERP Awareness" maxLength={255}
              aria-required="true" aria-invalid={!!fieldErrors.title} />
            {fieldErrors.title && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.title}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={set('description')} className={inputCls} rows={2} placeholder="What is this content about?" />
          </div>

          <div>
            <label className={labelCls} htmlFor="cc-format">Content Type *</label>
            <select id="cc-format" value={form.format} onChange={set('format')} className={inputCls} aria-required="true" aria-invalid={!!fieldErrors.format}>
              {CONTENT_FORMATS.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
            {fieldErrors.format && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.format}</p>}
          </div>
          <div>
            <label className={labelCls}>Starting Stage</label>
            <select value={form.stage} onChange={set('stage')} className={inputCls}>
              {[...CONTENT_STAGES, BLOCKED_STAGE].map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Priority</label>
            <select value={form.priority} onChange={set('priority')} className={inputCls}>
              {CONTENT_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Deadline</label>
            <input type="date" value={form.deadline} onChange={set('deadline')} className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="cc-objective">Objective *</label>
            <select id="cc-objective" value={form.objective} onChange={set('objective')} className={inputCls} aria-required="true" aria-invalid={!!fieldErrors.objective}>
              <option value="">Select an objective…</option>
              {objectiveOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {fieldErrors.objective && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.objective}</p>}
          </div>
          {/* Platform(s) — multi-select. Keyboard accessible: each option is a
              real checkbox, so it is reachable by Tab and toggled with Space. */}
          <div className="sm:col-span-2">
            <span className={labelCls}>Platform(s)</span>
            <div className="flex flex-wrap gap-3 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
              {platformOptions.map((pl) => (
                <label key={pl} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={platforms.includes(pl)} onChange={() => togglePlatform(pl)}
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                  {pl.charAt(0).toUpperCase() + pl.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Classification — every option comes from ADMIN REFERENCE DATA. */}
          {refError && (
            <p className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Reference data could not be loaded. Client, Category, Pillar and Campaign are unavailable — the rest of the form still works.
            </p>
          )}
          {([
            ['clientId', 'Client / Brand', refOptions.clients],
            ['categoryId', 'Content Category', refOptions.categories],
            ['pillarId', 'Content Pillar', refOptions.pillars],
            ['campaignId', 'Campaign', refOptions.campaigns],
          ] as const).map(([key, label, opts]) => (
            <div key={key}>
              <label className={labelCls} htmlFor={`cc-${key}`}>{label}</label>
              <select id={`cc-${key}`} value={form[key]} onChange={set(key)} className={inputCls}>
                <option value="">{opts.length ? 'Not set' : 'None configured'}</option>
                {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          ))}

          <div>
            <label className={labelCls}>Owner (Content Strategist)</label>
            <select value={form.ownerId} onChange={set('ownerId')} className={inputCls}>{userOptions}</select>
          </div>
          <div>
            <label className={labelCls}>Designer</label>
            <select value={form.designerId} onChange={set('designerId')} className={inputCls}>{userOptions}</select>
          </div>
          <div>
            <label className={labelCls}>Videographer</label>
            <select value={form.videographerId} onChange={set('videographerId')} className={inputCls}>{userOptions}</select>
          </div>
          <div>
            <label className={labelCls}>Editor</label>
            <select value={form.editorId} onChange={set('editorId')} className={inputCls}>{userOptions}</select>
          </div>

          <div>
            <label className={labelCls}>Target Audience</label>
            <input value={form.targetAudience} onChange={set('targetAudience')} className={inputCls} placeholder="e.g. SME founders in Kerala" />
          </div>
          <div>
            <label className={labelCls}>CTA</label>
            <input value={form.cta} onChange={set('cta')} className={inputCls} placeholder="e.g. Book a free demo" maxLength={255} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>References (ideas, trending topics, links, suggestions)</label>
            <textarea value={form.references} onChange={set('references')} className={inputCls} rows={2} />
          </div>
          {/* ── Conditional production fields (M02 Task #6) ───────────────────
              Only the set matching the Content Type is RENDERED. The other set's
              values stay in `production` state and are submitted too, so
              Poster → Reel → Poster restores everything already typed. */}
          {showDesign && (
            <div className="sm:col-span-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Design Production</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor="cc-dimensions">Dimensions</label>
                  <input id="cc-dimensions" value={production.design?.dimensions ?? ''} onChange={(e) => setDesign('dimensions', e.target.value)} className={inputCls} placeholder="e.g. 1080x1350" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-slides">Slide Count</label>
                  <input id="cc-slides" type="number" min={0} value={production.design?.slideCount ?? ''} onChange={(e) => setDesign('slideCount', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-designref">Design Reference</label>
                  <input id="cc-designref" value={production.design?.designReference ?? ''} onChange={(e) => setDesign('designReference', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}
          {showShoot && (
            <div className="sm:col-span-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Shoot &amp; Edit Production</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="cc-location">Location</label>
                  <input id="cc-location" value={production.shoot?.location ?? ''} onChange={(e) => setShoot('location', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-equipment">Equipment</label>
                  <input id="cc-equipment" value={production.shoot?.equipment ?? ''} onChange={(e) => setShoot('equipment', e.target.value)} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="cc-props">Props</label>
                  <input id="cc-props" value={production.shoot?.props ?? ''} onChange={(e) => setShoot('props', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-shootdate">Shoot Date</label>
                  <input id="cc-shootdate" type="date" value={production.shoot?.shootDate ?? ''} onChange={(e) => setShoot('shootDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-editdeadline">Edit Deadline</label>
                  <input id="cc-editdeadline" type="date" value={production.shoot?.editDeadline ?? ''} onChange={(e) => setShoot('editDeadline', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} className={inputCls} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Content
          </button>
        </div>
      </form>
    </Modal>
  );
}
