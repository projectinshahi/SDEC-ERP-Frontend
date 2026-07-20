'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Calendar, Plus, X, CheckCircle2, AlertTriangle, Search, Users, Clock,
  Video, Edit, Trash2, CalendarDays, CheckCircle, ListTodo, Eye, RefreshCw,
  ChevronLeft, ChevronRight, PlayCircle, CalendarClock,
} from 'lucide-react';
import { classNames, formatTime } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useProject } from '@/lib/context/ProjectContext';
import { MeetingDetailsModal } from '@/components/meetings/MeetingDetailsModal';
import {
  getMeetings as apiGetMeetings,
  getMeetingAnalytics as apiGetMeetingAnalytics,
  createMeeting as apiCreateMeeting,
  updateMeeting as apiUpdateMeeting,
  deleteMeeting as apiDeleteMeeting,
  type Meeting,
  type MeetingAnalytics,
  type MeetingPagination,
  type ActionItemInput,
} from '@/lib/api/meetings';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { fetchProjects } from '@/lib/api/projects';

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
  DAILY_STANDUP: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  SPRINT_PLANNING: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  SPRINT_REVIEW: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  RETROSPECTIVE: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  CLIENT_MEETING: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  INTERNAL_DISCUSSION: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  BUG_REVIEW: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  EMERGENCY_MEETING: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  UPCOMING: 'info', ONGOING: 'warning', COMPLETED: 'success', CANCELLED: 'default',
};
// The five featured types in the Meeting Type Analytics row.
const FEATURED_TYPES = ['SPRINT_PLANNING', 'RETROSPECTIVE', 'CLIENT_MEETING', 'SPRINT_REVIEW', 'BUG_REVIEW'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PAGE_SIZE = 10;

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500';
const filterCls = 'px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer';

const AVATAR_COLORS = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-green-500 to-green-600', 'from-pink-500 to-pink-600', 'from-orange-500 to-orange-600'];
const initialsOf = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

type ActionItemRow = { title: string; assignedTo: string; dueDate: string; priority: string };

// ── Component ─────────────────────────────────────────────────────────────────
export default function MeetingsClient() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { activeProject } = useProject();

  // Data
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pagination, setPagination] = useState<MeetingPagination>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters (server-side)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [organizerFilter, setOrganizerFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [actionItemRows, setActionItemRows] = useState<ActionItemRow[]>([]);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { meetingType: 'DAILY_STANDUP', duration: '30' },
  });

  const watchStartTime = watch('startTime');
  const watchDuration = watch('duration');
  const watchCustomDuration = watch('customDuration');

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

  // ── Debounce search ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiGetMeetings({
        search, type: typeFilter, status: statusFilter, projectId: projectFilter,
        organizerId: organizerFilter, dateFrom, dateTo, page, limit: PAGE_SIZE,
      });
      setMeetings(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load meetings from server.';
      setLoadError(msg);
      toast('Failed to load meetings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, statusFilter, projectFilter, organizerFilter, dateFrom, dateTo, page, toast]);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalytics(await apiGetMeetingAnalytics());
    } catch {
      /* keep last good analytics; cards fall back to em dash */
    }
  }, []);

  useEffect(() => { void loadMeetings(); }, [loadMeetings]);

  useEffect(() => {
    void loadAnalytics();
    fetchUsers().then(setUsers).catch(() => setUsers([]));
    fetchProjects().then((p) => setProjects(p.map((x) => ({ id: x.id, name: x.name })))).catch(() => setProjects([]));
  }, [loadAnalytics]);

  const refreshAll = useCallback(() => { void loadMeetings(); void loadAnalytics(); }, [loadMeetings, loadAnalytics]);

  const resetToFirstPage = () => setPage(1);

  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (projectFilter !== 'ALL' ? 1 : 0) +
    (organizerFilter !== 'ALL' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter('ALL'); setStatusFilter('ALL'); setProjectFilter('ALL');
    setOrganizerFilter('ALL'); setDateFrom(''); setDateTo(''); setSearchInput(''); setSearch(''); setPage(1);
  };

  // ── Stat / type cards ──────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Meetings', value: analytics?.totalMeetings, icon: CalendarDays, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
    { label: 'Scheduled', value: analytics?.scheduled, icon: CalendarClock, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600' },
    { label: 'Completed', value: analytics?.completed, icon: CheckCircle, iconBg: 'bg-green-500/10', iconColor: 'text-green-600' },
    { label: 'Open Action Items', value: analytics?.openActionItems, icon: ListTodo, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600' },
    { label: 'Ongoing', value: analytics?.ongoing, icon: PlayCircle, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600' },
    { label: 'Upcoming', value: analytics?.upcoming, icon: Clock, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600' },
  ];

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingMeeting(null);
    setSelectedAttendees([]);
    setActionItemRows([]);
    setSelectedProjectId(activeProject?.id ?? '');
    reset({ title: '', description: '', meetingType: 'DAILY_STANDUP', meetingDate: '', startTime: '', duration: '30', customDuration: '' });
    setIsModalOpen(true);
  };

  const openEdit = (m: Meeting) => {
    setEditingMeeting(m);
    setSelectedAttendees(Array.isArray(m.attendees) ? m.attendees.map(Number) : []);
    setActionItemRows([]);
    setSelectedProjectId(m.projectId);
    const start = new Date(`1970-01-01T${m.startTime}:00Z`);
    const end = new Date(`1970-01-01T${m.endTime}:00Z`);
    let diff = (end.getTime() - start.getTime()) / 60000;
    if (diff <= 0) diff += 24 * 60;
    const durStr = ['15', '30', '45', '60', '120'].includes(String(diff)) ? String(diff) : 'CUSTOM';
    reset({
      title: m.title,
      description: m.description ?? '',
      meetingType: m.meetingType as FormData['meetingType'],
      meetingDate: m.meetingDate.split('T')[0],
      startTime: m.startTime,
      duration: durStr,
      customDuration: durStr === 'CUSTOM' ? String(diff) : '',
    });
    setIsModalOpen(true);
  };

  const openDetails = (m: Meeting) => { setSelectedMeeting(m); setIsDetailsModalOpen(true); };

  // Action item rows
  const addActionItem = () => setActionItemRows(prev => [...prev, { title: '', assignedTo: '', dueDate: '', priority: 'MEDIUM' }]);
  const updateActionItem = (i: number, patch: Partial<ActionItemRow>) =>
    setActionItemRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeActionItem = (i: number) => setActionItemRows(prev => prev.filter((_, idx) => idx !== i));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    const projectId = editingMeeting ? editingMeeting.projectId : selectedProjectId;
    if (!editingMeeting && !projectId) {
      toast('Please select a project for this meeting', 'error');
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
        await apiUpdateMeeting(editingMeeting.id, {
          title: data.title,
          description: data.description || undefined,
          meetingType: data.meetingType,
          meetingDate: data.meetingDate,
          startTime: data.startTime,
          endTime: computedEndTime,
          attendees: selectedAttendees,
        });
        toast(`"${data.title}" updated successfully!`, 'success');
      } else {
        const actionItems: ActionItemInput[] = actionItemRows
          .filter(r => r.title.trim() && r.assignedTo)
          .map(r => ({
            title: r.title.trim(),
            assignedTo: Number(r.assignedTo),
            dueDate: r.dueDate || undefined,
            priority: r.priority,
          }));
        await apiCreateMeeting({
          title: data.title,
          projectId,
          meetingType: data.meetingType,
          meetingDate: data.meetingDate,
          startTime: data.startTime,
          endTime: computedEndTime,
          attendees: selectedAttendees,
          ...(data.description?.trim() ? { description: data.description.trim() } : {}),
          ...(actionItems.length ? { actionItems } : {}),
        });
        toast(`"${data.title}" created successfully!`, 'success');
      }
      setIsModalOpen(false);
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save meeting.';
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
      confirmLabel: 'Delete', cancelLabel: 'Cancel', intent: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiDeleteMeeting(meeting.id);
      toast(`"${meeting.title}" deleted successfully.`, 'info');
      refreshAll();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete meeting.', 'error');
    }
  };

  const statusOf = (m: Meeting) => m.computedStatus ?? m.status;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
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
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button onClick={refreshAll} title="Refresh"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <Button variant="primary" size="lg" onClick={openCreate} title="Create a new meeting">
            <Plus size={18} /> Create Meeting
          </Button>
        </div>
      </section>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <Card key={label} className="!bg-white !bg-none border !border-gray-200 shadow-sm">
            <div className="flex items-center justify-between p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</p>
                <p className="text-3xl font-bold mt-2 text-gray-900 tabular-nums">{value ?? '—'}</p>
              </div>
              <div className={classNames('w-12 h-12 rounded-full flex items-center justify-center shrink-0', iconBg)}>
                <Icon className={classNames('w-6 h-6', iconColor)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Meeting type analytics */}
      <Card className="!bg-white border !border-gray-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ListTodo size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Meetings by Type</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5">
          {FEATURED_TYPES.map((t) => (
            <button key={t} onClick={() => { setTypeFilter(t); resetToFirstPage(); }}
              className={classNames(
                'text-left rounded-xl border p-4 transition-all hover:shadow-sm',
                typeFilter === t ? 'border-blue-300 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300',
              )}>
              <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', TYPE_COLORS[t])}>
                {TYPE_LABELS[t]}
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-3 tabular-nums">{analytics?.meetingTypeCounts?.[t] ?? '—'}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <section className="mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Search size={15} /></span>
            <input
              type="text"
              placeholder="Search by title, project, description, organizer or type..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 shadow-sm"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); resetToFirstPage(); }} className={filterCls}>
            <option value="ALL">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); resetToFirstPage(); }} className={filterCls}>
            <option value="ALL">All Status</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <select value={projectFilter} onChange={e => { setProjectFilter(e.target.value); resetToFirstPage(); }} className={classNames(filterCls, 'lg:max-w-[220px] w-full')}>
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={organizerFilter} onChange={e => { setOrganizerFilter(e.target.value); resetToFirstPage(); }} className={classNames(filterCls, 'lg:max-w-[220px] w-full')}>
            <option value="ALL">All Organizers</option>
            {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetToFirstPage(); }} className={filterCls} />
            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetToFirstPage(); }} className={filterCls} />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap">
              <X size={13} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </section>

      {/* Meetings table */}
      <Card variant="outlined" className="overflow-hidden mb-8 !bg-white !border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <CalendarDays size={17} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Meetings</h2>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{pagination.total}</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 px-6 py-6"><TableSkeleton /></div>
        ) : loadError ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={() => void loadMeetings()}>Retry</Button>
          </div>
        ) : meetings.length === 0 ? (
          <div className="px-6 py-8">
            <EmptyState
              icon={<Calendar size={32} className="text-blue-500" />}
              title="No meetings found"
              description={search || activeFilterCount > 0
                ? 'No meetings match your filters. Try adjusting your search.'
                : 'No meetings scheduled yet. Create your first meeting.'}
              actionLabel={!search && activeFilterCount === 0 ? 'Create Meeting' : undefined}
              onAction={!search && activeFilterCount === 0 ? openCreate : undefined}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['Meeting Title', 'Type', 'Date', 'Start', 'End', 'Organizer', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {meetings.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => openDetails(m)}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-blue-600 group-hover:underline transition-colors">{m.title}</p>
                        {m.project?.name && <p className="text-xs text-gray-400 mt-0.5">{m.project.name}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap', TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.OTHER)}>
                          {TYPE_LABELS[m.meetingType] ?? m.meetingType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-gray-400" />
                          {new Date(m.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{formatTime(m.startTime)}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{formatTime(m.endTime)}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(m.organizer?.name ?? 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{m.organizer?.name ?? 'Unknown User'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={STATUS_VARIANT[statusOf(m)] ?? 'default'}>{statusOf(m)}</Badge>
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetails(m)} title="View"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(m)} title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => void handleDeleteMeeting(m)} title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            <Trash2 size={14} />
                          </button>
                          {m.meetingLink && (
                            <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" title="Join Meeting"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all">
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

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-gray-100 text-sm">
              <span className="text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}
                –{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-semibold text-gray-700">{pagination.page} / {pagination.totalPages}</span>
                <button onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))} disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { if (!isSubmitting) setIsModalOpen(false); }}
        title={editingMeeting ? 'Edit Meeting' : 'Create Meeting'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Project */}
          {editingMeeting ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Project: <span className="font-semibold">{editingMeeting.project?.name ?? editingMeeting.projectId}</span></span>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project *</label>
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={inputCls}>
                <option value="">Select a project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {!selectedProjectId && <p className="text-xs text-amber-600 mt-1">A project is required to create a meeting.</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meeting Title *</label>
            <input {...register('title')} placeholder="e.g. Sprint 16 Planning" className={inputCls} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea {...register('description')} rows={2} placeholder="Meeting agenda or purpose..." className={classNames(inputCls, 'resize-none')} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meeting Type *</label>
            <select {...register('meetingType')} className={inputCls}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date *</label>
              <input {...register('meetingDate')} type="date" className={inputCls} />
              {errors.meetingDate && <p className="text-xs text-red-500 mt-1">{errors.meetingDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time *</label>
              <input {...register('startTime')} type="time" className={inputCls} />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duration *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Custom Duration (Minutes) *</label>
                <input {...register('customDuration')} type="number" min="1" className={inputCls} placeholder="e.g. 90" />
                {errors.customDuration && <p className="text-xs text-red-500 mt-1">{errors.customDuration.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                <input value={dynamicEndTime ? formatTime(dynamicEndTime) : ''} disabled className={classNames(inputCls, 'bg-gray-50 text-gray-500 cursor-not-allowed')} />
              </div>
            </div>
          )}
          {watchDuration !== 'CUSTOM' && dynamicEndTime && (
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">Calculated End Time:</span> {formatTime(dynamicEndTime)}
              <div className="text-xs text-blue-600 flex items-center gap-1.5 mt-2 bg-blue-50 p-2 rounded-lg">
                <Video size={14} /> A Google Meet link will be automatically generated.
              </div>
            </div>
          )}

          {/* Attendees */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <Users size={12} className="inline mr-1" />Attendees
              {selectedAttendees.length > 0 && (
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{selectedAttendees.length} selected</span>
              )}
            </label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {users.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-3 italic">No users available</p>
              ) : (
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-100">
                  {users.map(u => {
                    const checked = selectedAttendees.includes(u.id);
                    const color = AVATAR_COLORS[u.id % AVATAR_COLORS.length];
                    return (
                      <label key={u.id} className={classNames('flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none', checked ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                        <input type="checkbox" checked={checked}
                          onChange={() => setSelectedAttendees(prev => checked ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                          {initialsOf(u.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                        {checked && <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action items (create only — stored in DB with the meeting) */}
          {!editingMeeting && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700"><ListTodo size={12} className="inline mr-1" />Action Items</label>
                <button type="button" onClick={addActionItem} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  <Plus size={13} /> Add Item
                </button>
              </div>
              {actionItemRows.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No action items. Add follow-up tasks for this meeting.</p>
              ) : (
                <div className="space-y-2">
                  {actionItemRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-gray-50 border border-gray-200 rounded-lg p-2">
                      <input value={row.title} onChange={e => updateActionItem(i, { title: e.target.value })}
                        placeholder="Action item title" className={classNames(inputCls, 'sm:col-span-4 !py-1.5')} />
                      <select value={row.assignedTo} onChange={e => updateActionItem(i, { assignedTo: e.target.value })}
                        className={classNames(inputCls, 'sm:col-span-3 !py-1.5')}>
                        <option value="">Assignee…</option>
                        {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                      </select>
                      <input type="date" value={row.dueDate} onChange={e => updateActionItem(i, { dueDate: e.target.value })}
                        className={classNames(inputCls, 'sm:col-span-2 !py-1.5')} />
                      <select value={row.priority} onChange={e => updateActionItem(i, { priority: e.target.value })}
                        className={classNames(inputCls, 'sm:col-span-2 !py-1.5')}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                      </select>
                      <button type="button" onClick={() => removeActionItem(i)} title="Remove"
                        className="sm:col-span-1 inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-gray-100">
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
        onUpdate={async (meetingId, updates) => {
          const payload = { ...updates, description: updates.description === null ? undefined : updates.description };
          await apiUpdateMeeting(meetingId, payload as any);
          setSelectedMeeting(prev => prev ? { ...prev, ...updates } : null);
          refreshAll();
        }}
        users={users}
      />
    </>
  );
}
