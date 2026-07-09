'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/Badge';
import { StalledBadge } from './StalledBadge';
import type { PipelineDeal } from '@/lib/types/salesExecution';
import { formatINR } from '@/lib/utils/currency';

interface PipelineDealTableProps {
  deals: PipelineDeal[];
}

// Centralized INR formatter → "₹1,25,000"; matches the deal card/board views so
// every deal surface renders the rupee consistently (single source of truth).
function money(deal: PipelineDeal): string {
  return formatINR(deal.amount);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Green "Healthy" dot shown when a deal has no stalled flag. */
function HealthyDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Healthy
    </span>
  );
}

function StatusCell({ deal }: { deal: PipelineDeal }) {
  return deal.stalledStatus?.level === 'healthy' ? (
    <HealthyDot />
  ) : (
    <StalledBadge status={deal.stalledStatus} />
  );
}

/**
 * SE-020.1 / SE-021 — Pipeline deal grid.
 *
 * Renders a card list on small screens and a full table on md+. Rows navigate
 * to the deals workspace.
 */
export function PipelineDealTable({ deals }: PipelineDealTableProps) {
  const router = useRouter();
  const open = () => router.push('/dashboard/sales/deals');

  return (
    <>
      {/* Mobile / tablet: card list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {deals.map((deal) => (
          <button
            key={deal.id}
            type="button"
            onClick={open}
            className="text-left rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{deal.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {deal.customer?.company || deal.customer?.name || '—'}
                </p>
              </div>
              <StatusCell deal={deal} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Value</p>
                <p className="font-semibold text-gray-900 dark:text-white tabular-nums">{money(deal)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Stage</p>
                <Badge variant="info">{deal.stage}</Badge>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Probability</p>
                <p className="text-gray-700 dark:text-gray-200 tabular-nums">{deal.probability ?? 0}%</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Close</p>
                <p className="text-gray-700 dark:text-gray-200">{formatDate(deal.expectedCloseDate)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Owner: <span className="font-medium text-gray-700 dark:text-gray-200">{deal.owner?.name || '—'}</span>
            </p>
          </button>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3.5 font-medium text-gray-500 dark:text-gray-400">Deal</th>
                <th className="px-6 py-3.5 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                <th className="px-6 py-3.5 font-medium text-gray-500 dark:text-gray-400 text-right">Value</th>
                <th className="px-6 py-3.5 font-medium text-gray-500 dark:text-gray-400 text-right">Probability</th>
                <th className="px-6 py-3.5 font-medium text-gray-500 dark:text-gray-400">Owner</th>
                <th className="px-6 py-3.5 font-medium text-gray-500 dark:text-gray-400">Close Date</th>
                <th className="px-6 py-3.5 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {deals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={open}
                  className="cursor-pointer hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{deal.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deal.customer?.company || deal.customer?.name || '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="info">{deal.stage}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white tabular-nums">
                    {money(deal)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-200 tabular-nums">
                    {deal.probability ?? 0}%
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-200">{deal.owner?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-200">{formatDate(deal.expectedCloseDate)}</td>
                  <td className="px-6 py-4">
                    <StatusCell deal={deal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
