'use client';

/**
 * Base Skeleton component using premium Tailwind design tokens.
 * Animates with a smooth pulse effect and handles dark mode styling natively.
 */
export const Skeleton = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    role="status"
    aria-busy="true"
    className={`animate-pulse bg-gray-200 dark:bg-slate-800 rounded-md ${className}`}
    {...props}
  />
);

/**
 * Circle preset (ideal for avatar skeletons)
 */
export const SkeletonCircle = ({ size = 'w-10 h-10', className = '' }: { size?: string; className?: string }) => (
  <Skeleton className={`${size} rounded-full shrink-0 ${className}`} />
);

/**
 * Horizontal text line presets
 */
export const SkeletonLine = ({ width = 'w-full', height = 'h-4', className = '' }: { width?: string; height?: string; className?: string }) => (
  <Skeleton className={`${width} ${height} ${className}`} />
);

/**
 * StatCard component specific skeleton loader
 */
export const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
    <div className="space-y-3.5 flex-1 pr-4">
      {/* Title skeleton */}
      <SkeletonLine width="w-24" height="h-3" />
      {/* Numeric value skeleton */}
      <SkeletonLine width="w-16" height="h-7" />
      {/* Footer statistics description skeleton */}
      <SkeletonLine width="w-32" height="h-2.5" />
    </div>
    {/* Icon visual skeleton block */}
    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
  </div>
);

/**
 * ActivityRow component specific skeleton loader
 */
export const ActivityRowSkeleton = () => (
  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-800 last:border-0">
    <div className="flex items-center gap-3.5 flex-1 pr-6">
      {/* Left Avatar circle placeholder */}
      <SkeletonCircle size="w-10 h-10" />
      <div className="space-y-2 flex-1">
        {/* Main description line */}
        <SkeletonLine width="w-3/5" height="h-3.5" />
        {/* Sub-text timestamp line */}
        <SkeletonLine width="w-1/4" height="h-2.5" />
      </div>
    </div>
    {/* Badge status pill placeholder */}
    <Skeleton className="w-16 h-6 rounded-full shrink-0" />
  </div>
);
