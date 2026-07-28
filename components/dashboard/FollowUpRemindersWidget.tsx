'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Clock, AlertTriangle, CalendarClock, CheckCircle2, Inbox, RefreshCw } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useToast } from '@/lib/hooks/useToast';
import { fetchMyFollowUps, completeFollowUp } from '@/lib/api/leadQualification';
import type { MyFollowUps, FollowUp } from '@/lib/types/leadQualification';

type Bucket = 'overdue' | 'today' | 'upcoming';

const BUCKETS: { key: Bucket; label: string; icon: React.ComponentType<{ className?: string; size?: number }>; tone: string }[] = [
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, tone: 'text-rose-600 dark:text-rose-400' },
  { key: 'today', label: "Today's Follow-ups", icon: Clock, tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarClock, tone: 'text-blue-600 dark:text-blue-400' },
];

function dueLabel(iso: string): string {
  const d = new Date(iso);
  // Reminders carry a time of day now, so "12 Aug" alone can't tell the owner
  // whether it's the 10:00 or the 15:30 follow-up.
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Dashboard widget surfacing the current user's follow-up reminders bucketed
 * into Overdue / Today / Upcoming, with one-click completion. Loading it also
 * triggers due/overdue notifications server-side.
 */
export function FollowUpRemindersWidget() {
  const { toast } = useToast();
  const [data, setData] = useState<MyFollowUps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setData(await fetchMyFollowUps());
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (id: number) => {
    try {
      setCompletingId(id);
      await completeFollowUp(id);
      toast('Follow-up completed', 'success');
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to complete follow-up', 'error');
    } finally {
      setCompletingId(null);
    }
  };

  const totalCount = data?.counts ? data.counts.overdue + data.counts.today + data.counts.upcoming : 0;

  const renderItem = (fu: FollowUp) => (
    <div key={fu.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="min-w-0">
        <Link
          href={fu.leadId ? `/dashboard/sales/pipeline/${fu.leadId}` : '#'}
          className="text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-blue-600 break-words"
        >
          {fu.title}
        </Link>
        <p className="text-xs text-gray-400 mt-0.5">
          {fu.lead?.customer?.company || fu.lead?.title || ''} · due {dueLabel(fu.scheduledDate)}
        </p>
      </div>
      <button
        onClick={() => handleComplete(fu.id)}
        disabled={completingId === fu.id}
        className="shrink-0 p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-colors disabled:opacity-50"
        title="Mark complete"
      >
        <CheckCircle2 size={18} />
      </button>
    </div>
  );

  return (
    <Card className="h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Clock size={18} className="text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Follow-up Reminders</h2>
          {totalCount > 0 && (
            <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>
        <button onClick={load} className="p-1 text-gray-400 hover:text-indigo-600 rounded" title="Refresh">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-6 space-y-5 max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading reminders…</p>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <AlertTriangle size={24} className="text-rose-500" />
            <p className="text-sm text-gray-500">Failed to load reminders</p>
            <Button size="sm" variant="secondary" onClick={load}>Retry</Button>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Inbox size={24} className="text-gray-400" />
            <p className="text-sm text-gray-500">No follow-ups scheduled. You&apos;re all caught up.</p>
          </div>
        ) : (
          BUCKETS.map(({ key, label, icon: Icon, tone }) => {
            const items = data?.[key] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wide ${tone}`}>
                  <Icon size={14} />
                  {label}
                  <span className="text-gray-400">({items.length})</span>
                </div>
                <div className="space-y-2">{items.map(renderItem)}</div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
