'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useToast } from '@/lib/hooks/useToast';
import { fetchScoreBreakdown } from '@/lib/api/leadQualification';
import { ratingVariant, scoreColorClass, formatScore } from '@/lib/data/leadRating';
import type { ScoreBreakdown } from '@/lib/types/leadQualification';

interface ScoreCardProps {
  leadId: number;
  /** Bump to refetch (e.g. after editing the lead or logging an interaction). */
  refreshKey?: number;
}

/** Lead score gauge + rating + per-factor breakdown. */
export function ScoreCard({ leadId, refreshKey = 0 }: ScoreCardProps) {
  const { toast } = useToast();
  const [data, setData] = useState<ScoreBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setData(await fetchScoreBreakdown(leadId));
    } catch {
      toast('Failed to load score', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const score = data?.score ?? 0;
  const rating = data?.rating ?? 'Not Scored';

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Gauge className="w-4 h-4 text-gray-400" />
          Lead Score
        </h2>
        <button
          onClick={load}
          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
          title="Recalculate from latest data"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex items-end gap-3 mb-2">
        <span className={`text-4xl font-bold tabular-nums ${scoreColorClass(score)}`}>
          {formatScore(score)}
        </span>
        {score > 0 && <span className="text-sm text-gray-400 mb-1">/ 100</span>}
        <Badge variant={ratingVariant(rating)} className="ml-auto mb-1">{rating}</Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 80 ? 'bg-rose-500' : score >= 50 ? 'bg-amber-500' : score > 0 ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      {/* Breakdown */}
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Score Breakdown</p>
      {isLoading ? (
        <p className="text-sm text-gray-500">Calculating…</p>
      ) : !data || data.breakdown.length === 0 ? (
        <p className="text-sm text-gray-500">No active scoring factors configured.</p>
      ) : (
        <ul className="space-y-2.5">
          {data.breakdown.map((b) => (
            <li key={b.factor}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-300">{b.label}</span>
                <span className="text-gray-400">
                  +{b.contribution} <span className="text-gray-300 dark:text-gray-600">(w{b.weight})</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-400"
                  style={{ width: `${Math.max(0, Math.min(100, b.subScore * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
