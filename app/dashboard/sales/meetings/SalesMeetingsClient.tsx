'use client';

/**
 * Sales Meetings — list workspace.
 *
 * Mirrors the Development MeetingsClient layout/UX (analytics cards, by-type row,
 * filter bar, server-side meetings table, pagination, create/edit + details +
 * delete-confirm modals) but for the Sales module: no project, plus Sales
 * linkages (Customer/Lead/Deal/Team). RBAC: page gated sales.meetings.view;
 * schedule = sales.meetings.create|schedule; edit = sales.meetings.edit;
 * delete = sales.meetings.delete.
 *
 * The Development reference has no calendar view (it is a list/table only), so we
 * mirror that and provide the list view only.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Calendar, Plus, X, Search, Clock, Video, Edit, Trash2, CalendarDays,
  CheckCircle, ListTodo, Eye, RefreshCw, ChevronLeft, ChevronRight,
  PlayCircle, CalendarClock, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { SalesMeetingModal } from '@/components/sales/meetings/SalesMeetingModal';
import { SalesMeetingDetailsModal } from '@/components/sales/meetings/SalesMeetingDetailsModal';
import { classNames, formatTime } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  getSalesMeetings,
  getSalesMeetingAnalytics,
  deleteSalesMeeting,
  type SalesMeeting,
  type SalesMeetingAnalytics,
  type SalesMeetingPagination,
} from '@/lib/api/salesMeetings';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';

const TYPE_LABELS: Record<string, string> = {
  DAILY_STANDUP: 'Daily Standup', SPRINT_PLANNING: 'Sprint Planning',
  SPRINT_REVIEW: 'Sprint Review', RETROSPECTIVE: 'Retrospective',
  CLIENT_MEETING: 'Client Meeting', INTERNAL_DISCUSSION: 'Internal Discussion',
  BUG_REVIEW: 'Bug Review', EMERGENCY_MEETING: 'Emergency', OTHER: 'Other',
};
const TYPE_COLORS: Record<string, string> = {
  DAILY_STANDUP: 'bg-blue-100 text-blue-700',
  SPRINT_PLANNING: 'bg-purple-100 text-purple-700',
  SPRINT_REVIEW: 'bg-green-100 text-green-700',
  RETROSPECTIVE: 'bg-orange-100 text-orange-700',
  CLIENT_MEETING: 'bg-pink-100 text-pink-700',
  INTERNAL_DISCUSSION: 'bg-cyan-100 text-cyan-700',
  BUG_REVIEW: 'bg-red-100 text-red-700',
  EMERGENCY_MEETING: 'bg-rose-100 text-rose-700',
  OTHER: 'bg-gray-100 text-gray-700',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  UPCOMING: 'info', ONGOING: 'warning', COMPLETED: 'success', CANCELLED: 'default',
};
// Sales-relevant featured types in the "by type" row.
const FEATURED_TYPES = ['CLIENT_MEETING', 'INTERNAL_DISCUSSION', 'OTHER'];
const PAGE_SIZE = 10;

const filterCls = 'px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer';

function SalesMeetingsInner() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const canEdit = hasPermission('sales.meetings.edit');
  const canDelete = hasPermission('sales.meetings.delete');
  const canSchedule = hasAnyPermission(['sales.meetings.create', 'sales.meetings.schedule']);

  // Data
  const [meetings, setMeetings] = useState<SalesMeeting[]>([]);
  const [pagination, setPagination] = useState<SalesMeetingPagination>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [analytics, setAnalytics] = useState<SalesMeetingAnalytics | null>(null);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters (server-side)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [organizerFilter, setOrganizerFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<SalesMeeting | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<SalesMeeting | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getSalesMeetings({
        search, type: typeFilter, status: statusFilter,
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
  }, [search, typeFilter, statusFilter, organizerFilter, dateFrom, dateTo, page, toast]);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalytics(await getSalesMeetingAnalytics());
    } catch {
      /* keep last good analytics; cards fall back to em dash */
    }
  }, []);

  useEffect(() => { void loadMeetings(); }, [loadMeetings]);

  useEffect(() => {
    void loadAnalytics();
    fetchUsers('sales').then(setUsers).catch(() => setUsers([]));
  }, [loadAnalytics]);

  const refreshAll = useCallback(() => { void loadMeetings(); void loadAnalytics(); }, [loadMeetings, loadAnalytics]);

  const resetToFirstPage = () => setPage(1);

  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) +
    (organizerFilter !== 'ALL' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter('ALL'); setStatusFilter('ALL'); setOrganizerFilter('ALL');
    setDateFrom(''); setDateTo(''); setSearchInput(''); setSearch(''); setPage(1);
  };

  const statCards = [
    { label: 'Total Meetings', value: analytics?.totalMeetings, icon: CalendarDays, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
    { label: 'Scheduled', value: analytics?.scheduled, icon: CalendarClock, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600' },
    { label: 'Completed', value: analytics?.completed, icon: CheckCircle, iconBg: 'bg-green-500/10', iconColor: 'text-green-600' },
    { label: 'Open Action Items', value: analytics?.openActionItems, icon: ListTodo, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600' },
    { label: 'Ongoing', value: analytics?.ongoing, icon: PlayCircle, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600' },
    { label: 'Upcoming', value: analytics?.upcoming, icon: Clock, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600' },
  ];

  const openCreate = () => { setEditingMeeting(null); setIsModalOpen(true); };
  const openEdit = (m: SalesMeeting) => { setEditingMeeting(m); setIsModalOpen(true); };
  const openDetails = (m: SalesMeeting) => { setSelectedMeeting(m); setIsDetailsOpen(true); };

  const handleDelete = async (m: SalesMeeting) => {
    const ok = await confirm({
      title: 'Delete Meeting',
      message: `Are you sure you want to permanently delete "${m.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete', cancelLabel: 'Cancel', intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteSalesMeeting(m.id);
      toast(`"${m.title}" deleted successfully.`, 'info');
      refreshAll();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete meeting.', 'error');
    }
  };

  const statusOf = (m: SalesMeeting) => m.computedStatus ?? m.status;

  const linkedLabel = (m: SalesMeeting): string | null => {
    if (m.customer?.name) return m.customer.name;
    if (m.deal?.title) return m.deal.title;
    if (m.lead?.title) return m.lead.title;
    if (m.team?.name) return m.team.name;
    return null;
  };

  return (
    <>
      <div className="mb-6">
        <Breadcrumb items={[
          { label: 'Sales', href: '/dashboard/sales' },
          { label: 'Meetings' },
        ]} />
      </div>

      {/* Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="text-blue-500 w-8 h-8" />
            Sales Meetings
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm max-w-xl leading-relaxed">
            Schedule and manage client meetings, participants, agendas, and follow-up notes.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button onClick={refreshAll} title="Refresh"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <PermissionGuard requireAny={['sales.meetings.create', 'sales.meetings.schedule']}>
            <Button variant="primary" size="lg" onClick={openCreate} title="Schedule a new meeting">
              <Plus size={18} /> Schedule Meeting
            </Button>
          </PermissionGuard>
        </div>
      </section>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <Card key={label} className="!bg-white dark:!bg-gray-900 !bg-none border !border-gray-200 dark:!border-gray-800 shadow-sm">
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
      <Card className="!bg-white dark:!bg-gray-900 border !border-gray-200 dark:!border-gray-800 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ListTodo size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Meetings by Type</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5">
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
              placeholder="Search by title, description, organizer or type..."
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
      <Card variant="outlined" className="overflow-hidden mb-8 !bg-white dark:!bg-gray-900 !border-gray-200 dark:!border-gray-800">
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
                : 'No meetings scheduled yet. Schedule your first meeting.'}
              actionLabel={!search && activeFilterCount === 0 && canSchedule ? 'Schedule Meeting' : undefined}
              onAction={!search && activeFilterCount === 0 && canSchedule ? openCreate : undefined}
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
                        {linkedLabel(m) && <p className="text-xs text-gray-400 mt-0.5">{linkedLabel(m)}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap', TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.OTHER)}>
                          {TYPE_LABELS[m.meetingType] ?? m.meetingType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-gray-400" />
                          {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
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
                          {canEdit && (
                            <button onClick={() => openEdit(m)} title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => void handleDelete(m)} title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                              <Trash2 size={14} />
                            </button>
                          )}
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
      <SalesMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        meeting={editingMeeting}
        onSaved={refreshAll}
        users={users}
      />

      {/* Details Modal */}
      <SalesMeetingDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        meeting={selectedMeeting}
        users={users}
        canEditNotes={canEdit}
      />
    </>
  );
}

export default function SalesMeetingsClient() {
  return (
    <PermissionPageGuard require="sales.meetings.view">
      <SalesMeetingsInner />
    </PermissionPageGuard>
  );
}
