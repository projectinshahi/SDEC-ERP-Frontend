'use client';

import { FolderOpen } from 'lucide-react';

/**
 * MK-001.1 — the workspace landing state.
 *
 * The switcher itself lives in the layout, so this page only has to say what to
 * do next. Showing a blank panel here is the "broken empty workspace" the spec
 * calls out.
 */
export default function MarketingProjectsPage() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h2 className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-100">Select a project</h2>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Choose a client on the left, then pick one of its projects to open that project&apos;s
        calendar and content board.
      </p>
    </div>
  );
}
