'use client';

/**
 * SalesMeetingDetailsModal — 360° view of a Sales Meeting.
 *
 * Mirrors components/meetings/MeetingDetailsModal.tsx (Overview + Notes tabs) but
 * shows the Sales linkages (Customer / Lead / Deal / Team), a Google Meet "Join"
 * button when a meetingLink is present, the action-items list, and wires the Notes
 * tab to the Sales notes API via SalesMeetingNotesPanel. Notes write actions are
 * gated on `canEditNotes` (sales.meetings.edit).
 */

import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import {
  CalendarDays, Clock, Video, Info, User, FileText, Users,
  Briefcase, Target, Building2, ListTodo,
} from 'lucide-react';
import { classNames, formatTime } from '@/lib/utils';
import { SalesMeetingNotesPanel } from './SalesMeetingNotesPanel';
import type { SalesMeeting } from '@/lib/api/salesMeetings';
import type { UserDbResponse } from '@/lib/api/users';

interface SalesMeetingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: SalesMeeting | null;
  /** Sales users used to resolve participant names. */
  users?: UserDbResponse[];
  /** Whether the current user may add/edit/delete notes (sales.meetings.edit). */
  canEditNotes: boolean;
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

const PRIORITY_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  LOW: 'default', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger',
};

export function SalesMeetingDetailsModal({ isOpen, onClose, meeting, users = [], canEditNotes }: SalesMeetingDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');

  if (!meeting) return null;

  const status = meeting.computedStatus ?? meeting.status;
  const nameOf = (id: number) => users.find(u => u.id === id)?.name ?? `User #${id}`;
  const emailOf = (id: number) => users.find(u => u.id === id)?.email;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={meeting.title} size="xl">
      {/* Tabs */}
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
              {/* Details */}
              <Card variant="outlined" className="p-4 bg-gray-50 dark:bg-gray-800/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Details</h4>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500">Type</span>
                    <span>{TYPE_LABELS[meeting.meetingType] ?? meeting.meetingType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500">Status</span>
                    <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{status}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500">Organizer</span>
                    <span className="flex items-center gap-1.5">
                      <User size={14} className="text-gray-400" />
                      {meeting.organizer?.name ?? nameOf(meeting.organizerId)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Schedule */}
              <Card variant="outlined" className="p-4 bg-gray-50 dark:bg-gray-800/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Schedule</h4>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-gray-400" />
                    <span>
                      {meeting.meetingDate
                        ? new Date(meeting.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>{formatTime(meeting.startTime)} {' - '} {formatTime(meeting.endTime)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Video size={16} className="text-gray-400" />
                    {meeting.meetingLink ? (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                      >
                        <Video size={14} /> Join Google Meet
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No meeting link</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Sales linkages */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  <Building2 size={13} /> Customer
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{meeting.customer?.name ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  <Target size={13} /> Lead
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{meeting.lead?.title ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  <Briefcase size={13} /> Deal
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{meeting.deal?.title ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  <Users size={13} /> Team
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{meeting.team?.name ?? '—'}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Description</h4>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {meeting.description?.trim() || <span className="italic text-gray-400">No description provided.</span>}
              </div>
            </div>

            {/* Participants */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                Participants
                <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {(meeting.attendees || []).length}
                </span>
              </h4>
              {Array.isArray(meeting.attendees) && meeting.attendees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {meeting.attendees.map(id => (
                    <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300" title={emailOf(id)}>
                        {nameOf(id)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-gray-400">No participants added.</p>
              )}
            </div>

            {/* Action items */}
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                <ListTodo size={15} className="text-gray-400" /> Action Items
                <span className="ml-1 text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {(meeting.actionItems || []).length}
                </span>
              </h4>
              {Array.isArray(meeting.actionItems) && meeting.actionItems.length > 0 ? (
                <div className="space-y-2">
                  {meeting.actionItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {nameOf(item.assignedTo)}
                          {item.dueDate ? ` · Due ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={PRIORITY_VARIANT[item.priority] ?? 'default'}>{item.priority}</Badge>
                        <Badge variant={item.status === 'COMPLETED' || item.status === 'DONE' ? 'success' : 'default'}>{item.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-gray-400">No action items.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <SalesMeetingNotesPanel meetingId={meeting.id} canWrite={canEditNotes} />
        )}
      </div>
    </Modal>
  );
}
