'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Phone, Mail, Users, StickyNote, Bell, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { useToast } from '@/lib/hooks/useToast';
import { fetchLeadHistory } from '@/lib/api/leadLifecycle';
import type { HistoryEntry } from '@/lib/types/leadLifecycle';

interface FollowUpHistoryProps {
  leadId: number;
  /** Bump to reload after a new interaction/note/follow-up is recorded. */
  refreshKey?: number;
}

const META: Record<string, { icon: React.ComponentType<{ className?: string; size?: number }>; color: string }> = {
  Call: { icon: Phone, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300' },
  Email: { icon: Mail, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' },
  Meeting: { icon: Users, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' },
  Note: { icon: StickyNote, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  'Follow-up Task': { icon: Bell, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300' },
  'Reminder Completed': { icon: CheckCircle2, color: 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-300' },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} - ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

/**
 * SE-008.1 — unified follow-up history: a chronological (newest-first) merge of
 * calls, emails, meetings, notes, follow-up tasks and reminder completions.
 */
export function FollowUpHistory({ leadId, refreshKey = 0 }: FollowUpHistoryProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setEntries(await fetchLeadHistory(leadId));
    } catch {
      toast('Failed to load next action history', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-gray-400" />
        Next Action History
        {entries.length > 0 && <span className="text-xs font-medium text-gray-400">({entries.length})</span>}
      </h2>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading history…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">No next action history available.</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((e, i) => {
            const meta = META[e.type] || META.Note;
            const Icon = meta.icon;
            return (
              <li key={`${e.kind}-${e.timestamp}-${i}`} className="flex gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{e.type}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(e.timestamp)}</span>
                    {e.author && <span className="text-xs text-gray-400">· {e.author}</span>}
                  </div>
                  {e.notes && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
                      {e.notes}
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
