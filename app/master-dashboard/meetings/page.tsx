'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Calendar, CalendarDays, Clock, CheckCircle, ListTodo, PlayCircle, CalendarClock,
  Search, X, Video, Eye, ChevronLeft, ChevronRight,
  Users, Building2, FileText, ExternalLink, AlignLeft, UserCircle,
} from 'lucide-react';
import { fetchMasterMeetings, type MasterMeeting } from '@/lib/api/masterModules';
import { useMasterResource, ModuleStateScreen } from '@/components/master/MasterKit';
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

// Per-module accents — data-driven so future modules (HR, Finance, …) get a
// colour automatically (falling back to gray) with no redesign here.
const MODULE_BADGE: Record<string, string> = {
  development: 'bg-blue-100 text-blue-700',
  sales: 'bg-emerald-100 text-emerald-700',
  hr: 'bg-amber-100 text-amber-700',
  finance: 'bg-rose-100 text-rose-700',
};
const moduleBadge = (m?: string | null) => MODULE_BADGE[(m || 'development').toLowerCase()] ?? 'bg-gray-100 text-gray-700';

/**
 * Module-aware module-specific calendar route, derived from the meeting's stored
 * `module` (no hardcoded per-module routes): Development lives at the root
 * /dashboard/meetings; every other module follows /dashboard/{module}/meetings.
 */
function meetingCalendarHref(module?: string | null): string {
  const m = (module || 'development').toLowerCase();
  return m === 'development' ? '/dashboard/meetings' : `/dashboard/${m}/meetings`;
}

/** Human duration from two "HH:mm" strings (wrapping past midnight). */
function durationLabel(start?: string, end?: string): string {
  if (!start || !end) return '—';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return '—';
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  if (!mins) return '—';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m} min`;
}

const filterCls = 'px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer';

export default function MasterMeetingsPage() {
  // Poll every 60s so meetings created anywhere (with their Google Meet links)
  // surface in the unified Founder calendar automatically — no manual refresh.
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterMeetings, { pollMs: 60000 });

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, charts, meetings } = data;

  // Build type counts from the typeDistribution chart data.
  const typeCounts: Record<string, number> = {};
  charts.typeDistribution.forEach((d) => {
    const key = Object.entries(TYPE_LABELS).find(([, v]) => v.toLowerCase() === d.label.toLowerCase())?.[0]
      ?? d.label.toUpperCase().replace(/\s+/g, '_');
    typeCounts[key] = d.value;
  });

  const statCards = [
    { label: 'Total Meetings', value: stats.total, icon: CalendarDays, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
    { label: 'Scheduled', value: stats.scheduled, icon: CalendarClock, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, iconBg: 'bg-green-500/10', iconColor: 'text-green-600' },
    { label: 'Ongoing', value: stats.ongoing, icon: PlayCircle, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600' },
    { label: 'Upcoming', value: stats.upcoming, icon: Clock, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600' },
    { label: 'Cancelled', value: stats.cancelled, icon: X, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-600' },
  ];

  return <MasterMeetingsContent statCards={statCards} typeCounts={typeCounts} meetings={meetings} />;
}

function MasterMeetingsContent({
  statCards, typeCounts, meetings,
}: {
  statCards: Array<{ label: string; value: number; icon: any; iconBg: string; iconColor: string }>;
  typeCounts: Record<string, number>;
  meetings: MasterMeeting[];
}) {
  const [selected, setSelected] = useState<MasterMeeting | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [organizerFilter, setOrganizerFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Module + organizer options derived from the live data (future-ready: a new
  // module's meetings make it appear in the filter automatically).
  const moduleOptions = useMemo(
    () => Array.from(new Set(meetings.map((m) => (m.module || 'development').toLowerCase()))).sort(),
    [meetings],
  );
  const organizerOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of meetings) if (m.organizer) map.set(m.organizer.id, m.organizer.name);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [meetings]);

  const filtered = useMemo(() => {
    let list = meetings;
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      list = list.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.project?.name?.toLowerCase().includes(q) ||
        m.context?.toLowerCase().includes(q) ||
        m.organizer?.name?.toLowerCase().includes(q) ||
        m.meetingType.toLowerCase().includes(q) ||
        m.participants?.some((p) => p.name.toLowerCase().includes(q)),
      );
    }
    if (moduleFilter !== 'ALL') list = list.filter((m) => (m.module || 'development') === moduleFilter);
    if (organizerFilter !== 'ALL') list = list.filter((m) => String(m.organizer?.id ?? '') === organizerFilter);
    if (typeFilter !== 'ALL') list = list.filter((m) => m.meetingType === typeFilter);
    if (statusFilter !== 'ALL') list = list.filter((m) => m.status === statusFilter);
    if (dateFrom) { const from = new Date(dateFrom); list = list.filter((m) => new Date(m.meetingDate) >= from); }
    if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); list = list.filter((m) => new Date(m.meetingDate) <= to); }
    return list;
  }, [meetings, searchInput, moduleFilter, organizerFilter, typeFilter, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeFilterCount =
    (moduleFilter !== 'ALL' ? 1 : 0) + (organizerFilter !== 'ALL' ? 1 : 0) + (typeFilter !== 'ALL' ? 1 : 0)
    + (statusFilter !== 'ALL' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const clearFilters = () => {
    setModuleFilter('ALL'); setOrganizerFilter('ALL'); setTypeFilter('ALL'); setStatusFilter('ALL');
    setDateFrom(''); setDateTo(''); setSearchInput(''); setPage(1);
  };

  return (
    <>
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Home', href: '/master-dashboard' }, { label: 'Meetings' }]} />
      </div>

      {/* Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="text-blue-500 w-8 h-8" />
            Meetings
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm max-w-xl leading-relaxed">
            Unified view of every meeting across all modules — Development, Sales and beyond.
          </p>
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

      {/* Meeting type analytics */}
      <Card className="!bg-white border !border-gray-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ListTodo size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Types</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5">
          {FEATURED_TYPES.map((t) => (
            <button key={t} onClick={() => { setTypeFilter(typeFilter === t ? 'ALL' : t); setPage(1); }}
              className={classNames('text-left rounded-xl border p-4 transition-all hover:shadow-sm',
                typeFilter === t ? 'border-blue-300 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300')}>
              <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', TYPE_COLORS[t])}>
                {TYPE_LABELS[t]}
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-3 tabular-nums">{typeCounts[t] ?? '—'}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Search + Filters */}
      <section className="mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Search size={15} /></span>
            <input
              type="text"
              placeholder="Search title, organizer, participant, project…"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 shadow-sm"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"><X size={14} /></button>
            )}
          </div>
          <select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }} className={classNames(filterCls, 'capitalize')}>
            <option value="ALL">All Modules</option>
            {moduleOptions.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
          </select>
          <select value={organizerFilter} onChange={(e) => { setOrganizerFilter(e.target.value); setPage(1); }} className={filterCls}>
            <option value="ALL">All Organizers</option>
            {organizerOptions.map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={filterCls}>
            <option value="ALL">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={filterCls}>
            <option value="ALL">All Status</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} title="From date" className={filterCls} />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} title="To date" className={filterCls} />
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap">
              <X size={13} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </section>

      {/* Meetings table — the Founder's single comprehensive view */}
      <Card className="overflow-hidden mb-8 !bg-white !border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <CalendarDays size={17} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Meetings</h2>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyMeetings hasFilters={!!searchInput || activeFilterCount > 0} />
        ) : (
          <>
            {/* Desktop / tablet: full table (horizontal scroll on narrow widths) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['Meeting Title', 'Module', 'Type', 'Organizer', 'Participants', 'Date', 'Time', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => setSelected(m)}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-blue-600 group-hover:underline transition-colors">{m.title}</p>
                        {m.context && <p className="text-xs text-gray-400 mt-0.5">{m.context}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap', moduleBadge(m.module))}>
                          {m.module || 'development'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap', TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.OTHER)}>
                          {TYPE_LABELS[m.meetingType] ?? m.meetingType}
                        </span>
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
                        <ParticipantStack participants={m.participants} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-gray-400" />
                          {new Date(m.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{formatTime(m.startTime)} – {formatTime(m.endTime)}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={STATUS_VARIANT[m.status] ?? 'default'}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <JoinButton link={m.meetingLink} />
                          <button type="button" onClick={() => setSelected(m)} title="View details"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: responsive cards preserving every field */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginated.map((m) => (
                <div key={m.id} className="p-4 active:bg-gray-50 transition-colors" onClick={() => setSelected(m)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-blue-600">{m.title}</p>
                      {m.context && <p className="text-xs text-gray-400 mt-0.5">{m.context}</p>}
                    </div>
                    <Badge variant={STATUS_VARIANT[m.status] ?? 'default'}>{m.status}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={classNames('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize', moduleBadge(m.module))}>
                      {m.module || 'development'}
                    </span>
                    <span className={classNames('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.OTHER)}>
                      {TYPE_LABELS[m.meetingType] ?? m.meetingType}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-gray-400" />
                      {new Date(m.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{formatTime(m.startTime)} – {formatTime(m.endTime)}</div>
                    <div className="flex items-center gap-1.5"><UserCircle size={13} className="text-gray-400" />{m.organizer?.name ?? 'Unknown User'}</div>
                    <div className="flex items-center gap-1.5"><Users size={13} className="text-gray-400" />{(m.participants?.length ?? 0)} participant{(m.participants?.length ?? 0) === 1 ? '' : 's'}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <JoinButton link={m.meetingLink} expanded />
                    <button type="button" onClick={() => setSelected(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
                      <Eye size={13} /> Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-gray-100 text-sm">
              <span className="text-gray-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"><ChevronLeft size={16} /></button>
                <span className="px-3 font-semibold text-gray-700">{safePage} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"><ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selected && <MeetingDrawer meeting={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function EmptyMeetings({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center"><Calendar size={28} className="text-blue-400" /></div>
      <p className="text-sm font-semibold text-gray-700">No meetings found</p>
      <p className="text-xs text-gray-400 max-w-xs">
        {hasFilters ? 'No meetings match your filters. Try adjusting your search.' : 'No meetings scheduled yet.'}
      </p>
    </div>
  );
}

/* ─────────────────────────── Table helpers ───────────────────────────────── */

/** Overlapping avatar stack for a meeting's participants (with a +N overflow). */
function ParticipantStack({ participants }: { participants?: { id: number; name: string }[] }) {
  if (!participants || participants.length === 0) return <span className="text-xs text-gray-400">—</span>;
  const shown = participants.slice(0, 3);
  const extra = participants.length - shown.length;
  return (
    <div className="flex items-center" title={participants.map((p) => p.name).join(', ')}>
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <span key={p.id}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {p.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      {extra > 0 && <span className="ml-1.5 text-xs font-medium text-gray-500 whitespace-nowrap">+{extra}</span>}
    </div>
  );
}

/**
 * Google Meet "Join" control. Renders an active green button when a link exists
 * (opens in a new tab) and a muted placeholder otherwise. `expanded` widens it
 * for the mobile card layout.
 */
function JoinButton({ link, expanded = false }: { link?: string | null; expanded?: boolean }) {
  if (!link) {
    return expanded
      ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-semibold text-gray-400">No link</span>
      : <span className="text-[11px] text-gray-300 italic px-1.5">No link</span>;
  }
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" title="Join Google Meet"
      className={classNames(
        'inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm transition',
        expanded ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1.5 text-xs',
      )}>
      <Video size={13} /> Join
    </a>
  );
}

/* ─────────────────────────── Details drawer ──────────────────────────────── */

function DrawerRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function MeetingDrawer({ meeting, onClose }: { meeting: MasterMeeting; onClose: () => void }) {
  const m = meeting;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={classNames('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize', moduleBadge(m.module))}>{m.module || 'development'}</span>
              <Badge variant={STATUS_VARIANT[m.status] ?? 'default'}>{m.status}</Badge>
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{m.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 shrink-0"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {m.meetingLink ? (
            <a href={m.meetingLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-sm transition">
              <Video size={16} /> Join Meeting
            </a>
          ) : (
            <div className="text-xs text-gray-400 text-center py-2.5 rounded-xl bg-gray-50">No Google Meet link for this meeting.</div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <DrawerRow icon={<CalendarDays size={15} />} label="Date" value={new Date(m.meetingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} />
            <DrawerRow icon={<Clock size={15} />} label="Time" value={`${formatTime(m.startTime)} – ${formatTime(m.endTime)} · ${durationLabel(m.startTime, m.endTime)}`} />
            <DrawerRow icon={<ListTodo size={15} />} label="Type" value={TYPE_LABELS[m.meetingType] ?? m.meetingType} />
            <DrawerRow icon={<Building2 size={15} />} label="Department" value={m.context || '—'} />
            <DrawerRow icon={<UserCircle size={15} />} label="Organizer" value={m.organizer?.name || 'Unknown'} />
          </div>

          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2"><Users size={14} /> Participants</p>
            {m.participants && m.participants.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {m.participants.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[9px] font-bold flex items-center justify-center">{p.name.charAt(0).toUpperCase()}</span>
                    {p.name}
                  </span>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No participants.</p>}
          </div>

          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2"><AlignLeft size={14} /> Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {m.description?.trim() || <span className="text-gray-400 italic">No description provided.</span>}
            </p>
          </div>

          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2"><FileText size={14} /> Attachments</p>
            <p className="text-sm text-gray-400 italic">No attachments available.</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Activity History</p>
            <ul className="space-y-2 text-xs text-gray-500">
              {m.createdAt && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Scheduled — {new Date(m.createdAt).toLocaleString()}</li>}
              {m.updatedAt && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Last updated — {new Date(m.updatedAt).toLocaleString()}</li>}
              {!m.createdAt && !m.updatedAt && <li className="text-gray-400 italic">No activity recorded.</li>}
            </ul>
          </div>

          <Link href={meetingCalendarHref(m.module)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition capitalize">
            <ExternalLink size={15} /> Open in {(m.module || 'development')} calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
