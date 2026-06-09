'use client';

import React, { useState } from 'react';

import { Activity, RefreshCw, AlertTriangle, Inbox, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ActivityRowSkeleton } from '../ui/Skeleton';
import { Modal } from '@/components/Modal';

import { ActivityLog } from '@/lib/api/activity';

export interface ActivityFeedProps {
  activities?: ActivityLog[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onClear?: () => void;
  isClearing?: boolean;
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};



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
  onClear,
  isClearing = false,
}: ActivityFeedProps) {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const ALLOWED_ACTIVITY_TYPES = [
    'project_created',
    'project_updated',
    'sprint_updated',
    'sprint_status_changed',
    'document_uploaded',
    'document_updated',
    'document_removed',
    'sprint_created',
    'board_created',
    'bug_created',
    'bug_updated',
    'bug_deleted',
    'meeting_created',
    'meeting_updated',
    'meeting_deleted',
    'blocker_created',
    'blocker_updated',
    'blocker_deleted',
    'attachment_uploaded',
    'attachment_removed'
  ];

  const filteredActivities = activities?.filter(a => ALLOWED_ACTIVITY_TYPES.includes(a.type)) || [];

  // Determine if feed is empty
  const isEmpty = filteredActivities.length === 0;

  // Map backend types to friendly statuses
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'project_created': return { label: 'New Project', variant: 'info' as any };
      case 'project_updated': return { label: 'Project Update', variant: 'info' as any };
      case 'project_deleted': return { label: 'Project Deleted', variant: 'danger' as any };
      case 'board_created': return { label: 'New Board', variant: 'info' as any };
      case 'board_deleted': return { label: 'Board Deleted', variant: 'danger' as any };
      case 'member_added': return { label: 'Member Added', variant: 'success' as any };
      case 'member_removed': return { label: 'Member Removed', variant: 'danger' as any };
      case 'column_created': return { label: 'Column Added', variant: 'success' as any };
      case 'column_deleted': return { label: 'Column Removed', variant: 'danger' as any };
      case 'task_created': return { label: 'New Task', variant: 'success' as any };
      case 'task_updated': return { label: 'Task Update', variant: 'warning' as any };
      case 'task_deleted': return { label: 'Task Deleted', variant: 'danger' as any };
      case 'user_created': return { label: 'User Created', variant: 'success' as any };
      case 'user_deleted': return { label: 'User Deleted', variant: 'danger' as any };
      case 'role_created': return { label: 'Role Created', variant: 'info' as any };
      case 'role_deleted': return { label: 'Role Deleted', variant: 'danger' as any };
      case 'sprint_created': return { label: 'Sprint/Board Added', variant: 'success' as any };
      case 'sprint_updated': return { label: 'Sprint Update', variant: 'warning' as any };
      case 'sprint_status_changed': return { label: 'Sprint Status', variant: 'info' as any };
      case 'sprint_deleted': return { label: 'Sprint Removed', variant: 'danger' as any };
      case 'document_uploaded': return { label: 'Doc Uploaded', variant: 'success' as any };
      case 'document_updated': return { label: 'Doc Update', variant: 'warning' as any };
      case 'document_removed': return { label: 'Doc Removed', variant: 'danger' as any };
      case 'bug_created': return { label: 'Bug Logged', variant: 'danger' as any };
      case 'bug_updated': return { label: 'Bug Update', variant: 'warning' as any };
      case 'bug_deleted': return { label: 'Bug Removed', variant: 'success' as any };
      case 'blocker_created': return { label: 'Ticket Logged', variant: 'danger' as any };
      case 'blocker_updated': return { label: 'Ticket Update', variant: 'warning' as any };
      case 'blocker_deleted': return { label: 'Ticket Removed', variant: 'success' as any };
      case 'meeting_created': return { label: 'Meeting Added', variant: 'success' as any };
      case 'meeting_updated': return { label: 'Meeting Update', variant: 'warning' as any };
      case 'meeting_deleted': return { label: 'Meeting Removed', variant: 'danger' as any };
      case 'attachment_uploaded': return { label: 'Attachment Added', variant: 'info' as any };
      case 'attachment_removed': return { label: 'Attachment Removed', variant: 'danger' as any };
      case 'mention': return { label: 'Mention', variant: 'warning' as any };
      default: return { label: 'System', variant: 'info' as any };
    }
  };

  const renderDescription = (text: string) => {
    // Highlight @Mentions
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => 
      part.startsWith('@') ? (
        <span key={i} className="text-indigo-600 dark:text-indigo-400 font-semibold">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <Card className="h-full border border-gray-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <CardHeader className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Recent Activity</h2>
        </div>
        {!isLoading && !isError && filteredActivities.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full shrink-0">
              {filteredActivities.length} total
            </span>
            {onClear && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsClearModalOpen(true)}
                isLoading={isClearing}
                className="text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 px-2 h-7"
              >
                Clear All
              </Button>
            )}
          </div>
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
            {filteredActivities.map((activity) => {
              const { label, variant } = getTypeConfig(activity.type);
              
              const isSystemEvent = ['system_job', 'cleanup', 'automated_sync', 'cron'].includes(activity.type);
              const actorName = activity.actor?.name || (isSystemEvent ? 'System' : 'Unknown User');
              const avatarChar = actorName.charAt(0).toUpperCase();
              
              const avatarColors = [
                'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
                'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
              ];
              const colorClass = avatarColors[actorName.length % avatarColors.length];

              return (
                <div key={activity.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors px-2 -mx-2 rounded-lg">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${colorClass}`}>
                      {avatarChar}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                        <span className="font-semibold">{actorName}</span>{' '}
                        <span className="text-gray-600 dark:text-gray-400 font-normal">
                          {renderDescription(activity.description)}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-gray-500 dark:text-gray-400 text-xs">
                        <Clock size={12} className="shrink-0 text-gray-400" />
                        <span className="truncate">{formatRelativeTime(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant={variant} className="shrink-0 select-none">
                    {label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Activity Feed"
        size="sm"
      >
        <div className="text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to clear your activity feed? This action cannot be undone.
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setIsClearModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              setIsClearModalOpen(false);
              onClear?.();
            }}
          >
            Yes, clear all
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
