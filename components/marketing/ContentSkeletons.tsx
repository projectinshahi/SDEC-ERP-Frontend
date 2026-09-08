'use client';

import { Skeleton, SkeletonLine } from '@/components/ui/Skeleton';

/**
 * M11 #49 — loading skeletons for the Content module.
 *
 * Each one mirrors the structure and spacing of the view it stands in for — the
 * same column width, row height, badge shapes and section order — so swapping
 * the real content in causes no layout jump. Built on the existing shared
 * `Skeleton` primitives; no new animation or styling is introduced.
 */

/** One Kanban card placeholder — matches the real tile's padding and rows. */
function CardTileSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5">
      <SkeletonLine width="w-4/5" height="h-4" />
      <div className="mt-1.5 space-y-1">
        <SkeletonLine width="w-3/5" height="h-2.5" />
        <SkeletonLine width="w-2/3" height="h-2.5" />
      </div>
      <div className="mt-2 flex items-center gap-1">
        <Skeleton className="h-4 w-12 rounded-md" />
        <Skeleton className="h-4 w-12 rounded-md" />
        <Skeleton className="ml-auto h-3 w-14 rounded" />
      </div>
    </div>
  );
}

/**
 * Board skeleton — the same 280px columns, `max-h-[74vh]` frame and top border
 * the real board renders, so the columns do not resize when data lands.
 */
export function BoardSkeleton({ columns = 6, cardsPerColumn = 2 }: { columns?: number; cardsPerColumn?: number }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4" aria-label="Loading board">
      {Array.from({ length: columns }).map((_, c) => (
        <div
          key={c}
          className="flex max-h-[74vh] w-[280px] shrink-0 flex-col rounded-xl border border-t-4 border-gray-200/60 dark:border-gray-800/80 bg-gray-50/80 dark:bg-gray-900/40 p-2.5"
        >
          <div className="mb-2 flex items-center gap-2 px-1">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <SkeletonLine width="w-24" height="h-4" />
            <Skeleton className="ml-auto h-4 w-6 rounded-full" />
          </div>
          <div className="flex flex-col gap-2">
            {/* Staggered counts read as "still loading" rather than a fake board. */}
            {Array.from({ length: c % 2 === 0 ? cardsPerColumn : Math.max(1, cardsPerColumn - 1) }).map((__, i) => (
              <CardTileSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table skeleton — same column count and row height as the List/Deadline views. */
export function TableSkeleton({ columns = 8, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto" aria-label="Loading table">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-2.5"><SkeletonLine width="w-20" height="h-3" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-gray-50 last:border-0 dark:border-gray-800/60">
              {Array.from({ length: columns }).map((__, c) => (
                <td key={c} className="px-4 py-3">
                  <SkeletonLine width={c === 1 ? 'w-40' : 'w-16'} height="h-3.5" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One detail-page section placeholder, matching the Section card chrome. */
export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <Skeleton className="h-4 w-4 rounded" />
        <SkeletonLine width="w-32" height="h-4" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonLine width="w-24" height="h-2.5" />
            <SkeletonLine width="w-full" height="h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card detail skeleton — header, then the same two-column grid of sections the
 * real page lays out, so the page does not reflow when the card arrives.
 */
export function CardDetailSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading content card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <SkeletonLine width="w-56" height="h-5" />
            <SkeletonLine width="w-40" height="h-3" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionSkeleton rows={5} />
        <div className="space-y-4">
          <SectionSkeleton rows={3} />
          <SectionSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}

/** Compact inline placeholder for a panel that loads after the page (history, checklist). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-2" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
          <SkeletonLine width="w-1/3" height="h-3.5" />
          <SkeletonLine width="w-2/3" height="h-2.5" className="mt-1.5" />
        </li>
      ))}
    </ul>
  );
}
