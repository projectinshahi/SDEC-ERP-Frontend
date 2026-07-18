'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, Bell, Pin, Clock, Megaphone, Plus, SlidersHorizontal, RefreshCw, Search,
} from 'lucide-react';
import { useMasterResource, ModuleLoading, StatCard } from '@/components/master/MasterKit';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { classNames } from '@/lib/utils';
import {
  fetchNoticeDashboard, fetchNotices, markNoticeRead, deleteNotice, updateNotice,
  deleteNoticeAttachment, acknowledgeNotice, publishNotice, archiveNotice,
  type NoticeDashboardData, type Notice, type NoticeScope,
} from '@/lib/api/notices';
import { NoticeCard } from '@/components/notice/NoticeCard';
import { CreateNoticeModal } from '@/components/notice/CreateNoticeModal';
import { NoticeCategoryModal } from '@/components/notice/NoticeCategoryModal';
import { NoticeDetailModal } from '@/components/notice/NoticeDetailModal';
import { NoticeReadReportModal } from '@/components/notice/NoticeReadReportModal';

export function NoticeClient() {
  return (
    <PermissionPageGuard require="notice.view">
      <NoticeDashboard />
    </PermissionPageGuard>
  );
}

function NoticeDashboard() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = isSuperAdmin || hasPermission('notice.create');
  const canManage = isSuperAdmin || hasPermission('notice.manage');
  const canManageCats = isSuperAdmin || hasPermission('notice.categories.manage');
  const currentUserId = user?.id != null ? Number(user.id) : null;

  // Owner-scoped management: Founder/SuperAdmin manages any notice; a manager
  // (notice.manage) manages ONLY notices they published. Backend enforces the
  // same rule — this just hides affordances the user can't use.
  const canManageNotice = useCallback(
    (n: Notice | null): boolean => {
      if (!n) return false;
      if (isSuperAdmin) return true;
      return hasPermission('notice.manage') && n.publishedBy?.id != null && n.publishedBy.id === currentUserId;
    },
    [isSuperAdmin, hasPermission, currentUserId],
  );

  const fetcher = useCallback(() => fetchNoticeDashboard(), []);
  const res = useMasterResource<NoticeDashboardData>(fetcher, { pollMs: 60_000 });

  // Local working copy → instant optimistic updates (opening clears unread) while
  // polling/refresh keeps it in sync with the server.
  const [data, setData] = useState<NoticeDashboardData | null>(null);
  // Ids opened this session but whose read-write may not have committed server-side
  // yet — re-applied on every server refresh so a poll landing before the read POST
  // commits can't flash the notice back into Unread.
  const readIds = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!res.data) return;
    const rid = readIds.current;
    if (rid.size === 0) { setData(res.data); return; }
    const clr = (arr: Notice[]) => arr.map((x) => (rid.has(x.id) ? { ...x, unread: false } : x));
    const unread = res.data.unread.filter((x) => !rid.has(x.id));
    const removed = res.data.unread.length - unread.length;
    setData({
      ...res.data,
      unread,
      pinned: clr(res.data.pinned),
      recent: clr(res.data.recent),
      expiring: clr(res.data.expiring),
      counts: { ...res.data.counts, unread: Math.max(0, res.data.counts.unread - removed) },
    });
    // Once the server itself no longer reports an id as unread, the read persisted —
    // stop tracking it so the set doesn't grow unbounded across the session.
    for (const id of [...rid]) if (!res.data.unread.some((x) => x.id === id)) rid.delete(id);
  }, [res.data]);

  const [publishOpen, setPublishOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [detail, setDetail] = useState<Notice | null>(null);
  const [reportNotice, setReportNotice] = useState<Notice | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Search + lifecycle scope + read/pinned filters. When ANY of these is active the
  // sectioned dashboard is replaced by a flat, filtered result list (fetched per scope).
  const [scope, setScope] = useState<NoticeScope>('active');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const flatMode = debouncedSearch.trim() !== '' || scope !== 'active' || readFilter !== 'all' || pinnedOnly;

  const [flatList, setFlatList] = useState<Notice[] | null>(null);
  const [flatLoading, setFlatLoading] = useState(false);
  const [flatRefreshTick, setFlatRefreshTick] = useState(0);
  useEffect(() => {
    if (!flatMode) { setFlatList(null); return; }
    let cancelled = false;
    setFlatLoading(true);
    fetchNotices(scope)
      .then((list) => { if (!cancelled) setFlatList(list); })
      .catch(() => { if (!cancelled) setFlatList([]); })
      .finally(() => { if (!cancelled) setFlatLoading(false); });
    return () => { cancelled = true; };
  }, [flatMode, scope, flatRefreshTick]);

  const patchFlat = (id: number, patch: Partial<Notice>) =>
    setFlatList((l) => (l ? l.map((x) => (x.id === id ? { ...x, ...patch } : x)) : l));
  const refreshAll = () => { res.refresh(); setFlatRefreshTick((t) => t + 1); };

  const byPriority = (arr: Notice[]) => (priorityFilter === 'all' ? arr : arr.filter((n) => n.priority === priorityFilter));

  const flatResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return (flatList ?? []).filter((n) => {
      const passSearch = !q || [
        n.title, n.publishedBy?.name, n.category?.name,
        (n.audience?.departments ?? []).join(' '), n.priority,
      ].some((f) => String(f ?? '').toLowerCase().includes(q));
      const passRead = readFilter === 'all' || (readFilter === 'unread' ? n.unread : !n.unread);
      const passPinned = !pinnedOnly || n.isPinned;
      const passPriority = priorityFilter === 'all' || n.priority === priorityFilter;
      return passSearch && passRead && passPinned && passPriority;
    });
  }, [flatList, debouncedSearch, readFilter, pinnedOnly, priorityFilter]);

  // Opening a notice marks it read (per user) and clears it optimistically: it
  // drops out of Unread and loses the unread accent in the other sections.
  const openNotice = (n: Notice) => {
    setDetail(n);
    if (n.unread) {
      readIds.current.add(n.id);
      markNoticeRead(n.id).catch(() => {});
      patchFlat(n.id, { unread: false });
      setData((prev) => {
        if (!prev) return prev;
        const clr = (arr: Notice[]) => arr.map((x) => (x.id === n.id ? { ...x, unread: false } : x));
        const wasUnread = prev.unread.some((x) => x.id === n.id);
        return {
          ...prev,
          unread: prev.unread.filter((x) => x.id !== n.id),
          pinned: clr(prev.pinned),
          recent: clr(prev.recent),
          expiring: clr(prev.expiring),
          counts: { ...prev.counts, unread: wasUnread ? Math.max(0, prev.counts.unread - 1) : prev.counts.unread },
        };
      });
    }
  };

  const handleDelete = async (n: Notice) => {
    const ok = await confirm({ title: 'Delete notice', message: `Delete "${n.title}"? This cannot be undone.`, confirmLabel: 'Delete', intent: 'danger' });
    if (!ok) return;
    try {
      await deleteNotice(n.id);
      toast('Notice deleted.', 'success');
      setDetail(null);
      setFlatList((l) => (l ? l.filter((x) => x.id !== n.id) : l));
      refreshAll();
    } catch { toast('Failed to delete notice.', 'error'); }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!detail) return;
    const ok = await confirm({
      title: 'Remove attachment',
      message: 'Remove this attachment? An uploaded file is permanently deleted. This cannot be undone.',
      confirmLabel: 'Remove', intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteNoticeAttachment(detail.id, attachmentId);
      setDetail((d) => (d ? { ...d, attachments: d.attachments.filter((a) => a.id !== attachmentId) } : d));
      refreshAll();
    } catch { toast('Failed to remove attachment.', 'error'); }
  };

  const handleAcknowledge = async (n: Notice) => {
    try {
      const { acknowledgedAt } = await acknowledgeNotice(n.id);
      // Acknowledging also reads the notice: clear unread + stamp ack, optimistically.
      readIds.current.add(n.id);
      patchFlat(n.id, { acknowledged: true, acknowledgedAt, unread: false });
      setDetail((d) => (d && d.id === n.id ? { ...d, acknowledged: true, acknowledgedAt, unread: false } : d));
      setData((prev) => {
        if (!prev) return prev;
        const mark = (arr: Notice[]) => arr.map((x) => (x.id === n.id ? { ...x, acknowledged: true, acknowledgedAt, unread: false } : x));
        const wasUnread = prev.unread.some((x) => x.id === n.id);
        return {
          ...prev,
          unread: prev.unread.filter((x) => x.id !== n.id),
          pinned: mark(prev.pinned), recent: mark(prev.recent), expiring: mark(prev.expiring),
          counts: { ...prev.counts, unread: wasUnread ? Math.max(0, prev.counts.unread - 1) : prev.counts.unread },
        };
      });
    } catch { toast('Failed to acknowledge notice.', 'error'); }
  };

  const handleTogglePin = async (n: Notice) => {
    try {
      await updateNotice(n.id, { isPinned: !n.isPinned });
      patchFlat(n.id, { isPinned: !n.isPinned });
      setDetail((d) => (d && d.id === n.id ? { ...d, isPinned: !n.isPinned } : d));
      refreshAll();
    } catch { toast('Failed to update notice.', 'error'); }
  };

  const handlePublish = async (n: Notice) => {
    try {
      await publishNotice(n.id);
      toast('Notice published.', 'success');
      patchFlat(n.id, { status: 'published' });
      setDetail((d) => (d && d.id === n.id ? { ...d, status: 'published' } : d));
      refreshAll();
    } catch { toast('Failed to publish notice.', 'error'); }
  };

  const handleArchive = async (n: Notice) => {
    const ok = await confirm({
      title: 'Archive notice',
      message: `Archive "${n.title}"? It leaves the active lists but is preserved — still searchable, with its read history and attachments intact.`,
      confirmLabel: 'Archive',
    });
    if (!ok) return;
    try {
      await archiveNotice(n.id);
      toast('Notice archived.', 'success');
      setDetail(null);
      refreshAll();
    } catch { toast('Failed to archive notice.', 'error'); }
  };

  if (res.isLoading && !data) return <ModuleLoading />;
  if (res.status === 'forbidden') {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center font-semibold text-amber-800">You do not have access to Notices.</div>;
  }
  if ((res.status === 'error' || !data) && !res.isLoading) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
        <p className="font-semibold text-rose-700">{res.errorMsg || 'Failed to load notices.'}</p>
        <button type="button" onClick={res.reload} className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">Retry</button>
      </div>
    );
  }
  if (!data) return null;

  const scopes: { key: NoticeScope; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'archived', label: 'Archived' },
    { key: 'expired', label: 'Expired' },
    ...(canCreate ? [{ key: 'drafts' as NoticeScope, label: 'Drafts' }] : []),
  ];

  const pill = (active: boolean) =>
    classNames('rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
      active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200');

  return (
    <div className="space-y-5">
      {/* Header — module identity (FileText/indigo) + actions. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FileText className="h-6 w-6 text-indigo-600" /> Notice</h1>
          <p className="mt-0.5 text-sm text-gray-500">Company notices and announcements.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageCats && (
            <button type="button" onClick={() => setCategoriesOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
              <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Categories</span>
            </button>
          )}
          <button type="button" onClick={refreshAll} disabled={res.isRefreshing} title="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-60">
            <RefreshCw className={classNames('h-4 w-4', res.isRefreshing && 'animate-spin')} />
          </button>
          {canCreate && (
            <button type="button" onClick={() => { setEditNotice(null); setPublishOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Publish Notice</span><span className="sm:hidden">Publish</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI tiles. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Unread" value={data.counts.unread} icon={Bell} tone="rose" alert={data.counts.unread > 0} />
        <StatCard label="Pinned" value={data.counts.pinned} icon={Pin} tone="indigo" />
        <StatCard label="Active Notices" value={data.counts.active} icon={Megaphone} tone="slate" />
        <StatCard label="Expiring Soon" value={data.counts.expiring} icon={Clock} tone="amber" alert={data.counts.expiring > 0} />
      </div>

      {/* Lifecycle scope tabs. */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200">
        {scopes.map((s) => (
          <button key={s.key} type="button" onClick={() => setScope(s.key)}
            className={classNames('relative -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition',
              scope === s.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Search + read/pinned filters. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title, publisher, category, dept…"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-8 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none" />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setReadFilter((f) => (f === 'unread' ? 'all' : 'unread'))} className={pill(readFilter === 'unread')}>Unread</button>
          <button type="button" onClick={() => setReadFilter((f) => (f === 'read' ? 'all' : 'read'))} className={pill(readFilter === 'read')}>Read</button>
          <button type="button" onClick={() => setPinnedOnly((v) => !v)} className={pill(pinnedOnly)}>Pinned</button>
        </div>
      </div>

      {/* Priority filter — narrows every section / the flat results. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Priority</span>
        {[
          { key: 'all', label: 'All' },
          { key: 'critical', label: 'Critical' },
          { key: 'high', label: 'High' },
          { key: 'medium', label: 'Medium' },
          { key: 'low', label: 'Low' },
        ].map((p) => (
          <button key={p.key} type="button" onClick={() => setPriorityFilter(p.key)} className={pill(priorityFilter === p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {flatMode ? (
        /* Flat, filtered results (search / archived / expired / drafts / read filters). */
        flatLoading && !flatList ? (
          <div className="py-12 text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-gray-300" /></div>
        ) : flatResults.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-400">
            No notices match your search and filters.
          </div>
        ) : (
          <div>
            <p className="mb-2 text-[11px] text-gray-400">{flatResults.length} {flatResults.length === 1 ? 'notice' : 'notices'}</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {flatResults.map((n) => <NoticeCard key={n.id} notice={n} onOpen={openNotice} />)}
            </div>
          </div>
        )
      ) : (
        /* Default sectioned view: Unread → Pinned → Recent → Expiring. */
        <>
          <Section title="Unread" icon={Bell} iconClass="text-rose-500" notices={byPriority(data.unread)} onOpen={openNotice}
            filtered={priorityFilter !== 'all'} emptyLabel="You're all caught up — no unread notices." />
          <Section title="Pinned" icon={Pin} iconClass="text-indigo-500" notices={byPriority(data.pinned)} onOpen={openNotice}
            filtered={priorityFilter !== 'all'} emptyLabel="No pinned notices." />
          <Section title="Recent" icon={Megaphone} iconClass="text-slate-500" notices={byPriority(data.recent)} onOpen={openNotice}
            filtered={priorityFilter !== 'all'} emptyLabel="No notices published yet." />
          <Section title="Expiring Soon" icon={Clock} iconClass="text-amber-500" notices={byPriority(data.expiring)} onOpen={openNotice}
            filtered={priorityFilter !== 'all'} emptyLabel="Nothing expiring in the next 7 days." />
        </>
      )}

      <CreateNoticeModal
        isOpen={publishOpen}
        editNotice={editNotice}
        canManage={canManage}
        onClose={() => { setPublishOpen(false); setEditNotice(null); }}
        onSaved={() => refreshAll()}
      />
      <NoticeCategoryModal isOpen={categoriesOpen} onClose={() => setCategoriesOpen(false)} onChanged={() => refreshAll()} />
      <NoticeDetailModal
        notice={detail}
        canManage={canManageNotice(detail)}
        onClose={() => setDetail(null)}
        onEdit={(n) => { setDetail(null); setEditNotice(n); setPublishOpen(true); }}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onDeleteAttachment={handleDeleteAttachment}
        onAcknowledge={handleAcknowledge}
        onPublish={handlePublish}
        onArchive={handleArchive}
        onViewReport={(n) => { setDetail(null); setReportNotice(n); }}
      />
      <NoticeReadReportModal
        isOpen={!!reportNotice}
        noticeId={reportNotice?.id ?? null}
        noticeTitle={reportNotice?.title}
        onClose={() => setReportNotice(null)}
      />
    </div>
  );
}

function Section({
  title, icon: Icon, iconClass, notices, onOpen, emptyLabel, filtered,
}: {
  title: string;
  icon: typeof Bell;
  iconClass: string;
  notices: Notice[];
  onOpen: (n: Notice) => void;
  emptyLabel: string;
  /** A priority filter is active — an empty section is due to the filter, not "done". */
  filtered?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
        <Icon className={classNames('h-4 w-4', iconClass)} /> {title}
        <span className="rounded-full bg-gray-100 px-1.5 text-[11px] font-bold text-gray-500">{notices.length}</span>
      </h2>
      {notices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
          {filtered ? 'No notices match this priority.' : emptyLabel}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {notices.map((n) => <NoticeCard key={n.id} notice={n} onOpen={onOpen} />)}
        </div>
      )}
    </section>
  );
}
