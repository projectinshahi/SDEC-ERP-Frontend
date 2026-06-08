'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import {
  Calendar, Plus, X, CheckCircle2, Info, AlertTriangle,
  Search, Users, Clock, MapPin, Video, Edit, Trash2,
  CalendarDays, CheckCircle, ListTodo, Eye
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useProject } from '@/lib/context/ProjectContext';
import { MeetingDetailsModal } from '@/components/meetings/MeetingDetailsModal';
import {
  getMeetings as apiGetMeetings,
  createMeeting as apiCreateMeeting,
  updateMeeting as apiUpdateMeeting,
  deleteMeeting as apiDeleteMeeting,
  type Meeting,
} from '@/lib/api/meetings';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';

// ── Zod schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  meetingType: z.enum([
    'DAILY_STANDUP', 'SPRINT_PLANNING', 'SPRINT_REVIEW',
    'RETROSPECTIVE', 'CLIENT_MEETING', 'INTERNAL_DISCUSSION',
    'BUG_REVIEW', 'EMERGENCY_MEETING', 'OTHER',
  ]),
  meetingDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.string().min(1, 'Duration is required'),
  customDuration: z.string().optional(),
  meetingLink: z.string().optional(),
  attendees: z.string().optional(),
}).refine(data => data.duration !== 'CUSTOM' || (data.customDuration && parseInt(data.customDuration) > 0), {
  message: 'Valid custom duration is required',
  path: ['customDuration'],
});
type FormData = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  DAILY_STANDUP: 'Daily Standup', SPRINT_PLANNING: 'Sprint Planning',
  SPRINT_REVIEW: 'Sprint Review', RETROSPECTIVE: 'Retrospective',
  CLIENT_MEETING: 'Client Meeting', INTERNAL_DISCUSSION: 'Internal Discussion',
  BUG_REVIEW: 'Bug Review', EMERGENCY_MEETING: 'Emergency', OTHER: 'Other',
};
const TYPE_COLORS: Record<string, string> = {
  DAILY_STANDUP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  SPRINT_PLANNING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  SPRINT_REVIEW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  RETROSPECTIVE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  CLIENT_MEETING: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  INTERNAL_DISCUSSION: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  BUG_REVIEW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  EMERGENCY_MEETING: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  UPCOMING: 'info', ONGOING: 'warning', COMPLETED: 'success', CANCELLED: 'default',
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400';

// ── Component ─────────────────────────────────────────────────────────────────
export default function MeetingsClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { activeProject } = useProject();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Attendees multi-select state — array of user IDs
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { meetingType: 'DAILY_STANDUP', duration: '30' },
  });

  const watchStartTime = watch('startTime');
  const watchDuration = watch('duration');
  const watchCustomDuration = watch('customDuration');

  // Calculate dynamic end time for display
  const dynamicEndTime = useMemo(() => {
    if (!watchStartTime || !watchDuration) return '';
    const dur = watchDuration === 'CUSTOM' ? parseInt(watchCustomDuration || '0') : parseInt(watchDuration);
    if (isNaN(dur) || dur <= 0) return '';
    const [h, m] = watchStartTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const d = new Date();
    d.setHours(h, m + dur);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, [watchStartTime, watchDuration, watchCustomDuration]);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [mtgs, usrs] = await Promise.all([
        apiGetMeetings(),
        fetchUsers().catch(() => [] as UserDbResponse[]),
      ]);
      setMeetings(mtgs);
      setUsers(usrs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load meetings from server.';
      console.error('Failed to load meetings:', err);
      setLoadError(msg);
      toast('Failed to load meetings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadAll(); }, []);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const processedMeetings = useMemo(() => {
    return meetings.map(m => {
      const dateStr = m.meetingDate.split('T')[0];
      const start = new Date(`${dateStr}T${m.startTime}:00`);
      let computedStatus = 'UPCOMING';
      if (m.endTime) {
        const end = new Date(`${dateStr}T${m.endTime}:00`);
        if (now < start) computedStatus = 'UPCOMING';
        else if (now >= start && now <= end) computedStatus = 'ONGOING';
        else computedStatus = 'COMPLETED';
      } else {
        if (now < start) computedStatus = 'UPCOMING';
        else computedStatus = 'ONGOING';
      }
      return { ...m, computedStatus };
    });
  }, [meetings, now]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = processedMeetings.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      m.title.toLowerCase().includes(q) ||
      (m.description ?? '').toLowerCase().includes(q) ||
      (m.project?.name ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === 'ALL' || m.meetingType === typeFilter;
    const matchStatus = statusFilter === 'ALL' || m.computedStatus === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: processedMeetings.length,
    scheduled: processedMeetings.filter(m => m.computedStatus === 'UPCOMING').length,
    completed: processedMeetings.filter(m => m.computedStatus === 'COMPLETED').length,
    actionItems: processedMeetings.reduce((n, m) => n + (m.actionItems?.filter(a => a.status === 'OPEN').length ?? 0), 0),
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    // Check if we have an active project
    if (!activeProject) {
      toast('Please select a project from the sidebar to create meetings', 'warning');
      return;
    }

    setEditingMeeting(null);
    setSelectedAttendees([]);
    reset({
      title: '', description: '', meetingType: 'DAILY_STANDUP',
      meetingDate: '', startTime: '', duration: '30', customDuration: '', meetingLink: '',
      attendees: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (m: Meeting) => {
    setEditingMeeting(m);
    setSelectedAttendees(Array.isArray(m.attendees) ? m.attendees.map(Number) : []);
    const start = new Date(`1970-01-01T${m.startTime}:00Z`);
    const end = new Date(`1970-01-01T${m.endTime}:00Z`);
    let diff = (end.getTime() - start.getTime()) / 60000;
    if (diff <= 0) diff += 24 * 60;
    const durStr = ['15', '30', '45', '60', '120'].includes(String(diff)) ? String(diff) : 'CUSTOM';
    const customDurStr = durStr === 'CUSTOM' ? String(diff) : '';

    reset({
      title: m.title,
      description: m.description ?? '',
      meetingType: m.meetingType as FormData['meetingType'],
      meetingDate: m.meetingDate.split('T')[0],
      startTime: m.startTime,
      duration: durStr,
      customDuration: customDurStr,
      meetingLink: m.meetingLink ?? '',
      attendees: (m.attendees ?? []).join(', '),
    });
    setIsModalOpen(true);
  };

  const openDetails = (m: Meeting) => {
    setSelectedMeeting(m);
    setIsDetailsModalOpen(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    // Validate active project exists for new meetings
    if (!editingMeeting && !activeProject) {
      toast('Please select a project from the sidebar', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const dur = data.duration === 'CUSTOM' ? parseInt(data.customDuration || '0') : parseInt(data.duration);
      const [h, m] = data.startTime.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m + dur);
      const computedEndTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      if (editingMeeting) {
        const updated = await apiUpdateMeeting(editingMeeting.id, {
          title: data.title,
          description: data.description || undefined,
          meetingType: data.meetingType,
          meetingDate: data.meetingDate,
          startTime: data.startTime,
          endTime: computedEndTime,
          meetingLink: data.meetingLink || undefined,
          attendees: selectedAttendees,
        });
        setMeetings(p => p.map(m => m.id === editingMeeting.id ? updated : m));
        toast(`"${data.title}" updated successfully!`, 'success');
      } else {
        // Build payload, excluding undefined values
        const payload: any = {
          title: data.title,
          projectId: activeProject!.id,
          meetingType: data.meetingType,
          meetingDate: data.meetingDate, // Should be YYYY-MM-DD format from input[type="date"]
          startTime: data.startTime,     // Should be HH:MM format from input[type="time"]
          endTime: computedEndTime,      // Should be HH:MM format
          attendees: selectedAttendees,  // Array of user IDs
        };

        // Only add optional fields if they have values
        if (data.description && data.description.trim()) {
          payload.description = data.description.trim();
        }
        if (data.meetingLink && data.meetingLink.trim()) {
          payload.meetingLink = data.meetingLink.trim();
        }

        const created = await apiCreateMeeting(payload);
        setMeetings(p => [created, ...p]);
        toast(`"${data.title}" created successfully!`, 'success');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save meeting.';
      console.error('Save meeting error:', err);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteMeeting = async (meeting: Meeting) => {
    const confirmed = await confirm({
      title: 'Delete Meeting',
      message: `Are you sure you want to permanently delete "${meeting.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });

    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await apiDeleteMeeting(meeting.id);
      setMeetings((prev) => prev.filter((item) => item.id !== meeting.id));
      toast(`"${meeting.title}" deleted successfully.`, 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete meeting.';
      toast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Dashboard', href: ROUTES.DASHBOARD }, { label: 'Meetings' }]} />
      </div>

      {/* Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2.5">
            <Calendar className="text-blue-500 w-8 h-8" />
            Meeting Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm max-w-xl leading-relaxed">
            Manage project meetings, attendees, schedules, and action items.
          </p>
          {!activeProject && (
            <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Info size={14} />
              <span className="text-xs font-medium">Select a project from the sidebar to create meetings</span>
            </div>
          )}
        </div>
        <Button 
          variant={activeProject ? "primary" : "secondary"} 
          size="lg" 
          onClick={openCreate} 
          className="self-start sm:self-center"
          disabled={!activeProject}
          title={!activeProject ? "Select a project from the sidebar to create meetings" : "Create a new meeting"}
        >
          <Plus size={18} />
          Create Meeting
        </Button>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Meetings', value: stats.total, icon: CalendarDays, from: 'from-blue-50', to: 'to-blue-100', border: 'border-blue-200', text: 'text-blue-700', sub: 'text-blue-600', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
          { label: 'Scheduled', value: stats.scheduled, icon: Clock, from: 'from-purple-50', to: 'to-purple-100', border: 'border-purple-200', text: 'text-purple-700', sub: 'text-purple-600', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, from: 'from-green-50', to: 'to-green-100', border: 'border-green-200', text: 'text-green-700', sub: 'text-green-600', iconBg: 'bg-green-500/10', iconColor: 'text-green-600' },
          { label: 'Open Action Items', value: stats.actionItems, icon: ListTodo, from: 'from-orange-50', to: 'to-orange-100', border: 'border-orange-200', text: 'text-orange-700', sub: 'text-orange-600', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, from, to, border, text, sub, iconBg, iconColor }) => (
          <Card key={label} className={classNames('bg-gradient-to-br dark:from-gray-800 dark:to-gray-800/80 dark:border-gray-700/50', from, to, border)}>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className={classNames('text-xs font-semibold uppercase tracking-wide dark:text-gray-400', sub)}>{label}</p>
                <p className={classNames('text-3xl font-bold mt-2 dark:text-gray-100', text)}>{value}</p>
              </div>
              <div className={classNames('w-12 h-12 rounded-full flex items-center justify-center dark:bg-white/5', iconBg)}>
                <Icon className={classNames('w-6 h-6 dark:text-gray-300', iconColor)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <section className="mb-6 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Search size={15} /></span>
          <input
            type="text"
            placeholder="Search by title, description or project..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={14} />
            </button>
          )}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer">
          <option value="ALL">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer">
          <option value="ALL">All Status</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="ONGOING">Ongoing</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </section>

      {/* Meetings Table */}
      <Card variant="outlined" className="overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
          <CalendarDays size={17} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Meetings</h2>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{filtered.length}</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 px-6 py-6">
            <TableSkeleton />
          </div>
        ) : loadError ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadAll}>Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-8">
            {!activeProject ? (
              <EmptyState
                icon={<Info size={32} className="text-amber-500" />}
                title="No project selected"
                description="Please select a project from the sidebar to view and manage meetings for that project."
              />
            ) : (
              <EmptyState
                icon={<Calendar size={32} className="text-blue-500" />}
                title="No meetings found"
                description={searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No meetings match your filters. Try adjusting your search.'
                  : `No meetings scheduled yet for ${activeProject.name}. Create your first meeting.`}
                actionLabel={!searchQuery && typeFilter === 'ALL' && statusFilter === 'ALL' ? 'Create Meeting' : undefined}
                onAction={!searchQuery && typeFilter === 'ALL' && statusFilter === 'ALL' ? openCreate : undefined}
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60">
                  {['Meeting Title', 'Type', 'Date', 'Start', 'End', 'Organizer', 'Status', 'Attendees', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer" onClick={() => openDetails(m)}>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <p className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer transition-colors" onClick={() => openDetails(m)}>{m.title}</p>
                      {m.project?.name && <p className="text-xs text-gray-400 mt-0.5">{m.project.name}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={classNames('px-2.5 py-1 rounded-full text-xs font-semibold', TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.OTHER)}>
                        {TYPE_LABELS[m.meetingType] ?? m.meetingType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-gray-400" />
                        {new Date(m.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{m.startTime}</div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{m.endTime}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(m.organizer?.name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{m.organizer?.name ?? `User #${m.organizerId}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={STATUS_VARIANT[m.computedStatus] ?? 'default'}>{m.computedStatus}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const ids = Array.isArray(m.attendees) ? m.attendees.map(Number) : [];
                          if (ids.length === 0) return <span className="text-xs text-gray-400 italic">None</span>;
                          const visible = ids.slice(0, 3);
                          const extra = ids.length - visible.length;
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="flex -space-x-2">
                                {visible.map(id => {
                                  const u = users.find(u => u.id === id);
                                  const initials = u ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : String(id);
                                  const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-green-500 to-green-600', 'from-pink-500 to-pink-600', 'from-orange-500 to-orange-600'];
                                  const color = colors[id % colors.length];
                                  return (
                                    <div key={id} title={u?.name ?? `User #${id}`}
                                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-gray-800 flex-shrink-0`}>
                                      {initials}
                                    </div>
                                  );
                                })}
                              </div>
                              {extra > 0 && (
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">+{extra}</span>
                              )}
                              <span className="text-xs text-gray-400 dark:text-gray-500">({ids.length})</span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetails(m)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all" title="Edit">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => void handleDeleteMeeting(m)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all" title="Delete">
                          <Trash2 size={14} />
                        </button>
                        {m.meetingLink && (
                          <a href={m.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-all" title="Join">
                            <Video size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Action Items */}
      {/* <Card variant="outlined" className="overflow-hidden mb-8"> */}
      {/* <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
          <ListTodo size={17} className="text-orange-500" />
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Open Action Items</h2>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">{stats.actionItems}</span>
        </div> */}
      {/* {(() => {
          const openItems: Array<{ meetingTitle: string; id: number; title: string; description: string | null; assignedTo: number; dueDate: string; status: string; priority: string; meetingId: number; createdAt: string; updatedAt: string; }> = meetings.flatMap(m =>
            (m.actionItems ?? []).filter(a => a.status !== 'COMPLETED').map(a => ({ ...a, meetingTitle: m.title }))
          );
          if (openItems.length === 0) return (
            <div className="py-12 flex flex-col items-center gap-2 text-center">
              <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">All caught up!</p>
              <p className="text-xs text-gray-400">No open action items.</p>
            </div>
          );
          const priorityColors: Record<string, string> = {
            HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
            MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          };
          const statusColors: Record<string, string> = {
            OPEN: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
            IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          };
          return (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {openItems.map(item => (
                <div key={item.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">From: {item.meetingTitle}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ml-5 sm:ml-0">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <CalendarDays size={11} />
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-semibold', priorityColors[item.priority] ?? priorityColors.MEDIUM)}>{item.priority}</span>
                    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-semibold', statusColors[item.status] ?? statusColors.OPEN)}>{item.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card> */}

      {/* Create / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { if (!isSubmitting) setIsModalOpen(false); }}
        title={editingMeeting ? 'Edit Meeting' : 'Create Meeting'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Active Project Display for Create */}
          {!editingMeeting && activeProject && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Creating meeting for: <span className="font-semibold">{activeProject.name}</span>
                </span>
              </div>
            </div>
          )}
          
          {/* Project Display for Edit */}
          {editingMeeting && editingMeeting.project && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project: <span className="font-semibold">{editingMeeting.project.name}</span>
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Meeting Title *</label>
            <input {...register('title')} placeholder="e.g. Sprint Planning Q2" className={inputCls} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea {...register('description')} rows={2} placeholder="Meeting agenda or purpose..." className={classNames(inputCls, 'resize-none')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Meeting Type *</label>
              <select {...register('meetingType')} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date *</label>
              <input {...register('meetingDate')} type="date" className={inputCls} />
              {errors.meetingDate && <p className="text-xs text-red-500 mt-1">{errors.meetingDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Time *</label>
              <input {...register('startTime')} type="time" className={inputCls} />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Duration *</label>
              <select {...register('duration')} className={inputCls}>
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="120">2 Hours</option>
                <option value="CUSTOM">Custom Duration</option>
              </select>
            </div>
          </div>
          {watchDuration === 'CUSTOM' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Custom Duration (Minutes) *</label>
                <input {...register('customDuration')} type="number" min="1" className={inputCls} placeholder="e.g. 90" />
                {errors.customDuration && <p className="text-xs text-red-500 mt-1">{errors.customDuration.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">End Time</label>
                <input value={dynamicEndTime} disabled className={classNames(inputCls, 'bg-gray-50 text-gray-500 cursor-not-allowed')} />
              </div>
            </div>
          )}
          {watchDuration !== 'CUSTOM' && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Calculated End Time:</span> {dynamicEndTime}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"><Video size={12} className="inline mr-1" />Meeting Link</label>
            <input {...register('meetingLink')} placeholder="https://zoom.us/j/..." className={inputCls} />
            {errors.meetingLink && <p className="text-xs text-red-500 mt-1">{errors.meetingLink.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <Users size={12} className="inline mr-1" />Attendees
              {selectedAttendees.length > 0 && (
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {selectedAttendees.length} selected
                </span>
              )}
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              {users.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-3 italic">No users available</p>
              ) : (
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                  {users.map(u => {
                    const checked = selectedAttendees.includes(u.id);
                    const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-green-500 to-green-600', 'from-pink-500 to-pink-600', 'from-orange-500 to-orange-600'];
                    const color = colors[u.id % colors.length];
                    return (
                      <label key={u.id}
                        className={classNames(
                          'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none',
                          checked
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        )}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedAttendees(prev =>
                              checked ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            )
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                        {checked && <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedAttendees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedAttendees.map(id => {
                  const u = users.find(u => u.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {u?.name ?? `User #${id}`}
                      <button type="button" onClick={() => setSelectedAttendees(p => p.filter(x => x !== id))}
                        className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
              {editingMeeting ? 'Update Meeting' : 'Save Meeting'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <MeetingDetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        meeting={selectedMeeting} 
      />

    </>
  );
}

