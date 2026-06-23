'use client';

import { useState, useEffect, useCallback } from 'react';
import { Phone, Mail, Users, Plus, MessageSquare } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchLeadInteractions } from '@/lib/api/leadQualification';
import { AddInteractionModal } from './AddInteractionModal';
import type { LeadInteraction, InteractionType } from '@/lib/types/leadQualification';

interface InteractionTimelineProps {
  leadId: number;
  /** Bump this number to force a reload (e.g. after score recompute). */
  refreshKey?: number;
  onChange?: () => void;
}

const TYPE_META: Record<InteractionType, { icon: React.ComponentType<{ className?: string; size?: number }>; color: string }> = {
  Call: { icon: Phone, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300' },
  Email: { icon: Mail, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' },
  Meeting: { icon: Users, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay) return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${time}`;
}

/** Interaction timeline (newest first) with an "Add Interaction" action. */
export function InteractionTimeline({ leadId, refreshKey = 0, onChange }: InteractionTimelineProps) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canLog = hasPermission('sales.edit');

  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setInteractions(await fetchLeadInteractions(leadId));
    } catch {
      toast('Failed to load next actions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          Next Actions
          {interactions.length > 0 && (
            <span className="text-xs font-medium text-gray-400">({interactions.length})</span>
          )}
        </h2>
        {canLog && (
          <Button size="sm" onClick={() => setIsAddOpen(true)} title="Add a next action (call, email, meeting, follow-up)">
            <Plus className="w-4 h-4 mr-1" />
            Add Action
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading next actions…</p>
      ) : interactions.length === 0 ? (
        <p className="text-sm text-gray-500">No next actions yet.</p>
      ) : (
        <ul className="space-y-4">
          {interactions.map((it) => {
            const meta = TYPE_META[it.type] || TYPE_META.Call;
            const Icon = meta.icon;
            return (
              <li key={it.id} className="flex gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{it.type}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(it.interactionDate)}</span>
                    <span className="text-xs text-gray-400">by {it.author?.name || 'Unknown'}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
                    {it.notes}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddInteractionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        leadId={leadId}
        onSaved={() => {
          load();
          onChange?.();
        }}
      />
    </Card>
  );
}
