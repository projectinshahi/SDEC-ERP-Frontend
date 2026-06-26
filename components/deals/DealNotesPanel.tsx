'use client';

import { useState, useEffect, useCallback } from 'react';
import { StickyNote, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchDealNotes, createDealNote, updateDealNote, deleteDealNote } from '@/lib/api/leadLifecycle';
import type { DealNote } from '@/lib/types/leadLifecycle';

interface DealNotesPanelProps {
  dealId: number;
  /** Fired after any note mutation so the parent can refresh the activity feed. */
  onChange?: () => void;
}

function avatar(name: string) {
  const initials =
    name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500',
    'bg-teal-500', 'bg-orange-500', 'bg-emerald-500',
  ];
  return { initials, color: colors[Math.abs(hash) % colors.length] };
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${time}`;
}

/**
 * Deal Notes timeline (mirrors LeadNotesPanel). Editable per-deal notes persisted
 * in the `deal_notes` table — add/edit/delete gated on sales permissions; the
 * backend re-enforces author-or-admin on edit/delete.
 */
export function DealNotesPanel({ dealId, onChange }: DealNotesPanelProps) {
  const { toast } = useToast();
  const { hasPermission, isSuperAdmin, roleName } = usePermissions();
  const { user } = useAuth();

  const canAdd = hasPermission('sales.edit');
  const canDelete = hasPermission('sales.delete');
  // Editing/deleting OTHER people's notes is an elevated capability. Mirror the
  // backend's allowance (role.includes('admin')) so the affordance isn't wrongly
  // hidden from non-super 'admin' roles (FE was stricter than the BE gate).
  const isAdmin = isSuperAdmin || (roleName || '').toLowerCase().includes('admin');
  const currentUserId = Number(user?.id);

  const [notes, setNotes] = useState<DealNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotes(await fetchDealNotes(dealId));
    } catch {
      toast('Failed to load notes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dealId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!newNote.trim()) {
      toast('Note cannot be empty', 'warning');
      return;
    }
    try {
      setIsAdding(true);
      await createDealNote(dealId, newNote);
      setNewNote('');
      toast('Note added', 'success');
      await load();
      onChange?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to add note', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (note: DealNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (noteId: number) => {
    if (!editContent.trim()) {
      toast('Note cannot be empty', 'warning');
      return;
    }
    try {
      setIsSavingEdit(true);
      await updateDealNote(dealId, noteId, editContent);
      setEditingId(null);
      toast('Note updated', 'success');
      await load();
      onChange?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update note', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      await deleteDealNote(dealId, noteId);
      toast('Note deleted', 'success');
      await load();
      onChange?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete note', 'error');
    }
  };

  const canEditNote = (note: DealNote) => canAdd && (isAdmin || note.authorId === currentUserId);
  const canDeleteNote = (note: DealNote) => canDelete && (isAdmin || note.authorId === currentUserId);

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <StickyNote className="w-5 h-5 text-gray-400" />
        Notes
        {notes.length > 0 && (
          <span className="text-xs font-medium text-gray-400">({notes.length})</span>
        )}
      </h2>

      {canAdd && (
        <div className="mb-5">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            placeholder="Add a note… (e.g. Sent revised proposal, awaiting client feedback)"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-y"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleAdd} isLoading={isAdding} disabled={!newNote.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500">No notes yet. Notes act as a historical communication log.</p>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => {
            const authorName = note.author?.name || 'Unknown';
            const { initials, color } = avatar(authorName);
            const isEditing = editingId === note.id;
            return (
              <li key={note.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${color}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{authorName}</span>
                      <span className="text-xs text-gray-400">{formatTimestamp(note.createdAt)}</span>
                      {note.updatedAt !== note.createdAt && (
                        <span className="text-[10px] text-gray-400 italic">(edited)</span>
                      )}
                    </div>
                    {!isEditing && (canEditNote(note) || canDeleteNote(note)) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {canEditNote(note) && (
                          <button
                            onClick={() => startEdit(note)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded transition-colors"
                            title="Edit note"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDeleteNote(note) && (
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                            title="Delete note"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-y"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSaveEdit(note.id)} isLoading={isSavingEdit}>
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
