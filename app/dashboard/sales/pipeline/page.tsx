'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Search, Plus, Upload, AlertTriangle, BarChart3, SlidersHorizontal, Clock, List, Columns3, Trash2, Download, Loader2, X } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/components/ConfirmDialogProvider';
import { apiClient } from '@/lib/api/api-client';
import { fetchLeadStages, fetchAssignableUsers, moveLeadStage, reorderLeadStages, deleteLead, createLeadStage, updateLeadStage, deleteLeadStage } from '@/lib/api/leads';
import { ImportLeadsModal } from '@/components/leads/ImportLeadsModal';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { StageTransitionDialog, type TransitionStep } from '@/components/leads/StageTransitionDialog';
import { LeadPipelineBoard } from '@/components/leads/LeadPipelineBoard';
import { StageFormModal } from '@/components/sales-execution/pipeline/StageFormModal';
import { DeleteStageModal } from '@/components/sales-execution/pipeline/DeleteStageModal';
import {
  LEAD_SOURCES,
  formatLeadSource,
  leadSourceVariant,
} from '@/lib/data/leadSources';
import { LeadHealthBadge } from '@/components/leads/LeadHealthBadge';
import { TEMPERATURE_OPTIONS } from '@/lib/data/leadTemperature';
import { DISTRICTS } from '@/lib/data/districts';
import { savePipelineState, readPipelineState } from '@/lib/utils/pipelineState';
import { formatINR } from '@/lib/utils/currency';
import { classNames } from '@/lib/utils';
import type { Lead, LeadStage, AssignableUser } from '@/lib/types/lead';
import { exportLeadReport, exportLeadWorkbook } from '@/lib/utils/exportLeadReport';
import { fetchPipelineReport } from '@/lib/api/salesReports';
import type { ReportWindow } from '@/lib/api/salesReports';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { InputField } from '@/components/ui/InputField';

interface Customer {
  id: number;
  name: string;
}

interface SourceAnalytics {
  totalLeads: number;
  totalWon: number;
  overallConversionRate: number;
  sources: {
    source: string;
    total: number;
    won: number;
    lost: number;
    conversionRate: number;
  }[];
}

// Statuses that take a lead OFF the pipeline board: it left the pipeline via an
// ACTION — `converted` (became a Deal) or `disqualified` (dead). These are the
// only action-driven terminal states. `won`/`lost`/`closed` are NOT here: those
// arise solely from dragging a card into a terminal column (moveLeadStage sets
// status = stage.toLowerCase()), so such a lead must STAY visible in that column.
// Keying on these two statuses (never on a stage⇄status match) keeps the board
// correct even when a column is renamed/deleted, which cascades stage but not
// status. Off-board leads remain visible in the table, which shows every status.
const OFF_BOARD_STATUSES = ['converted', 'disqualified'];

type ViewMode = 'table' | 'pipeline';

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<SourceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Background refetch (search / filter change) — results stay on screen.
  const [isFetching, setIsFetching] = useState(false);
  const hasLoadedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  // Single canonical Pipeline-stage filter for the table (sourced from the DB
  // `lead_stages` via `stages` — the SAME source the Kanban board renders).
  const [stageFilter, setStageFilter] = useState('all');
  // '' = not yet resolved. The Pipeline defaults to the SIGNED-IN user's own
  // Opportunities (CR-08/09), so this is seeded from auth (or the URL) once auth
  // settles — never rendered or fetched with an unresolved value.
  const [ownerFilter, setOwnerFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<ReportWindow>({ from: '', to: '' });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [stages, setStages] = useState<LeadStage[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Table ↔ Pipeline view (both render the SAME live `leads` dataset). The Kanban
  // board ('pipeline') is the DEFAULT working interface; ?view=table opts into the table.
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');

  // Stage-management modal state (Pipeline view).
  const [stageModal, setStageModal] = useState<{ mode: 'add' | 'rename'; stage: LeadStage | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadStage | null>(null);

  // Stage Transition Dialog — a pending drag/drop move awaiting checklist + notes.
  // The card is NOT moved until the user confirms (so cancel leaves it in place).
  const [transition, setTransition] = useState<{ lead: Lead; toStage: string } | null>(null);
  const [isSavingTransition, setIsSavingTransition] = useState(false);

  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const { user, isLoading: authLoading } = useAuth();
  // The signed-in user — the DEFAULT owner scope for the Pipeline.
  const meId = user?.id ? String(user.id) : '';
  // Granular Leads keys (the coarse→granular bridge in permission.utils means a
  // role holding the coarse sales.edit/delete/create still satisfies these).
  const canMove = hasPermission('sales.leads.edit');
  // Pipeline COLUMN management uses its own dedicated, independent permissions
  // (not lead edit/delete) — mirrors the Deals pipeline.
  const canManageStages = hasPermission('sales.leads.pipeline.manage');
  const canDeleteStages = hasPermission('sales.leads.pipeline.delete');
  // Lead deletion is its own permission, independent of view/create/edit. Drives
  // BOTH the table row action and the Kanban card delete control.
  const canDeleteLead = hasPermission('sales.leads.delete');
  const canCreate = hasPermission('sales.leads.create');
  // Lead Analytics is gated by its own independent permission (the Analytics
  // nav button must respect it just like the sidebar item + page guard).
  const canViewAnalytics = hasPermission('sales.leads.analytics');
  const canExportReport = hasPermission('sales.leads.export');
  // Seeing OTHER owners' opportunities is its own permission. Without it the
  // All/My toggle is hidden, the Owner filter disappears from the panel, and the
  // scope is pinned to self — the backend enforces the same rule, so this is
  // affordance-hiding, not the security boundary.
  const canViewAllLeads = hasPermission('sales.leads.view_all');
  
  const [isExporting, setIsExporting] = useState(false);

  // Every persisted Pipeline filter, in ONE place. Add a filter here and it is
  // automatically written to the URL, restored on refresh, and dropped by Clear
  // Filters — no per-filter persistence code anywhere else.
  // `empty` = the value that means "not applied"; `advanced` = lives in the More
  // Filters panel, so restoring it must re-open that panel.
  const persisted = [
    { key: 'search', value: searchQuery, set: setSearchQuery, empty: '' },
    { key: 'source', value: sourceFilter, set: setSourceFilter, empty: 'all' },
    { key: 'stage', value: stageFilter, set: setStageFilter, empty: 'all' },
    // `empty` is MY id, not 'all': my own Opportunities are the Pipeline's resting
    // state, so Clear All returns here and only an explicit "All Owners" (or another
    // user) is written to the URL as a deliberate deviation.
    { key: 'owner', value: ownerFilter, set: setOwnerFilter, empty: meId || 'all', advanced: true },
    { key: 'location', value: locationFilter, set: setLocationFilter, empty: '', advanced: true },
    { key: 'temperature', value: temperatureFilter, set: setTemperatureFilter, empty: 'all', advanced: true },
    { key: 'district', value: districtFilter, set: setDistrictFilter, empty: 'all', advanced: true },
  ];

  // Filter panel layout — grouped so a new filter slots into an existing section
  // instead of extending a flat row. Presentation only: every field reads/writes
  // the SAME state the queries already use, so the filtering engine is untouched.
  const ownerOptions = [
    { value: 'all', label: 'All Owners' },
    ...owners.map((o) => ({ value: String(o.id), label: String(o.id) === meId ? `${o.name} (me)` : o.name })),
  ];
  const FILTER_GROUPS: {
    title: string;
    fields: {
      label: string; value: string; set: (v: string) => void;
      options?: { value: string; label: string }[]; placeholder?: string;
    }[];
  }[] = [
    // Owner is only offered to users allowed to look beyond their own pipeline;
    // for everyone else the whole group would be a one-option no-op.
    ...(canViewAllLeads ? [{
      title: 'Ownership',
      fields: [{ label: 'Owner', value: ownerFilter, set: setOwnerFilter, options: ownerOptions }],
    }] : []),
    {
      title: 'Pipeline',
      fields: [
        // Stage narrows the TABLE only — the board groups by stage by design.
        ...(viewMode === 'table' ? [{
          label: 'Stage', value: stageFilter, set: setStageFilter,
          options: [{ value: 'all', label: 'All Stages' }, ...stages.map((s) => ({ value: s.name, label: s.name }))],
        }] : []),
        {
          label: 'Lead Status', value: temperatureFilter, set: setTemperatureFilter,
          options: [{ value: 'all', label: 'All Lead Statuses' }, ...TEMPERATURE_OPTIONS],
        },
        {
          label: 'Source', value: sourceFilter, set: setSourceFilter,
          options: [{ value: 'all', label: 'All Sources' }, ...LEAD_SOURCES.map((s) => ({ value: s, label: formatLeadSource(s) }))],
        },
      ],
    },
    {
      title: 'Organization',
      fields: [
        {
          label: 'District', value: districtFilter, set: setDistrictFilter,
          options: [{ value: 'all', label: 'All Districts' }, ...DISTRICTS.map((d) => ({ value: d, label: d }))],
        },
        { label: 'Company / Location', value: locationFilter, set: setLocationFilter, placeholder: 'e.g. Kochi' },
      ],
    },
  ];

  // Applied filters, as removable chips. Derived from the same state — nothing to
  // keep in sync. Owner only counts as "applied" when it deviates from my own
  // Opportunities, which is the Pipeline's resting state.
  const activeFilters: { key: string; label: string; display: string; clear: () => void }[] = [
    ...(searchQuery.trim() ? [{ key: 'search', label: 'Search', display: `"${searchQuery.trim()}"`, clear: () => setSearchQuery('') }] : []),
    ...(ownerFilter && ownerFilter !== (meId || 'all')
      ? [{
          key: 'owner', label: 'Owner',
          display: ownerFilter === 'all' ? 'All Owners' : (owners.find((o) => String(o.id) === ownerFilter)?.name ?? ownerFilter),
          clear: () => setOwnerFilter(meId || 'all'),
        }] : []),
    ...(viewMode === 'table' && stageFilter !== 'all' ? [{ key: 'stage', label: 'Stage', display: stageFilter, clear: () => setStageFilter('all') }] : []),
    ...(temperatureFilter !== 'all'
      ? [{ key: 'temperature', label: 'Lead Status', display: TEMPERATURE_OPTIONS.find((t) => t.value === temperatureFilter)?.label ?? temperatureFilter, clear: () => setTemperatureFilter('all') }] : []),
    ...(sourceFilter !== 'all' ? [{ key: 'source', label: 'Source', display: formatLeadSource(sourceFilter), clear: () => setSourceFilter('all') }] : []),
    ...(districtFilter !== 'all' ? [{ key: 'district', label: 'District', display: districtFilter, clear: () => setDistrictFilter('all') }] : []),
    ...(locationFilter.trim() ? [{ key: 'location', label: 'Location', display: locationFilter.trim(), clear: () => setLocationFilter('') }] : []),
  ];

  // The filters are only applied once this flips — it gates the first fetch so a
  // refresh loads the RESTORED filters directly instead of flashing the full list.
  const [restored, setRestored] = useState(false);

  // `searchQuery` is what the box shows (instant, never laggy); `appliedSearch` is
  // what the QUERY uses. Typing settles for 450 ms before it becomes a request, so
  // a 12-character search costs one fetch instead of twelve.
  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    if (!restored) return;
    if (searchQuery === appliedSearch) return;
    const t = setTimeout(() => setAppliedSearch(searchQuery), 450);
    return () => clearTimeout(t);
  }, [searchQuery, appliedSearch, restored]);
  // Enter skips the wait.
  const submitSearch = () => setAppliedSearch(searchQuery);

  // Initialise the view + filters from the URL — read on the client to avoid a
  // useSearchParams Suspense boundary / hydration mismatch. This also lets the old
  // /leads/pipeline route redirect straight into the board.
  useEffect(() => {
    // Wait for auth: the owner default IS the signed-in user, so restoring before
    // it settles would fetch everyone's Opportunities and then re-fetch.
    if (restored || authLoading) return;
    if (typeof window !== 'undefined') {
      let p = new URLSearchParams(window.location.search);
      // Re-entering the module on a BARE url (sidebar, module switcher, typed link):
      // replay the view this tab was last working in. This is what makes the state
      // survive leaving Sales entirely, without every nav link needing to carry it.
      // An explicit url always wins, and Clear All stores an empty search — so a
      // deliberately cleared Pipeline stays cleared.
      if (Array.from(p.keys()).length === 0) {
        const saved = readPipelineState().search;
        if (saved) {
          p = new URLSearchParams(saved);
          window.history.replaceState(null, '', `${window.location.pathname}${saved}`);
        }
      }
      // Kanban is the default; ?view=table opts into the table (?view=pipeline is still
      // honoured so old /leads/pipeline redirects and shared links keep working).
      const v = p.get('view');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === 'table') setViewMode('table');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      else if (v === 'pipeline') setViewMode('pipeline');
      for (const f of persisted) {
        const saved = p.get(f.key);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (saved !== null) f.set(saved);
      }
      // Owner has no "unset" state: an explicit ?owner wins, otherwise the Pipeline
      // opens on MY Opportunities. Falls back to 'all' only if the user is unknown,
      // where the backend's RBAC scoping still applies. Without view-all the ?owner
      // param is ignored outright, so a hand-edited URL can't widen the scope.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOwnerFilter(canViewAllLeads ? (p.get('owner') ?? (meId || 'all')) : (meId || 'all'));
      // Seed the applied term from the url so the restored search fetches ONCE.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppliedSearch(p.get('search') ?? '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (persisted.some((f) => f.advanced && p.get(f.key))) setShowAdvanced(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestored(true);
    // `persisted` closes over the current setters, which are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, authLoading, meId, canViewAllLeads]);

  // Mirror the live filter state back into the URL, so a refresh (or a shared link)
  // reproduces exactly this view. Defaults are removed, so Clear Filters cleans the
  // URL for free and the next refresh shows the default Pipeline again.
  useEffect(() => {
    if (!restored || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    for (const f of persisted) {
      if (f.value && f.value !== f.empty) url.searchParams.set(f.key, f.value);
      else url.searchParams.delete(f.key);
    }
    window.history.replaceState(null, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, searchQuery, sourceFilter, stageFilter, ownerFilter, locationFilter, temperatureFilter, districtFilter]);

  // Switch view + keep the URL in sync without a navigation/refetch.
  const changeView = (v: ViewMode) => {
    setViewMode(v);
    // The stage filter is a Table-view concept applied CLIENT-side to `leads`; the
    // board derives `leadsByStage` from the same `leads`, so no clearing is needed.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      // Kanban is the default → keep the URL clean for it, tag only the table view.
      if (v === 'table') url.searchParams.set('view', 'table');
      else url.searchParams.delete('view');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const fetchLeads = useCallback(async () => {
    try {
      // Only the FIRST load blanks the results area. Every later fetch (a search, a
      // filter change, the focus refetch) keeps the current rows on screen and shows
      // a small inline spinner instead — that swap-to-skeleton was the "flicker".
      if (hasLoadedRef.current) setIsFetching(true);
      else setIsLoading(true);
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      // '' can't reach here (the fetch is gated on `restored`), but never send an
      // empty ownerId — the backend would treat it as "no owner filter" = everyone.
      if (ownerFilter && ownerFilter !== 'all') params.set('ownerId', ownerFilter);
      if (locationFilter.trim()) params.set('location', locationFilter.trim());
      if (temperatureFilter !== 'all') params.set('temperature', temperatureFilter);
      if (districtFilter !== 'all') params.set('district', districtFilter);
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const res = await apiClient.get<Lead[]>(`/sales/leads?${params.toString()}`);
      setLeads(res.data);
    } catch {
      toast('Failed to fetch leads', 'error');
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [sourceFilter, ownerFilter, locationFilter, temperatureFilter, districtFilter, appliedSearch, toast]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await apiClient.get<SourceAnalytics>('/sales/leads/analytics/source');
      setAnalytics(res.data);
    } catch {
      // Analytics are best-effort; don't block the page.
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiClient.get<Customer[]>('/sales/customers');
      setCustomers(res.data);
    } catch {
      // Customer linkage is optional when creating a lead.
    }
  }, []);

  const loadStages = useCallback(async () => {
    try {
      setStages(await fetchLeadStages());
    } catch {
      setStages([]);
    }
  }, []);

  useEffect(() => {
    // Wait for the URL-persisted filters, so the first request already carries them.
    if (!restored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeads();
  }, [fetchLeads, restored]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
    fetchCustomers();
    loadStages();
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, [fetchAnalytics, fetchCustomers, loadStages]);

  // Keep the list live: refetch when the tab/window regains focus (e.g. after
  // changing a lead's stage on the Details page), so the Table and Kanban board
  // always show the latest status with no manual refresh.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'hidden') fetchLeads();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchLeads]);

  const refresh = () => {
    fetchLeads();
    fetchAnalytics();
  };

  // Resets every persisted filter to its "not applied" value; the URL-sync effect
  // then strips them, so the next refresh shows the default Pipeline again.
  const clearFilters = () => persisted.forEach((f) => f.set(f.empty));

  // Most filters (incl. temperature) are server-side. The stage filter is
  // client-side and applies to the TABLE only — the Pipeline board always shows
  // every stage (that's the point of a Kanban board), so it reads `leads`.
  const visibleLeads = [...leads]
    .filter((l) => stageFilter === 'all' || l.stage === stageFilter)
    // Default TABLE order = newest created first, so a lead you just created is row 1.
    // Deliberately applied here and NOT to the API query: that query is ordered by
    // stage + orderIndex to render the Pipeline board's manual drag-and-drop card
    // order, which `leadsByStage` still relies on. Sorting only this table-scoped
    // list keeps both views correct.
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pipeline grouping — derived from the SAME `leads` (already filtered
  // server-side), minus inactive statuses, so a move in either view is reflected
  // in the other instantly.
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of stages) map[s.name] = [];
    for (const lead of leads) {
      // Only converted/disqualified leads leave the board; everything else
      // (including won/lost/closed reached by dropping into a terminal column)
      // stays visible in the column named by its stage.
      if (OFF_BOARD_STATUSES.includes((lead.status || '').toLowerCase())) continue;
      // A lead on an unknown / renamed / deleted stage folds into the first
      // column, so a card is never silently dropped from the board.
      const key = map[lead.stage] ? lead.stage : stages[0]?.name;
      if (key) map[key].push(lead);
    }
    return map;
  }, [leads, stages]);

  // What the user is actually looking at, in display order: the table shows
  // `visibleLeads` (stage filter + newest-first), the Kanban board shows
  // `leadsByStage` (every stage, minus off-board statuses). Single source for the
  // exported report AND the Details page's Previous/Next.
  const shownLeads = viewMode === 'table' ? visibleLeads : Object.values(leadsByStage).flat();

  // Remember the working context for anything that navigates AWAY from this list:
  // the on-screen order (Details' Previous/Next) and the query string to come back
  // to. Keyed on the id list so it re-saves when filters/view change, not on every
  // unrelated render.
  const shownIds = shownLeads.map((l) => l.id).join(',');
  useEffect(() => {
    if (!restored) return;
    savePipelineState({
      ids: shownIds ? shownIds.split(',').map(Number) : [],
      search: window.location.search,
    });
  }, [shownIds, restored]);

  // Scroll offset is captured on the way out (route change unmounts this page),
  // then restored below once the list has rendered.
  useEffect(() => {
    if (!restored) return;
    return () => savePipelineState({ scrollY: window.scrollY });
  }, [restored]);

  // Restore the scroll offset only when re-entering the SAME filtered view — a
  // fresh visit or a different filter set must start at the top.
  const restoredScrollRef = useRef(false);
  useEffect(() => {
    if (restoredScrollRef.current || isLoading || !restored || leads.length === 0) return;
    restoredScrollRef.current = true;
    const saved = readPipelineState();
    if (saved.scrollY > 0 && saved.search === window.location.search) {
      window.scrollTo({ top: saved.scrollY });
    }
  }, [isLoading, restored, leads.length]);

  const totalPipelineValue = useMemo(() => {
    return leads.reduce((sum, lead) => sum + (lead.leadValue ?? 0), 0);
  }, [leads]);

  // Drag/drop (or the mobile move dropdown) → OPEN the Stage Transition Dialog. The
  // stage is NOT persisted yet and `leads` is left untouched, so the card visually
  // returns to its original column; a Cancel therefore leaves it exactly in place.
  const handleMove = (leadId: number, targetStage: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target || target.stage === targetStage) return;
    setTransition({ lead: target, toStage: targetStage });
  };

  // Save from the dialog → persist the stage + optional checklist/description via the
  // EXISTING moveLeadStage API (which logs the activity/history), then reconcile the
  // shared `leads` state so the board AND table reflect the move. Pipeline stage is the
  // single source of truth for status, so the server response drives both.
  // One or more forward transitions committed on Finish. Applied sequentially via the EXISTING
  // moveLeadStage API — it derives `from` from the lead's CURRENT stage, so each call chains and
  // logs its own history entry. ponytail: sequential, not a DB transaction; a mid-sequence
  // failure leaves earlier steps applied — we refetch to show the true state. Single endpoint
  // reused, no batch API; add one only if partial-failure atomicity becomes a real requirement.
  const confirmTransition = async (steps: TransitionStep[]) => {
    if (!transition) return;
    const { lead: target } = transition;
    setIsSavingTransition(true);
    try {
      let updated;
      for (const s of steps) updated = await moveLeadStage(target.id, s.toStage, { checklist: s.checklist, description: s.description });
      if (updated) setLeads((prev) => prev.map((l) => (l.id === target.id ? { ...l, stage: updated!.stage, status: updated!.status } : l)));
      toast(`Moved "${target.title}" to ${steps[steps.length - 1].toStage}`, 'success');
      setTransition(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to move opportunity', 'error');
      fetchLeads(); // resync in case some steps applied before the failure
    } finally {
      setIsSavingTransition(false);
    }
  };

  // Delete a lead (shared by the table row action AND the Kanban card). Confirms
  // first, then optimistically drops it from the shared `leads` state — so the
  // table, the pipeline board and the lead counts all update with no refetch —
  // and refreshes the source analytics. Reverts the list on failure.
  const handleDeleteLead = async (lead: Lead) => {
    const ok = await confirm({
      title: 'Delete Lead',
      message: `Are you sure you want to delete "${lead.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      intent: 'danger',
    });
    if (!ok) return;

    const previous = leads;
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    try {
      await deleteLead(lead.id);
      toast(`Deleted "${lead.title}"`, 'success');
      fetchAnalytics();
    } catch (error) {
      setLeads(previous);
      toast(error instanceof Error ? error.message : 'Failed to delete lead', 'error');
    }
  };

  // Reorder a stage one position left/right. Optimistic; reverts on failure.
  const handleMoveStage = async (stage: LeadStage, dir: -1 | 1) => {
    const ordered = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = ordered.findIndex((s) => s.id === stage.id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];

    const previous = stages;
    setStages(ordered.map((s, i) => ({ ...s, orderIndex: i + 1 })));
    try {
      const updated = await reorderLeadStages(ordered.map((s) => s.id));
      setStages(updated);
    } catch (error) {
      setStages(previous);
      toast(error instanceof Error ? error.message : 'Failed to reorder stages', 'error');
    }
  };

  const existingStageNames = stages.map((s) => s.name);

  const handleExportReport = () => {
    setIsExportModalOpen(true);
  };

  // Same filtered dataset for both formats — only the writer differs.
  const confirmDownloadReport = async (fmt: 'pdf' | 'excel' = 'pdf') => {
    setIsExporting(true);
    try {
      // SINGLE SOURCE OF TRUTH: the report contains exactly what is on screen —
      // `shownLeads` is the same list the table/board renders and Details paginates.
      const shown = shownLeads;

      // Date range narrows that SAME dataset. Parse the YYYY-MM-DD inputs as LOCAL day
      // boundaries — new Date('2026-07-23') is UTC midnight, which wrongly drops leads
      // created earlier the same local day (the "report shows 0" bug).
      const dayStart = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 0, 0, 0, 0).getTime(); };
      const dayEnd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 59, 999).getTime(); };
      let filteredForReport = shown;
      if (exportDateRange.from || exportDateRange.to) {
        filteredForReport = shown.filter(l => {
          const leadDate = new Date(l.createdAt).getTime();
          if (exportDateRange.from && leadDate < dayStart(exportDateRange.from)) return false;
          if (exportDateRange.to && leadDate > dayEnd(exportDateRange.to)) return false;
          return true;
        });
      }

      const reportFilters = {
        searchQuery,
        source: sourceFilter,
        // Stage is a TABLE-only filter (the board deliberately shows every stage), so
        // only report it as applied when it actually narrowed the exported set.
        stage: viewMode === 'table' ? stageFilter : 'all',
        owner: ownerFilter,
        ownerName: ownerFilter !== 'all' ? owners.find((o) => String(o.id) === ownerFilter)?.name : undefined,
        temperature: temperatureFilter,
        district: districtFilter,
        location: locationFilter,
        dateRange: exportDateRange,
      };
      if (fmt === 'excel') await exportLeadWorkbook(filteredForReport, reportFilters);
      else {
        // Reuse the existing per-BDE computation for the appended BDE Performance
        // Summary (fetched with the same export date range; never recomputed here).
        let bdePipeline;
        try {
          bdePipeline = (await fetchPipelineReport({
            from: exportDateRange.from || undefined,
            to: exportDateRange.to || undefined,
          })).bdePipeline;
        } catch { bdePipeline = undefined; }
        await exportLeadReport(filteredForReport, stages, reportFilters, bdePipeline);
      }
      toast('Report downloaded successfully', 'success');
      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      toast('Failed to generate report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/pipeline' },
              { label: 'Pipeline', href: '/dashboard/sales/pipeline' },
            ]}
          />
          <div className="flex gap-2 flex-wrap">
            {canViewAnalytics && (
              <Link href="/dashboard/sales/analytics">
                <Button variant="secondary">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            )}
            {viewMode === 'pipeline' && canManageStages && (
              <Button variant="secondary" onClick={() => setStageModal({ mode: 'add', stage: null })}>
                <Columns3 className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            )}
            <Link href="/dashboard/sales/pipeline/aging">
              <Button variant="secondary">
                <Clock className="w-4 h-4 mr-2" />
                Aging
              </Button>
            </Link>
            {canExportReport && (
              <Button variant="secondary" onClick={handleExportReport} disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Report
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            {canCreate && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Opportunity
              </Button>
            )}
          </div>
        </div>

        {/* View switch — Table ⇄ Pipeline (same Leads dataset, no navigation) */}
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 w-fit">
          {([
            { key: 'table', label: 'Table View', icon: List },
            { key: 'pipeline', label: 'Pipeline View', icon: Columns3 },
          ] as { key: ViewMode; label: string; icon: typeof List }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={viewMode === key}
              onClick={() => changeView(key)}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                viewMode === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Source analytics summary */}
        {analytics && analytics.totalLeads > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Pipeline Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate" title={formatINR(totalPipelineValue)}>
                {formatINR(totalPipelineValue)}
              </p>
            </Card>
            <Card className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Opportunities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalLeads}</p>
              <p className="text-xs text-gray-400 mt-1">{analytics.overallConversionRate}% conversion</p>
            </Card>
            {analytics.sources.map((s) => (
              <Card key={s.source} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatLeadSource(s.source)}</p>
                  <Badge variant={leadSourceVariant(s.source)}>{s.total}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {s.won} won · {s.conversionRate}% conv.
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Filters (apply to BOTH views — they drive the shared dataset) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, company, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitSearch(); } }}
                aria-label="Search opportunities"
                className="w-full pl-9 pr-9 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
              {/* Inline, in the box itself — the results below never blank out. */}
              {(isFetching || searchQuery !== appliedSearch) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
              )}
            </div>
            {/* Scope switch — the Pipeline's most-used control, so it sits in the
                toolbar rather than inside the panel. */}
            {/* Gated on sales.leads.view_all — without it there is nothing to switch
                to. Also needs to know who "my" is, else both options would carry the
                same value and light up together. */}
            <div className={classNames('flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5', (!meId || !canViewAllLeads) && 'hidden')}>
              {[
                { value: meId, label: 'My Leads' },
                { value: 'all', label: 'All Leads' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setOwnerFilter(opt.value)}
                  className={classNames(
                    'px-3 py-1.5 text-sm font-medium rounded-[10px] transition-colors whitespace-nowrap',
                    ownerFilter === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              variant={showAdvanced || activeFilters.length > 0 ? 'primary' : 'secondary'}
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFilters.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/25 text-xs font-bold tabular-nums">
                  {activeFilters.length}
                </span>
              )}
            </Button>
          </div>

          {/* Active filters as removable chips — what's applied, at a glance. */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-900"
                >
                  <span className="text-blue-500/80 dark:text-blue-400/80">{f.label}:</span>
                  {f.display}
                  <button
                    type="button"
                    onClick={f.clear}
                    aria-label={`Remove ${f.label} filter`}
                    className="p-0.5 rounded-full hover:bg-blue-200/70 dark:hover:bg-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}

          {showAdvanced && (
            <div className="p-4 space-y-5 bg-gray-50/60 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-800">
              {FILTER_GROUPS.map((group) => (
                <div key={group.title}>
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">{group.title}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.fields.map((f) => (
                      <label key={f.label} className="block">
                        <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</span>
                        {f.options ? (
                          <select
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            aria-label={f.label}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                          >
                            {f.options.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={f.placeholder}
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            aria-label={f.label}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Filters apply live, so Apply simply closes the panel. */}
              <div className="flex justify-end gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                <Button variant="secondary" onClick={clearFilters}>Clear All</Button>
                <Button onClick={() => setShowAdvanced(false)}>Apply</Button>
              </div>
            </div>
          )}
        </div>

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Title</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Source</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Lead Status</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Owner</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Created Date</th>
                    {canDeleteLead && (
                      <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={canDeleteLead ? 8 : 7} className="px-6 py-8 text-center text-gray-500">Loading leads...</td>
                    </tr>
                  ) : visibleLeads.length === 0 ? (
                    <tr>
                      <td colSpan={canDeleteLead ? 8 : 7} className="px-6 py-8 text-center text-gray-500">No opportunities found</td>
                    </tr>
                  ) : (
                    visibleLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/sales/pipeline/${lead.id}`}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline"
                            >
                              {lead.title}
                            </Link>
                            {lead.flaggedForReview && (
                              <span title="Flagged for review" className="text-amber-500">
                                <AlertTriangle className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={leadSourceVariant(lead.source)}>{formatLeadSource(lead.source)}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{lead.priority}</td>
                        <td className="px-6 py-4">
                          <LeadHealthBadge temperature={lead.temperature} showLabel={false} />
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{lead.owner?.name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        {canDeleteLead && (
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead)}
                              className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                              aria-label={`Delete lead ${lead.title}`}
                              title="Delete lead"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* PIPELINE VIEW — same data, Kanban presentation (no separate route) */}
        {viewMode === 'pipeline' && (
          isLoading ? (
            <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              Loading pipeline…
            </Card>
          ) : stages.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              No pipeline stages configured.
            </Card>
          ) : (
            <LeadPipelineBoard
              stages={stages}
              leadsByStage={leadsByStage}
              canMove={canMove}
              canManageStages={canManageStages}
              canDeleteStages={canDeleteStages}
              canDeleteLead={canDeleteLead}
              onDeleteLead={handleDeleteLead}
              onMove={handleMove}
              onAddStage={() => setStageModal({ mode: 'add', stage: null })}
              onRenameStage={(stage) => setStageModal({ mode: 'rename', stage })}
              onDeleteStage={(stage) => setDeleteTarget(stage)}
              onMoveStage={handleMoveStage}
            />
          )
        )}
      </div>

      {/* Create lead (modal — no page navigation). Mounted only while open so
          its form state resets on each open. */}
      {isCreateOpen && (
        <CreateLeadModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={refresh}
        />
      )}

      {/* Import wizard (upload → preview + mapping → import) */}
      <ImportLeadsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={refresh}
      />

      {/* Stage management modals (Pipeline view) */}
      {stageModal && (
        <StageFormModal
          isOpen
          mode={stageModal.mode}
          stage={stageModal.stage}
          existingNames={existingStageNames}
          noun="lead"
          createStage={createLeadStage}
          renameStage={updateLeadStage}
          onClose={() => setStageModal(null)}
          onSaved={loadStages}
        />
      )}
      <DeleteStageModal
        isOpen={!!deleteTarget}
        stage={deleteTarget}
        recordCount={deleteTarget ? leads.filter((l) => l.stage === deleteTarget.name).length : 0}
        otherStages={stages.filter((s) => s.id !== deleteTarget?.id)}
        noun="lead"
        deleteStage={deleteLeadStage}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { loadStages(); fetchLeads(); }}
      />

      {/* Stage Transition Dialog — captures checklist + notes before persisting a move. */}
      <StageTransitionDialog
        isOpen={!!transition}
        opportunityName={transition?.lead.title ?? ''}
        fromStage={transition?.lead.stage ?? ''}
        toStage={transition?.toStage ?? ''}
        isSaving={isSavingTransition}
        onConfirm={confirmTransition}
        onCancel={() => setTransition(null)}
      />

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Pipeline Report</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Select a date range to filter the leads included in the exported report.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                id="export-from-date"
                label="From Date"
                type="date"
                value={exportDateRange.from ?? ''}
                onChange={(v) => setExportDateRange({ ...exportDateRange, from: v })}
                max={exportDateRange.to || undefined}
              />
              <InputField
                id="export-to-date"
                label="To Date"
                type="date"
                value={exportDateRange.to ?? ''}
                onChange={(v) => setExportDateRange({ ...exportDateRange, to: v })}
                min={exportDateRange.from || undefined}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => confirmDownloadReport('excel')} disabled={isExporting}>
              {isExporting ? 'Generating…' : 'Download Excel'}
            </Button>
            <Button onClick={() => confirmDownloadReport('pdf')} disabled={isExporting}>
              {isExporting ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PermissionPageGuard>
  );
}
