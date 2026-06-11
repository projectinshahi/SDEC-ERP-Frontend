import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { CalendarDays, Clock, Video, Info, User, FileText } from 'lucide-react';
import { MeetingNotesPanel } from './MeetingNotesPanel';
import { type Meeting } from '@/lib/api/meetings';
import { classNames } from '@/lib/utils';

interface MeetingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
}

const TYPE_LABELS: Record<string, string> = {
  DAILY_STANDUP: 'Daily Standup', SPRINT_PLANNING: 'Sprint Planning',
  SPRINT_REVIEW: 'Sprint Review', RETROSPECTIVE: 'Retrospective',
  CLIENT_MEETING: 'Client Meeting', INTERNAL_DISCUSSION: 'Internal Discussion',
  BUG_REVIEW: 'Bug Review', EMERGENCY_MEETING: 'Emergency', OTHER: 'Other',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  UPCOMING: 'info', ONGOING: 'warning', COMPLETED: 'success', CANCELLED: 'default',
};

export function MeetingDetailsModal({ isOpen, onClose, meeting }: MeetingDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');

  if (!meeting) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={meeting.title} size="xl">
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={classNames(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
        >
          <Info size={16} /> Overview
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={classNames(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'notes'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
        >
          <FileText size={16} /> Meeting Notes
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="outlined" className="p-4 bg-gray-50 dark:bg-gray-800/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Details</h4>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500">Project</span>
                    <span>{meeting.project?.name || meeting.projectId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500">Type</span>
                    <span>{TYPE_LABELS[meeting.meetingType] || meeting.meetingType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500">Status</span>
                    <Badge variant={STATUS_VARIANT[(meeting as any).computedStatus] || 'default'}>
                      {(meeting as any).computedStatus || meeting.status}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card variant="outlined" className="p-4 bg-gray-50 dark:bg-gray-800/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Schedule</h4>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-gray-400" />
                    <span>{new Date(meeting.meetingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>{meeting.startTime} - {meeting.endTime}</span>
                  </div>
                  {meeting.meetingLink && (
                    <div className="mt-4">
                      <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                        <Video size={16} />
                        Join Google Meet
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {meeting.description && (
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Description</h4>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {meeting.description}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                Attendees 
                <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {(meeting.attendees || []).length}
                </span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(meeting.attendees) && meeting.attendees.map(id => (
                  <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <User size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">User #{id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <MeetingNotesPanel meetingId={meeting.id} projectId={meeting.projectId} />
        )}
      </div>
    </Modal>
  );
}
