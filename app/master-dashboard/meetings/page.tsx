'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar, CalendarDays, Clock, CheckCircle, ListTodo, PlayCircle, CalendarClock,
  Search, X, RefreshCw, Video, Eye, ChevronLeft, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { fetchMasterMeetings, type MasterMeeting } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen,
} from '@/components/master/MasterKit';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { classNames, formatTime } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
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
const FEATURED_TYPES = ['SPRINT_PLANNING', 'RETROSPECTIVE', 'CLIENT_MEETING', 'SPRINT_REVIEW', 'BUG_REVIEW'];
const PAGE_SIZE = 10;

const filterCls = 'px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer';

export default function MasterMeetingsPage() {
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterMeetings);

  // Client-side filters
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, charts, upcoming, activities } = data;

  // Build type counts from typeDistribution chart data
  const typeCounts: Record<string, number> = {};
  charts.typeDistribution.forEach(d => {
    // Match label to enum key — chart labels are human-readable
    const key = Object.entries(TYPE_LABELS).find(
      ([, v]) => v.toLowerCase() === d.label.toLowerCase()
    )?.[0] ?? d.label.toUpperCase().replace(/\s+/g, '_');
    typeCounts[key] = d.value;
  });

  // Stat cards matching the dashboard meetings page layout
  const statCards = [
    { label: 'Total Meetings', value: stats.total, icon: CalendarDays, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
    { label: 'Scheduled', value: stats.scheduled, icon: CalendarClock, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, iconBg: 'bg-green-500/10', iconColor: 'text-green-600' },
    { label: 'Open Action Items', value: 0, icon: ListTodo, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600' },
    { label: 'Ongoing', value: stats.ongoing, icon: PlayCircle, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600' },
    { label: 'Upcoming', value: stats.upcoming, icon: Clock, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600' },
  ];

  return <MasterMeetingsContent
    stats={stats}
    statCards={statCards}
    typeCounts={typeCounts}
    upcoming={upcoming}
    reload={reload}
    searchInput={searchInput}
    setSearchInput={setSearchInput}
    typeFilter={typeFilter}
    setTypeFilter={setTypeFilter}
    statusFilter={statusFilter}
    setStatusFilter={setStatusFilter}
    page={page}
    setPage={setPage}
  />;
}

// Separate component so hooks can be used normally
function MasterMeetingsContent({
  stats, statCards, typeCounts, upcoming, reload,
  searchInput, setSearchInput,
  typeFilter, setTypeFilter,
  statusFilter, setStatusFilter,
  page, setPage,
}: {
  stats: any;
  statCards: Array<{ label: string; value: number; icon: any; iconBg: string; iconColor: string }>;
  typeCounts: Record<string, number>;
  upcoming: MasterMeeting[];
  reload: () => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
}) {
  // Client-side filtering
  const filtered = useMemo(() => {
    let list = upcoming;

    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.project?.name?.toLowerCase().includes(q) ||
        m.organizer?.name?.toLowerCase().includes(q) ||
        m.meetingType.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'ALL') {
      list = list.filter(m => m.meetingType === typeFilter);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter(m => m.status === statusFilter);
    }

    return list;
  }, [upcoming, searchInput, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearchInput('');
    setPage(1);
  };

  const isLoading = false;

  return (
    <>
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Home', href: '/master-dashboard' }, { label: 'Dashboard', href: '/master-dashboard' }, { label: 'Meetings' }]} />
      </div>

      {/* Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="text-blue-500 w-8 h-8" />
            Meeting Management
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm max-w-xl leading-relaxed">
            Manage project meetings, attendees, schedules, and action items.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button onClick={reload} title="Refresh"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <RefreshCw size={16} />
          </button>
          <Link
            href="/dashboard/meetings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <ArrowUpRight size={16} /> Open Full Calendar
          </Link>
        </div>
      </section>

      {/* Analytics stat cards */}
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

      {/* Meeting type analytics — "TYPES" section */}
      <Card className="!bg-white border !border-gray-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ListTodo size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Types</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5">
          {FEATURED_TYPES.map((t) => (
            <button key={t} onClick={() => { setTypeFilter(typeFilter === t ? 'ALL' : t); setPage(1); }}
              className={classNames(
                'text-left rounded-xl border p-4 transition-all hover:shadow-sm',
                typeFilter === t ? 'border-blue-300 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300',
              )}>
              <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', TYPE_COLORS[t])}>
                {TYPE_LABELS[t]}
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-3 tabular-nums">{typeCounts[t] ?? '—'}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Search + Filters */}
      <section className="mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Search size={15} /></span>
            <input
              type="text"
              placeholder="Search by title, description or project..."
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 shadow-sm"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={filterCls}>
            <option value="ALL">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={filterCls}>
            <option value="ALL">All Status</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap">
              <X size={13} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </section>

      {/* Meetings table */}
      <Card className="overflow-hidden mb-8 !bg-white !border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <CalendarDays size={17} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Meetings</h2>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar size={28} className="text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No meetings found</p>
            <p className="text-xs text-gray-400 max-w-xs">
              {searchInput || activeFilterCount > 0
                ? 'No meetings match your filters. Try adjusting your search.'
                : 'No meetings scheduled yet.'}
            </p>
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
                  {paginated.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
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
                        <Badge variant={STATUS_VARIANT[m.status] ?? 'default'}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {m.meetingLink && (
                            <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" title="Join Meeting"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all">
                              <Video size={14} />
                            </a>
                          )}
                          <Link href="/dashboard/meetings" title="View in Full Calendar"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Eye size={14} />
                          </Link>
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
                Showing {(safePage - 1) * PAGE_SIZE + 1}
                –{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-semibold text-gray-700">{safePage} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
