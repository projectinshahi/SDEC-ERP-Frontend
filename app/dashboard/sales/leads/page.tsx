'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Search, Plus, Upload, AlertTriangle, BarChart3, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Clock, List, Columns3, Trash2, Download, Loader2 } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/components/ConfirmDialogProvider';
import { apiClient } from '@/lib/api/api-client';
import { fetchLeadStages, fetchAssignableUsers, moveLeadStage, reorderLeadStages, deleteLead, createLeadStage, updateLeadStage, deleteLeadStage } from '@/lib/api/leads';
import { ImportLeadsModal } from '@/components/leads/ImportLeadsModal';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { LeadPipelineBoard } from '@/components/leads/LeadPipelineBoard';
import { StageFormModal } from '@/components/sales-execution/pipeline/StageFormModal';
import { DeleteStageModal } from '@/components/sales-execution/pipeline/DeleteStageModal';
import {
  LEAD_SOURCES,
  formatLeadSource,
  leadSourceVariant,
} from '@/lib/data/leadSources';
import { formatScore, scoreColorClass } from '@/lib/data/leadRating';
import { formatINR } from '@/lib/utils/currency';
import { classNames } from '@/lib/utils';
import type { Lead, LeadStage, AssignableUser } from '@/lib/types/lead';
import { exportLeadReport } from '@/lib/utils/exportLeadReport';

type ScoreSort = 'none' | 'desc' | 'asc';

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

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'won', 'lost', 'converted', 'disqualified', 'closed'];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [stages, setStages] = useState<LeadStage[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scoreSort, setScoreSort] = useState<ScoreSort>('none');

  // Table ↔ Pipeline view (both render the SAME live `leads` dataset).
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Stage-management modal state (Pipeline view).
  const [stageModal, setStageModal] = useState<{ mode: 'add' | 'rename'; stage: LeadStage | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadStage | null>(null);

  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canConfigureScoring = hasPermission('sales.scoring');
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
  
  const [isExporting, setIsExporting] = useState(false);

  // Initialise the view from the URL (?view=pipeline) — read on the client to
  // avoid a useSearchParams Suspense boundary / hydration mismatch. This also
  // lets the old /leads/pipeline route redirect straight into the board.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (new URLSearchParams(window.location.search).get('view') === 'pipeline') setViewMode('pipeline');
    }
  }, []);

  // Switch view + keep the URL in sync without a navigation/refetch.
  const changeView = (v: ViewMode) => {
    setViewMode(v);
    // The Pipeline board must always show the WHOLE pipeline, so a status filter
    // (a Table-view concept, applied server-side) is cleared on entering Pipeline
    // — otherwise it would silently hide cards from the board.
    if (v === 'pipeline') setStatusFilter('all');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (v === 'pipeline') url.searchParams.set('view', 'pipeline');
      else url.searchParams.delete('view');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (ownerFilter !== 'all') params.set('ownerId', ownerFilter);
      if (locationFilter.trim()) params.set('location', locationFilter.trim());
      if (scoreMin.trim()) params.set('scoreMin', scoreMin.trim());
      if (scoreMax.trim()) params.set('scoreMax', scoreMax.trim());
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await apiClient.get<Lead[]>(`/sales/leads?${params.toString()}`);
      setLeads(res.data);
    } catch {
      toast('Failed to fetch leads', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sourceFilter, statusFilter, ownerFilter, locationFilter, scoreMin, scoreMax, searchQuery, toast]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeads();
  }, [fetchLeads]);

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

  const clearFilters = () => {
    setSourceFilter('all'); setStatusFilter('all'); setStageFilter('all');
    setOwnerFilter('all'); setLocationFilter(''); setScoreMin(''); setScoreMax('');
  };

  // Most filters are server-side. Stage filter + score sort are client-side and
  // apply to the TABLE only — the Pipeline board always shows every stage (that's
  // the point of a Kanban board), so it reads the unfiltered `leads`.
  const visibleLeads = [...leads]
    .filter((l) => stageFilter === 'all' || l.stage === stageFilter)
    .sort((a, b) => {
      if (scoreSort === 'desc') return (b.score ?? 0) - (a.score ?? 0);
      if (scoreSort === 'asc') return (a.score ?? 0) - (b.score ?? 0);
      return 0;
    });

  // Cycle the score sort: none → high→low → low→high → none.
  const cycleScoreSort = () =>
    setScoreSort((s) => (s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none'));

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

  const totalPipelineValue = useMemo(() => {
    return leads.reduce((sum, lead) => sum + (lead.leadValue ?? 0), 0);
  }, [leads]);

  // Optimistic move with revert on failure (invalid drops never reach here).
  // Updates the shared `leads` state, so the table reflects the move too.
  const handleMove = async (leadId: number, targetStage: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target || target.stage === targetStage) return;

    // Pipeline stage drives Lead Status (single source of truth): optimistically
    // update BOTH stage and status so the board, table and status badges reflect
    // the move instantly, then reconcile with the authoritative server response.
    const previousStage = target.stage;
    const previousStatus = target.status;
    const nextStatus = targetStage.toLowerCase();
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage, status: nextStatus } : l)));
    try {
      const updated = await moveLeadStage(leadId, targetStage);
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: updated.stage, status: updated.status } : l)));
      toast(`Moved "${target.title}" to ${targetStage}`, 'success');
    } catch (error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage, status: previousStatus } : l)));
      toast(error instanceof Error ? error.message : 'Failed to move lead', 'error');
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

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      await exportLeadReport(visibleLeads, stages, {
        searchQuery,
        source: sourceFilter,
        status: statusFilter,
        stage: stageFilter,
        owner: ownerFilter,
        location: locationFilter
      });
      toast('Report downloaded successfully', 'success');
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
              { label: 'Sales', href: '/dashboard/sales/leads' },
              { label: 'Leads', href: '/dashboard/sales/leads' },
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
            {canConfigureScoring && (
              <Link href="/dashboard/leads/scoring-settings">
                <Button variant="secondary">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Scoring
                </Button>
              </Link>
            )}
            {viewMode === 'pipeline' && canManageStages && (
              <Button variant="secondary" onClick={() => setStageModal({ mode: 'add', stage: null })}>
                <Columns3 className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            )}
            <Link href="/dashboard/sales/leads/aging">
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
                New Lead
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Lead Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate" title={formatINR(totalPipelineValue)}>
                {formatINR(totalPipelineValue)}
              </p>
            </Card>
            <Card className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Leads</p>
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
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            >
              <option value="all">All Sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{formatLeadSource(s)} Leads</option>
              ))}
            </select>
            {/* Status filter is a Table-view concept — the Pipeline groups by
                stage and must show every status, so it's hidden there (and
                cleared on entering Pipeline) to avoid silently hiding cards. */}
            {viewMode === 'table' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            )}
            <Button variant="secondary" onClick={() => setShowAdvanced((v) => !v)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {showAdvanced ? 'Hide Filters' : 'More Filters'}
            </Button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-gray-50/60 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-800">
              {/* Stage filter is a Table-view concept (the Pipeline groups by
                  stage already), so it's hidden in Pipeline view. */}
              {viewMode === 'table' && (
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  <option value="all">All Stages</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value="all">All Owners</option>
                {owners.map((o) => (
                  <option key={o.id} value={String(o.id)}>{o.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Location (address)"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number" placeholder="Min score" value={scoreMin}
                  onChange={(e) => setScoreMin(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                />
                <input
                  type="number" placeholder="Max score" value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                />
              </div>
              <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
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
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={cycleScoreSort}
                        className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Sort by score"
                      >
                        Score
                        {scoreSort === 'desc' ? <ArrowDown className="w-3.5 h-3.5" />
                          : scoreSort === 'asc' ? <ArrowUp className="w-3.5 h-3.5" />
                          : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                      </button>
                    </th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Owner</th>
                    {canDeleteLead && (
                      <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={canDeleteLead ? 7 : 6} className="px-6 py-8 text-center text-gray-500">Loading leads...</td>
                    </tr>
                  ) : visibleLeads.length === 0 ? (
                    <tr>
                      <td colSpan={canDeleteLead ? 7 : 6} className="px-6 py-8 text-center text-gray-500">No leads found</td>
                    </tr>
                  ) : (
                    visibleLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/sales/leads/${lead.id}`}
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
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{lead.priority}</td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold tabular-nums ${scoreColorClass(lead.score)}`}>
                            {formatScore(lead.score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{lead.owner?.name}</td>
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
    </PermissionPageGuard>
  );
}
