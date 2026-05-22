'use client';

import { Activity, RefreshCw, AlertTriangle, Inbox, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ActivityRowSkeleton } from '../ui/Skeleton';

export interface ActivityItem {
  id: string | number;
  title: string;
  timestamp: string;
  status: 'Completed' | 'Pending' | 'In Progress' | 'Cancelled' | string;
  type?: 'info' | 'success' | 'warning' | 'danger' | string;
}

export interface ActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Premium dashboard Activity Feed widget.
 * Integrates comprehensive state controls: loading loops, empty display modes,
 * and error recovery button components.
 */
export function ActivityFeed({
  activities = [],
  isLoading = false,
  isError = false,
  onRetry,
}: ActivityFeedProps) {
  // Determine if feed is empty
  const isEmpty = !activities || activities.length === 0;

  // Map arbitrary status fields to badge variants
  const getBadgeVariant = (status: string, explicitType?: string) => {
    if (explicitType) return explicitType as any;
    
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'success':
        return 'success';
      case 'in-progress':
      case 'active':
        return 'warning';
      case 'cancelled':
      case 'failed':
        return 'danger';
      case 'pending':
      default:
        return 'info';
    }
  };

  return (
    <Card className="h-full border border-gray-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <CardHeader className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Recent Activity</h2>
        </div>
        {!isLoading && !isError && activities.length > 0 && (
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full shrink-0">
            {activities.length} total
          </span>
        )}
      </CardHeader>
      
      <CardBody className="p-6">
        {/* 1. Loading State */}
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, idx) => (
              <ActivityRowSkeleton key={idx} />
            ))}
          </div>
        ) : isError ? (
          /* 2. Error State */
          <div className="flex flex-col items-center justify-center min-h-[260px] text-center p-4">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center text-rose-500 mb-4 animate-bounce">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-bold text-gray-850 dark:text-white">
              Failed to load activity feed
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">
              Please double check database connectivity or configurations
            </p>
            {onRetry && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                className="mt-5 inline-flex items-center gap-1.5 dark:border-slate-700 dark:text-slate-300"
              >
                <RefreshCw size={14} />
                <span>Retry Feed</span>
              </Button>
            )}
          </div>
        ) : isEmpty ? (
          /* 3. Empty State */
          <div className="flex flex-col items-center justify-center min-h-[260px] text-center p-4">
            <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
              <Inbox size={22} />
            </div>
            <h3 className="text-sm font-bold text-gray-850 dark:text-white">
              No recent activity
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-[200px] mx-auto">
              Operate tasks or create new users to view logs
            </p>
          </div>
        ) : (
          /* 4. Normal Activity List presentation */
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {activities.map((activity) => {
              const badgeVariant = getBadgeVariant(activity.status, activity.type);
              
              // Generate simple avatar character
              const avatarChar = activity.title ? activity.title.replace(/User\s+/i, '').charAt(0).toUpperCase() : 'A';
              
              // Dynamic color schemes for the list avatars
              const avatarColors = [
                'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
                'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
              ];
              // Assign a stable color index based on the title length
              const colorClass = avatarColors[activity.title.length % avatarColors.length];

              return (
                <div key={activity.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                    {/* Rounded Avatar Badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${colorClass}`}>
                      {avatarChar}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                        {activity.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-gray-500 dark:text-gray-400 text-xs">
                        <Clock size={12} className="shrink-0 text-gray-400" />
                        <span className="truncate">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action status Badge */}
                  <Badge variant={badgeVariant} className="shrink-0 select-none">
                    {activity.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
