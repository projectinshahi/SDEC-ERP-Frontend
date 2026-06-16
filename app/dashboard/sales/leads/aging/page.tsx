'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchLeadAging } from '@/lib/api/leadLifecycle';
import type { AgingReport, AgingFlag } from '@/lib/types/leadLifecycle';

const THRESHOLDS = [7, 14, 30];

const flagVariant: Record<AgingFlag, 'warning' | 'danger'> = {
  'Needs Attention': 'warning',
  'At Risk': 'warning',
  'No Activity': 'danger',
};

export default function LeadAgingPage() {
  const { toast } = useToast();
  const [days, setDays] = useState(14);
  const [report, setReport] = useState<AgingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (threshold: number) => {
    try {
      setIsLoading(true);
      setReport(await fetchLeadAging(threshold));
    } catch {
      toast('Failed to load aging report', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(days);
  }, [days, load]);

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/leads' },
              { label: 'Leads', href: '/dashboard/sales/leads' },
              { label: 'Aging', href: '/dashboard/sales/leads/aging' },
            ]}
          />
          <Link href="/dashboard/sales/leads">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Aging Report</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active leads with no interaction or follow-up activity for at least{' '}
                  <span className="font-semibold">{days}</span> days. Converted, disqualified and
                  closed leads are excluded.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Threshold</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {THRESHOLDS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setDays(t)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      days === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {t} days
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Lead Name</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Owner</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Days Inactive</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Risk</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading…</td></tr>
                ) : !report || report.leads.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    All leads are healthy.
                  </td></tr>
                ) : (
                  report.leads.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {l.title}
                        {l.company && <span className="text-gray-400 font-normal"> · {l.company}</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{l.owner}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{l.stage}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white tabular-nums">{l.daysSinceLastActivity}d</td>
                      <td className="px-6 py-4">
                        <Badge variant={flagVariant[l.flag]}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {l.flag}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/sales/leads/${l.id}`}>
                          <Button variant="secondary" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PermissionPageGuard>
  );
}
