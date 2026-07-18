'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Loader2, Paperclip, Link2, X, Plus } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { MultiSelect } from '@/components/user-management/MultiSelect';
import {
  createNotice, updateNotice, fetchNoticeCategories, fetchNoticeDepartments,
  uploadNoticeAttachments, addNoticeLink,
  type Notice, type NoticeCategory, type NoticePriority,
} from '@/lib/api/notices';

const PRIORITIES: { value: NoticePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

/**
 * Create / edit a notice. Categories are loaded from the DB-managed list (never
 * hardcoded), so new admin categories appear here automatically.
 */
export function CreateNoticeModal({
  isOpen, onClose, onSaved, editNotice, canManage = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editNotice?: Notice | null;
  /** Pin / important are manage-level — the backend ignores them without it. */
  canManage?: boolean;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [priority, setPriority] = useState<NoticePriority>('medium');
  const [isPinned, setIsPinned] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [categories, setCategories] = useState<NoticeCategory[]>([]);
  const [audienceType, setAudienceType] = useState<'company' | 'departments'>('company');
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<{ url: string; label: string }[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPendingFiles([]); setLinks([]); setLinkUrl(''); setLinkLabel('');
    fetchNoticeCategories().then(setCategories).catch(() => toast('Could not load categories. Please retry.', 'error'));
    fetchNoticeDepartments().then(setDepartments).catch(() => {});
    if (editNotice) {
      setTitle(editNotice.title);
      setBody(editNotice.body);
      setCategoryId(editNotice.category ? String(editNotice.category.id) : '');
      setPriority((editNotice.priority as NoticePriority) || 'medium');
      setIsPinned(editNotice.isPinned);
      setIsImportant(editNotice.isImportant);
      setExpiresAt(editNotice.expiresAt ? editNotice.expiresAt.slice(0, 10) : '');
      setAudienceType(editNotice.audience?.type === 'departments' ? 'departments' : 'company');
      setTargetDepartments(editNotice.audience?.departments || []);
    } else {
      setTitle(''); setBody(''); setCategoryId(''); setPriority('medium');
      setIsPinned(false); setIsImportant(false); setExpiresAt('');
      setAudienceType('company'); setTargetDepartments([]);
    }
  }, [isOpen, editNotice]);

  // Show active categories, plus the notice's current one even if since disabled.
  const options = categories.filter((c) => c.isActive || String(c.id) === categoryId);

  const submit = async (status: 'draft' | 'published') => {
    if (!title.trim()) { toast('Title is required.', 'error'); return; }
    if (!body.trim()) { toast('Body is required.', 'error'); return; }
    if (!categoryId) { toast('Please choose a category.', 'error'); return; }
    if (audienceType === 'departments' && targetDepartments.length === 0) {
      toast('Select at least one department, or choose Entire Company.', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body,
        categoryId: Number(categoryId),
        priority,
        isPinned,
        isImportant,
        expiresAt: expiresAt || null,
        audienceType,
        targetDepartments: audienceType === 'departments' ? targetDepartments : [],
        // status only applies to CREATE; the backend ignores it on update (lifecycle
        // is changed via the publish/archive actions, not the edit form).
        status,
      };
      let noticeId: number;
      if (editNotice) {
        await updateNotice(editNotice.id, payload);
        noticeId = editNotice.id;
      } else {
        const created = await createNotice(payload);
        noticeId = created.id;
      }
      // Attach pending files + links to the saved notice (best-effort — the notice
      // itself is already saved, so a failed attachment doesn't lose the notice).
      if (pendingFiles.length) {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append('files', f));
        try { await uploadNoticeAttachments(noticeId, fd); }
        catch { toast('Notice saved, but some files failed to upload.', 'error'); }
      }
      let linkFail = 0;
      for (const l of links) {
        try { await addNoticeLink(noticeId, l); } catch { linkFail++; }
      }
      if (linkFail) toast(`Notice saved, but ${linkFail} link${linkFail === 1 ? '' : 's'} could not be attached.`, 'error');
      toast(editNotice ? 'Notice updated.' : status === 'draft' ? 'Draft saved.' : 'Notice published.', 'success');
      onSaved();
      onClose();
    } catch {
      toast('Failed to save notice.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editNotice ? 'Edit Notice' : 'Publish Notice'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder="e.g. Office Closed for Maintenance"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Body *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Write the announcement…"
            className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select…</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as NoticePriority)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Expires <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Audience — Entire Company or specific departments (dynamic HR list). */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Audience</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="audienceType" checked={audienceType === 'company'} onChange={() => setAudienceType('company')}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Entire Company
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="audienceType" checked={audienceType === 'departments'} onChange={() => setAudienceType('departments')}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Specific Departments
            </label>
          </div>
          {audienceType === 'departments' && (
            <div className="mt-2">
              <MultiSelect
                label=""
                options={departments}
                selected={targetDepartments}
                onChange={setTargetDepartments}
                placeholder="Select departments…"
              />
              {departments.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">No departments found in HR records yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Pin / important are manage-level capabilities (the backend enforces this),
            so only show the controls to users who can actually use them. */}
        {canManage && (
          <div className="flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Pin to top
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
              Mark as important
            </label>
          </div>
        )}

        {/* Attachments — files + external links (uploaded after the notice saves). */}
        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Paperclip className="h-4 w-4 text-gray-400" /> Attachments <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="file"
            multiple
            onChange={(e) => setPendingFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {f.name}
                  <button type="button" onClick={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          {/* External link */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500"><Link2 className="h-3.5 w-3.5" /> Link</span>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…"
              className="min-w-[160px] flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
            <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label (optional)"
              className="min-w-[120px] flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
            <button type="button"
              onClick={() => {
                const u = linkUrl.trim();
                if (!/^https?:\/\/.+/i.test(u)) { toast('Enter a valid http(s) URL.', 'error'); return; }
                setLinks((prev) => [...prev, { url: u, label: linkLabel.trim() }]);
                setLinkUrl(''); setLinkLabel('');
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {links.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {links.map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-xs text-sky-700">
                  {l.label || l.url}
                  <button type="button" onClick={() => setLinks((p) => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          {editNotice ? (
            <Button onClick={() => submit('published')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          ) : (
            <>
              {/* Drafting is a manage-tier capability (only a manager can later publish /
                  edit / delete a draft) — a create-only publisher publishes directly. */}
              {canManage && (
                <Button variant="secondary" onClick={() => submit('draft')} disabled={saving}>Save Draft</Button>
              )}
              <Button onClick={() => submit('published')} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
