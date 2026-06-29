'use client';

/**
 * SalesMeetingNotesPanel — meeting notes for a Sales Meeting.
 *
 * Mirrors components/meetings/MeetingNotesPanel.tsx but wires to the Sales notes
 * API (getSalesMeetingNotes / createSalesMeetingNote / updateSalesMeetingNote /
 * deleteSalesMeetingNote). Write actions (add/edit/delete) are gated on the
 * caller-supplied `canWrite` flag (sales.meetings.edit).
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Search, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import {
  getSalesMeetingNotes,
  createSalesMeetingNote,
  updateSalesMeetingNote,
  deleteSalesMeetingNote,
  type SalesMeetingNote,
} from '@/lib/api/salesMeetings';

interface SalesMeetingNotesPanelProps {
  meetingId: number;
  /** Whether the current user may add/edit/delete notes (sales.meetings.edit). */
  canWrite: boolean;
}

export function SalesMeetingNotesPanel({ meetingId, canWrite }: SalesMeetingNotesPanelProps) {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [notes, setNotes] = useState<SalesMeetingNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<SalesMeetingNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      setNotes(await getSalesMeetingNotes(meetingId));
    } catch (err) {
      console.error('Failed to load notes', err);
      toast('Failed to load meeting notes.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const filteredNotes = notes.filter(n =>
    !searchQuery ||
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAdd = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
    setIsEditing(true);
  };

  const openEdit = (note: SalesMeetingNote) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingNote(note);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  const saveNote = async () => {
    if (!title.trim() || !content.trim()) {
      toast('Title and content are required.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingNote) {
        const updated = await updateSalesMeetingNote(meetingId, editingNote.id, { title: title.trim(), content: content.trim() });
        setNotes(prev => prev.map(n => (n.id === editingNote.id ? updated : n)));
        toast('Note updated successfully.', 'success');
      } else {
        const created = await createSalesMeetingNote(meetingId, { title: title.trim(), content: content.trim() });
        setNotes(prev => [created, ...prev]);
        toast('Note added successfully.', 'success');
      }
      setIsEditing(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save note', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (note: SalesMeetingNote) => {
    const ok = await confirm({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${note.title}"?`,
      confirmLabel: 'Delete',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteSalesMeetingNote(meetingId, note.id);
      setNotes(prev => prev.filter(n => n.id !== note.id));
      toast('Note deleted successfully.', 'info');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete note', 'error');
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Discussion summary & next steps"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={8}
            placeholder="Meeting minutes, decisions, follow-ups..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={cancelEdit} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={saveNote} isLoading={isSubmitting}>
            {editingNote ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {canWrite && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Note
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2" />
          <p className="text-sm">Loading notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-12 text-center text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm font-semibold mb-1">No meeting notes available</p>
          <p className="text-xs">Add notes to document discussions, decisions, and action items.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map(note => (
            <Card key={note.id} variant="outlined" className="p-4 bg-white dark:bg-gray-800">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{note.title}</h3>
                {canWrite && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => openEdit(note)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Edit note">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(note)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete note">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                {note.content}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                    {note.author?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span>{note.author?.name || 'Unknown User'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                {note.updatedBy && note.updatedAt !== note.createdAt && (
                  <span className="italic">(Edited)</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
