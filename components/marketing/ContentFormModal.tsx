'use client';

import { useState } from 'react';
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
  const [form, setForm] = useState({
    title: '', description: '', format: 'reel', stage: 'idea', priority: 'medium',
    objective: '', targetAudience: '', platform: '', cta: '', references: '', notes: '',
    deadline: '', ownerId: '', designerId: '', videographerId: '', editorId: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const created = await createContent({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        format: form.format || undefined,
        stage: form.stage,
        priority: form.priority,
        objective: form.objective || undefined,
        targetAudience: form.targetAudience.trim() || undefined,
        platform: form.platform || undefined,
        cta: form.cta.trim() || undefined,
        references: form.references.trim() || undefined,
        notes: form.notes.trim() || undefined,
        deadline: form.deadline || undefined,
        ownerId: form.ownerId ? Number(form.ownerId) : undefined,
        designerId: form.designerId ? Number(form.designerId) : undefined,
        videographerId: form.videographerId ? Number(form.videographerId) : undefined,
        editorId: form.editorId ? Number(form.editorId) : undefined,
      });
      onCreated(created);
      setForm({ title: '', description: '', format: 'reel', stage: 'idea', priority: 'medium', objective: '', targetAudience: '', platform: '', cta: '', references: '', notes: '', deadline: '', ownerId: '', designerId: '', videographerId: '', editorId: '' });
      onClose();
    } catch (err: any) {
      setError(err?.details?.error || err?.message || 'Failed to create content.');
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
            <label className={labelCls}>Content Title *</label>
            <input value={form.title} onChange={set('title')} className={inputCls} placeholder="e.g. ERP Awareness" required maxLength={255} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={set('description')} className={inputCls} rows={2} placeholder="What is this content about?" />
          </div>

          <div>
            <label className={labelCls}>Format</label>
            <select value={form.format} onChange={set('format')} className={inputCls}>
              {CONTENT_FORMATS.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
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
            <label className={labelCls}>Objective</label>
            <select value={form.objective} onChange={set('objective')} className={inputCls}>
              <option value="">Not set</option>
              {CONTENT_OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Platform</label>
            <select value={form.platform} onChange={set('platform')} className={inputCls}>
              <option value="">Not set</option>
              {CONTENT_PLATFORMS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

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
