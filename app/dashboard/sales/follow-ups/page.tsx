'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Clock, AlertTriangle, CalendarClock, CheckCircle2, Inbox } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchMyFollowUps, completeFollowUp } from '@/lib/api/leadQualification';
import type { MyFollowUps, FollowUp } from '@/lib/types/leadQualification';

type Tab = 'today' | 'overdue' | 'upcoming' | 'completed';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }[] = [
  { key: 'today', label: "Today's Follow-ups", icon: Clock, tone: 'text-amber-600' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, tone: 'text-rose-600' },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarClock, tone: 'text-blue-600' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, tone: 'text-emerald-600' },
];

function dueLabel(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FollowUpCenterPage() {
  const { toast } = useToast();
  const [data, setData] = useState<MyFollowUps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('today');
  const [completingId, setCompletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setData(await fetchMyFollowUps());
    } catch {
      toast('Failed to load follow-ups', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  const items: FollowUp[] = (data?.[tab] as FollowUp[] | undefined) ?? [];

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Sales', href: '/dashboard/sales' },
                { label: 'Follow-up Center', href: '/dashboard/sales/follow-ups' },
              ]}
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Follow-up Center</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = data?.counts?.[key] ?? 0;
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <Icon size={16} />
                {label}
                <span className={`rounded-full px-1.5 text-xs font-bold ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Inbox className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                {tab === 'completed' ? 'No completed follow-ups yet.' : 'Nothing here — you’re all caught up.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((fu) => (
                <li key={fu.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={fu.leadId ? `/dashboard/sales/leads/${fu.leadId}` : '#'}
                      className="text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-blue-600 break-words"
                    >
                      {fu.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fu.lead?.customer?.company || fu.lead?.title || ''}
                      {' · '}
                      {tab === 'completed' && fu.completedAt ? `completed ${dueLabel(fu.completedAt)}` : `due ${dueLabel(fu.scheduledDate)}`}
                    </p>
                  </div>
                  {tab === 'completed' ? (
                    <Badge variant="success">Done</Badge>
                  ) : (
                    <button
                      onClick={() => handleComplete(fu.id)}
                      disabled={completingId === fu.id}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} /> Complete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PermissionPageGuard>
  );
}
