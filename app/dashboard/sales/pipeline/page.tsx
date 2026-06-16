'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { SlidersHorizontal, Filter, TrendingUp, IndianRupee, AlertOctagon, Clock } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { fetchPipelineDeals, fetchStageConfig } from '@/lib/api/pipeline';
import { fetchSavedViews, createSavedView, deleteSavedView } from '@/lib/api/savedViews';
import { fetchAssignableUsers } from '@/lib/api/leads';
import { PipelineFilters } from '@/components/sales-execution/PipelineFilters';
import { PipelineDealTable } from '@/components/sales-execution/PipelineDealTable';
import { StageConfigModal } from '@/components/sales-execution/StageConfigModal';
import { SavedViewsBar } from '@/components/sales-execution/SavedViewsBar';
import type { AssignableUser } from '@/lib/types/lead';
import type {
  PipelineFilters as PipelineFiltersType,
  PipelineResponse,
  DealStageConfig,
  SavedView,
  SavedViewScope,
} from '@/lib/types/salesExecution';

const EMPTY_FILTERS: PipelineFiltersType = {};
const EMPTY_SUMMARY: PipelineResponse['summary'] = {
  count: 0,
  totalValue: 0,
  weightedForecast: 0,
  stalled: 0,
  atRisk: 0,
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PipelineViewsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canConfigure = hasPermission('sales.config');
  const currentUserId = Number(user?.id) || 0;

  const [filters, setFilters] = useState<PipelineFiltersType>(EMPTY_FILTERS);
  const [deals, setDeals] = useState<PipelineResponse['deals']>([]);
  const [summary, setSummary] = useState<PipelineResponse['summary']>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const [stages, setStages] = useState<DealStageConfig[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewScope, setNewViewScope] = useState<SavedViewScope>('personal');
  const [isSavingView, setIsSavingView] = useState(false);

  // Load static lookups once.
  useEffect(() => {
    fetchStageConfig().then(setStages).catch(() => setStages([]));
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
    fetchSavedViews('deal').then(setSavedViews).catch(() => setSavedViews([]));
  }, []);

  const loadStages = useCallback(() => {
    fetchStageConfig().then(setStages).catch(() => setStages([]));
  }, []);

  const reloadViews = useCallback(() => {
    fetchSavedViews('deal').then(setSavedViews).catch(() => setSavedViews([]));
  }, []);

  // Debounced fetch whenever filters change.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const handle = window.setTimeout(() => {
      fetchPipelineDeals(filters)
        .then((res) => {
          if (cancelled) return;
          setDeals(res.deals);
          setSummary(res.summary);
        })
        .catch(() => {
          if (cancelled) return;
          toast('Failed to load pipeline deals', 'error');
          setDeals([]);
          setSummary(EMPTY_SUMMARY);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [filters, toast]);

  const handleFilterChange = (next: PipelineFiltersType) => {
    setFilters(next);
    setActiveViewId(null); // editing filters detaches from any applied view
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setActiveViewId(null);
  };

  const handleApplyView = (view: SavedView) => {
    setFilters(view.filters ?? {});
    setActiveViewId(view.id);
  };

  const handleDeleteView = async (id: number) => {
    const ok = await confirm({
      title: 'Delete saved view',
      message: 'This saved view will be removed for everyone it is shared with. Continue?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteSavedView(id);
      toast('Saved view deleted', 'success');
      if (activeViewId === id) setActiveViewId(null);
      reloadViews();
    } catch {
      toast('Failed to delete saved view', 'error');
    }
  };

  const handleSaveCurrentView = async () => {
    const name = newViewName.trim();
    if (!name) {
      toast('Please enter a view name', 'warning');
      return;
    }
    try {
      setIsSavingView(true);
      const created = await createSavedView({
        name,
        entity: 'deal',
        scope: newViewScope,
        filters,
      });
      toast('View saved', 'success');
      setIsSaveOpen(false);
      setNewViewName('');
      setNewViewScope('personal');
      setActiveViewId(created.id);
      reloadViews();
    } catch {
      toast('Failed to save view (you may not have permission for this scope)', 'error');
    } finally {
      setIsSavingView(false);
    }
  };

  const stats = [
    { label: 'Deals', value: String(summary.count), icon: Filter, tone: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Total Value', value: formatMoney(summary.totalValue), icon: IndianRupee, tone: 'text-gray-900 dark:text-white', bg: 'bg-gray-100 dark:bg-gray-800' },
    { label: 'Weighted Forecast', value: formatMoney(summary.weightedForecast), icon: TrendingUp, tone: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Stalled', value: String(summary.stalled), icon: AlertOctagon, tone: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'At Risk', value: String(summary.atRisk), icon: Clock, tone: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  ];

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Breadcrumb
            items={[
              { label: 'Sales', href: '/dashboard/sales/leads' },
              { label: 'Pipeline Views' },
            ]}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Pipeline Views</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Filter, save, and monitor your deal pipeline with stalled-deal insights.
              </p>
            </div>
            {canConfigure && (
              <Button variant="secondary" onClick={() => setIsConfigOpen(true)}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Configure Stalled Thresholds
              </Button>
            )}
          </div>
        </div>

        {/* Saved views */}
        <SavedViewsBar
          views={savedViews}
          activeViewId={activeViewId}
          onApply={handleApplyView}
          onSaveCurrent={() => setIsSaveOpen(true)}
          onDelete={handleDeleteView}
          currentUserId={currentUserId}
        />

        {/* Filters */}
        <PipelineFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClear}
          stages={stages}
          owners={owners}
        />

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg} ${stat.tone}`}>
                  <stat.icon className="h-4 w-4" />
                </span>
              </div>
              <p className={`mt-2 text-xl font-bold tabular-nums ${stat.tone}`}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <EmptyState
            icon={<Filter className="h-8 w-8" />}
            title="No deals match these filters"
            description="Try adjusting or clearing your filters to see more of your pipeline."
            actionLabel="Clear filters"
            onAction={handleClear}
          />
        ) : (
          <PipelineDealTable deals={deals} />
        )}
      </div>

      {/* Stalled threshold config */}
      <StageConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        stages={stages}
        onSaved={loadStages}
      />

      {/* Save current view */}
      <Modal isOpen={isSaveOpen} onClose={() => setIsSaveOpen(false)} title="Save current view" size="sm">
        <div className="space-y-4">
          <InputField
            id="save-view-name"
            label="View name"
            placeholder="e.g. High-value stalled deals"
            required
            value={newViewName}
            onChange={setNewViewName}
          />
          <SelectField
            id="save-view-scope"
            label="Visibility"
            value={newViewScope}
            onChange={(v) => setNewViewScope(v as SavedViewScope)}
            options={[
              { value: 'personal', label: 'Personal — only me' },
              { value: 'team', label: 'Team — my team' },
              { value: 'global', label: 'Global — everyone' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsSaveOpen(false)} disabled={isSavingView}>
              Cancel
            </Button>
            <Button onClick={handleSaveCurrentView} isLoading={isSavingView}>
              Save view
            </Button>
          </div>
        </div>
      </Modal>
    </PermissionPageGuard>
  );
}
