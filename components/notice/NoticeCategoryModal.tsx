'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Loader2, Plus, ArrowUp, ArrowDown, Pencil, Trash2, Check, X } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import {
  fetchNoticeCategories, createNoticeCategory, updateNoticeCategory,
  reorderNoticeCategories, deleteNoticeCategory, type NoticeCategory,
} from '@/lib/api/notices';
import { classNames } from '@/lib/utils';

const SWATCHES = ['#64748b', '#3b82f6', '#8b5cf6', '#6366f1', '#f97316', '#06b6d4', '#10b981', '#ef4444', '#eab308', '#ec4899'];
const ICON_NAMES = ['Megaphone', 'Users', 'ShieldCheck', 'CalendarDays', 'Settings', 'Cpu', 'DollarSign', 'AlertTriangle', 'Wrench', 'PartyPopper', 'Tag'];

/**
 * Notice category admin — add / rename / recolor / change icon / reorder / disable /
 * delete. Reuses the notice-category API (create/update/reorder/delete). Categories
 * are DB-managed, so anything changed here flows to the create form, filters and
 * dashboard with no code change.
 */
export function NoticeCategoryModal({
  isOpen, onClose, onChanged,
}: {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [cats, setCats] = useState<NoticeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(SWATCHES[0]);
  const [newIcon, setNewIcon] = useState('Megaphone');

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const load = () => {
    setLoading(true);
    fetchNoticeCategories().then(setCats).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  const changed = () => { load(); onChanged?.(); };

  const add = async () => {
    if (!newName.trim()) { toast('Category name is required.', 'error'); return; }
    setBusy(true);
    try {
      await createNoticeCategory({ name: newName.trim(), color: newColor, icon: newIcon });
      setNewName('');
      toast('Category added.', 'success');
      changed();
    } catch { toast('Failed to add category (duplicate name?).', 'error'); } finally { setBusy(false); }
  };

  const startEdit = (c: NoticeCategory) => {
    setEditId(c.id); setEditName(c.name); setEditColor(c.color); setEditIcon(c.icon || 'Tag');
  };
  const saveEdit = async () => {
    if (editId == null) return;
    if (!editName.trim()) { toast('Category name is required.', 'error'); return; }
    setBusy(true);
    try {
      await updateNoticeCategory(editId, { name: editName.trim(), color: editColor, icon: editIcon });
      setEditId(null);
      toast('Category updated.', 'success');
      changed();
    } catch { toast('Failed to update category.', 'error'); } finally { setBusy(false); }
  };

  const toggleActive = async (c: NoticeCategory) => {
    setBusy(true);
    try { await updateNoticeCategory(c.id, { isActive: !c.isActive }); changed(); }
    catch { toast('Failed to update category.', 'error'); } finally { setBusy(false); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= cats.length) return;
    const next = [...cats];
    [next[index], next[target]] = [next[target], next[index]];
    setCats(next); // optimistic
    setBusy(true);
    try { await reorderNoticeCategories(next.map((c) => c.id)); onChanged?.(); }
    catch { toast('Failed to reorder.', 'error'); load(); } finally { setBusy(false); }
  };

  const remove = async (c: NoticeCategory) => {
    const ok = await confirm({
      title: 'Delete category',
      message: `Delete "${c.name}"? Notices in it become Uncategorized. This cannot be undone.`,
      confirmLabel: 'Delete', intent: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try { await deleteNoticeCategory(c.id); toast('Category deleted.', 'success'); changed(); }
    catch { toast('Failed to delete category.', 'error'); } finally { setBusy(false); }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Notice Categories" size="lg">
      <div className="space-y-4">
        {/* Add */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Add category</p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="min-w-[140px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <select value={newIcon} onChange={(e) => setNewIcon(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <SwatchPicker value={newColor} onChange={setNewColor} />
            <Button onClick={add} disabled={busy}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8 text-gray-300"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : cats.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No categories yet.</p>
        ) : (
          <ul className="max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
            {cats.map((c, i) => (
              <li key={c.id} className="rounded-xl border border-gray-200 bg-white p-2.5">
                {editId === c.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="min-w-[120px] flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
                    <select value={editIcon} onChange={(e) => setEditIcon(e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
                      {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <SwatchPicker value={editColor} onChange={setEditColor} />
                    <button type="button" onClick={saveEdit} disabled={busy} title="Save" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setEditId(null)} title="Cancel" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className={classNames('flex-1 truncate text-sm font-medium', c.isActive ? 'text-gray-800' : 'text-gray-400 line-through')}>
                      {c.name}
                    </span>
                    <span className="text-[11px] text-gray-400">{c.icon || '—'}</span>
                    <label className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-gray-500">
                      <input type="checkbox" checked={c.isActive} onChange={() => toggleActive(c)} disabled={busy}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      Active
                    </label>
                    <div className="flex items-center">
                      <button type="button" onClick={() => move(i, -1)} disabled={busy || i === 0} title="Move up" className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={busy || i === cats.length - 1} title="Move down" className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => startEdit(c)} title="Edit" className="rounded p-1 text-gray-400 hover:bg-gray-100"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => remove(c)} title="Delete" className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

function SwatchPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      {SWATCHES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          title={s}
          className={classNames('h-5 w-5 rounded-full border-2 transition', value.toLowerCase() === s ? 'border-gray-700' : 'border-transparent')}
          style={{ backgroundColor: s }}
        />
      ))}
    </div>
  );
}
