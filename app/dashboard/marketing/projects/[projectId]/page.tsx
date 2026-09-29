'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { use } from 'react';
import { CalendarDays, LayoutGrid, Archive, AlertTriangle } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AccessDenied } from '@/components/permissions/AccessDenied';
import { ProjectCalendar, CalendarEmptyState } from '@/components/marketing/ProjectCalendar';
import { EventFormModal, type EventDraft } from '@/components/marketing/EventFormModal';
import { ProjectBoard } from '@/components/marketing/ProjectBoard';
import { ContentFormModal } from '@/components/marketing/ContentFormModal';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { fetchContents, type MarketingContent } from '@/lib/api/marketingContent';
import {
  fetchProject, fetchProjectEvents,
  type MarketingProject, type MarketingEvent, type EventTypeOption,
} from '@/lib/api/marketingProjects';
import { type CalendarView, viewRange, todayYmd } from '@/lib/marketing/calendarDates';

/**
 * MK-001.1–.5 — one project's workspace: its calendar and its content board.
 *
 * EVERY fetch on this page is keyed by the project id from the route, and the
 * backend re-authorizes that id on each call. Switching projects changes the
 * route, which remounts this page — so one project's events or cards can never
 * be left on screen under another project's heading.
 */

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;
const errStatus = (e: unknown): number | undefined =>
  (e as { status?: number; details?: { status?: number } } | null)?.status;

type Tab = 'calendar' | 'board';

export default function ProjectWorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: raw } = use(params);
  const projectId = Number(raw);
  /* A non-numeric id ('/projects/not-an-id') is not a project that might exist —
   * it can never be one. Number() turns it into NaN, which used to be fetched as
   * '/projects/NaN' and left the workspace rendering empty with no explanation.
   * Catching it here means the URL is answered immediately and no request is
   * made for an id that cannot be valid. */
  const validId = Number.isInteger(projectId) && projectId > 0;
  const { toast } = useToast();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [tab, setTab] = useState<Tab>('calendar');
  const [project, setProject] = useState<MarketingProject | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [users, setUsers] = useState<UserDbResponse[]>([]);

  // Calendar
  const [view, setView] = useState<CalendarView>('month');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [canWriteEvents, setCanWriteEvents] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [draft, setDraft] = useState<EventDraft | null>(null);

  // Board
  const [cards, setCards] = useState<MarketingContent[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  /** null = closed; otherwise the stage key of the column the + was clicked in. */
  const [creatingIn, setCreatingIn] = useState<string | null>(null);

  const canCreateCards = isSuperAdmin || hasPermission('marketing.content.create');
  const canMoveCards = isSuperAdmin
    || hasPermission('marketing.content.move')
    || hasPermission('marketing.content.edit');
  const canArchiveCards = isSuperAdmin
    || hasPermission('marketing.content.delete')
    || hasPermission('marketing.content.edit');

  /* ── Project ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    if (!validId) {
      setDenied('Project not found.');
      setLoadingProject(false);
      return;
    }
    setLoadingProject(true);
    setDenied(null);
    (async () => {
      try {
        const p = await fetchProject(projectId);
        if (!cancelled) setProject(p);
      } catch (err) {
        if (cancelled) return;
        // A direct URL to somebody else's (or a deleted) project is answered
        // here, not by rendering an empty workspace.
        const status = errStatus(err);
        setDenied(apiError(err) || (status === 404 ? 'Project not found.' : 'You cannot open this project.'));
      } finally {
        if (!cancelled) setLoadingProject(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, validId]);

  useEffect(() => {
    fetchUsers('marketing').then(setUsers).catch(() => setUsers([]));
  }, []);

  /* ── Events (refetched whenever the visible range moves) ────────────────── */
  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetchProjectEvents(projectId, range.from, range.to);
      setEvents(res.events);
      setEventTypes(res.eventTypes);
      setCanWriteEvents(res.canWriteEvents);
    } catch (err) {
      setEvents([]);
      if (!denied) toast(apiError(err) || 'Unable to load calendar events', 'error');
    } finally {
      setLoadingEvents(false);
    }
  }, [projectId, range.from, range.to, denied, toast]);

  useEffect(() => { if (!denied) void loadEvents(); }, [loadEvents, denied]);

  /* ── Cards ──────────────────────────────────────────────────────────────── */
  const loadCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      // projectId is a SCOPE the server authorizes, not a client-side filter.
      setCards(await fetchContents({ projectId: String(projectId) }));
    } catch (err) {
      setCards([]);
      if (!denied) toast(apiError(err) || 'Unable to load content cards', 'error');
    } finally {
      setLoadingCards(false);
    }
  }, [projectId, denied, toast]);

  useEffect(() => { if (!denied) void loadCards(); }, [loadCards, denied]);

  if (loadingProject) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (denied || !project) {
    return <AccessDenied message={denied ?? 'Project not found.'} />;
  }

  const archived = project.status === 'archived';

  return (
    <div className="space-y-3">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-gray-400">
              {project.clientName ?? 'Client'}
            </p>
            <h1 className="flex items-center gap-2 truncate text-lg font-bold text-gray-900 dark:text-white">
              {project.name}
              {archived && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                  <Archive className="h-3 w-3" /> Archived
                </span>
              )}
            </h1>
            {project.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{project.description}</p>
            )}
          </div>

          <div role="tablist" aria-label="Project section"
            className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
            {([['calendar', 'Calendar', CalendarDays], ['board', 'Content Board', LayoutGrid]] as const).map(
              ([key, label, Icon]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={classNames(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    tab === key ? 'bg-cyan-600 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ),
            )}
          </div>
        </div>

        {archived && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            This project is archived. Its calendar and board are read-only.
          </p>
        )}
      </div>

      {/* ── Calendar ────────────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <>
          <ProjectCalendar
            view={view}
            anchor={anchor}
            events={events}
            loading={loadingEvents}
            canWrite={canWriteEvents && !archived}
            onViewChange={setView}
            onAnchorChange={setAnchor}
            onCreateAt={(date, time) => setDraft({ date, time })}
            onOpenEvent={(event) => setDraft({ event, date: event.date, time: event.startTime })}
          />
          {!loadingEvents && events.length === 0 && (
            <CalendarEmptyState
              canWrite={canWriteEvents && !archived}
              onCreate={() => setDraft({ date: todayYmd(), time: null })}
            />
          )}
        </>
      )}

      {/* ── Board ───────────────────────────────────────────────────────────── */}
      {tab === 'board' && (
        <ProjectBoard
          cards={cards}
          setCards={setCards}
          canMove={canMoveCards && !archived}
          canCreate={canCreateCards && !archived}
          canArchive={canArchiveCards && !archived}
          loading={loadingCards}
          onAddCard={(columnKey) => setCreatingIn(columnKey)}
          onMoved={() => { /* the optimistic update already reflects the move */ }}
        />
      )}

      {draft && (
      <EventFormModal
        key={draft.event ? `e${draft.event.id}` : `new-${draft.date}-${draft.time ?? 'allday'}`}
        isOpen
        onClose={() => setDraft(null)}
        projectId={projectId}
        draft={draft}
        eventTypes={eventTypes}
        users={users}
        canWrite={canWriteEvents && !archived}
        onSaved={() => void loadEvents()}
      />
      )}

      {/* The EXISTING card create modal — the project is attached server-side
          from the id passed here, so a card cannot be created under a project
          the caller cannot reach. */}
      {creatingIn && (
      <ContentFormModal
        key={creatingIn}
        isOpen
        onClose={() => setCreatingIn(null)}
        users={users}
        projectId={projectId}
        initialStage={creatingIn}
        onCreated={() => { setCreatingIn(null); void loadCards(); }}
      />
      )}
    </div>
  );
}
