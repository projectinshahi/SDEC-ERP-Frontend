'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarRange, ChevronLeft, ChevronRight, Lock, PackageSearch, AlertCircle } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { fetchAssetAvailability, fetchAssets, type AssetBooking, type MarketingAsset } from '@/lib/api/marketingAssets';
import {
  monthGrid, toYmd, todayYmd, addMonths, startOfMonth, viewTitle, DAY_NAMES,
} from '@/lib/marketing/calendarDates';

/**
 * MK-002.4 — the dedicated asset availability calendar.
 *
 * A VIEW, deliberately. There is no drag, no resize and no inline edit: the
 * requirement is that every change go through the request/approval workflow, and
 * the surest way to guarantee that is for this page to render nothing
 * interactive that could mutate a booking. It calls exactly one endpoint —
 * /marketing/assets/availability — which returns ONLY approved bookings, so the
 * calendar and the booking system share one definition of "reserved".
 */

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Does a booking cover this local calendar day? Compared as 'YYYY-MM-DD'
 *  strings built from the LOCAL date, so a booking never bleeds into the wrong
 *  day through a UTC conversion. */
function coversDay(b: AssetBooking, ymd: string): boolean {
  const start = toYmd(new Date(b.startAt));
  // A booking ending exactly at midnight belongs to the previous day — the
  // backend treats ranges as half-open [start, end), and so does this.
  const endInstant = new Date(b.endAt);
  const endYmd = toYmd(new Date(endInstant.getTime() - 1));
  return ymd >= start && ymd <= endYmd;
}

const TONE = [
  'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-700',
  'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-700',
  'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700',
  'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700',
];

export default function AssetAvailabilityPage() {
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<AssetBooking[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [assetFilter, setAssetFilter] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const range = useMemo(() => ({
    from: new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate()).toISOString(),
    to: new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1).toISOString(),
  }), [days]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, reg] = await Promise.all([
        fetchAssetAvailability(range.from, range.to),
        fetchAssets(),
      ]);
      setBookings(b);
      setAssets(reg.assets);
    } catch (err) {
      setBookings([]);
      setError(apiError(err) || 'Unable to load asset availability');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(
    () => (assetFilter === 'all' ? bookings : bookings.filter((b) => b.assetId === assetFilter)),
    [bookings, assetFilter],
  );

  // Stable colour per asset so the same equipment reads the same all month.
  const toneFor = useCallback((assetId: number) => {
    const ids = [...new Set(visible.map((b) => b.assetId))].sort((a, b) => a - b);
    return TONE[Math.max(0, ids.indexOf(assetId)) % TONE.length];
  }, [visible]);

  const today = todayYmd();
  const month = anchor.getMonth();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Asset Availability</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Approved bookings only.{' '}
              <Link href="/dashboard/marketing/assets" className="font-semibold text-cyan-700 hover:underline dark:text-cyan-400">
                Registry &amp; requests
              </Link>
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          <Lock className="h-3 w-3" /> View only — book through Requests
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous month" onClick={() => setAnchor((a) => addMonths(a, -1))}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setAnchor((a) => addMonths(a, 1))}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setAnchor(startOfMonth(new Date()))}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Today
          </button>
          <h2 className="ml-2 text-sm font-bold text-gray-800 dark:text-gray-100">{viewTitle('month', anchor)}</h2>
        </div>

        {assets.length > 1 && (
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
            Asset
            <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              aria-label="Filter by asset"
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none">
              <option value="all">All assets</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {loading ? (
          <div className="p-3" aria-busy="true">
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
            <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            <button type="button" onClick={() => void load()}
              className="mt-2 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-400">Try again</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const ymd = toYmd(day);
                  const outside = day.getMonth() !== month;
                  const onDay = visible.filter((b) => coversDay(b, ymd));
                  return (
                    <div key={ymd}
                      className={classNames(
                        'min-h-[84px] border-b border-r border-gray-100 dark:border-gray-800 p-1',
                        outside && 'bg-gray-50/60 dark:bg-gray-950/40',
                      )}>
                      <span className={classNames(
                        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold',
                        ymd === today ? 'bg-cyan-600 text-white'
                          : outside ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300',
                      )}>{day.getDate()}</span>
                      <div className="mt-0.5 space-y-0.5">
                        {onDay.slice(0, 3).map((b) => (
                          /* A div, not a button: nothing on this calendar is
                             actionable, which is how "no editing on the
                             calendar" is enforced structurally. */
                          <div key={`${b.requestId}-${ymd}`}
                            title={`${b.assetName} · ${b.projectName} · ${fmtTime(b.startAt)} → ${fmtTime(b.endAt)}${b.requesterName ? ` · ${b.requesterName}` : ''}`}
                            className={classNames('truncate rounded border px-1 py-0.5 text-[10px] font-semibold', toneFor(b.assetId))}>
                            {b.assetName}
                          </div>
                        ))}
                        {onDay.length > 3 && (
                          <span className="block px-1 text-[10px] font-semibold text-gray-400">+{onDay.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Reservations this period</h2>
          <p className="text-[11px] text-gray-400">
            Pending, rejected and cancelled requests never reserve an asset and are not listed.
          </p>
        </div>
        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <PackageSearch className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No approved bookings for this period.</p>
            <p className="mt-0.5 text-xs text-gray-400">Every listed asset is free for these dates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2">Asset</th>
                  <th className="px-4 py-2">Reserved</th>
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Holder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {visible.map((b) => (
                  <tr key={b.requestId}>
                    <td className="px-4 py-2">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{b.assetName}</div>
                      <div className="font-mono text-[10px] text-gray-400">{b.assetSerial}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{fmtTime(b.startAt)} → {fmtTime(b.endAt)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{b.projectName}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{b.requesterName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
