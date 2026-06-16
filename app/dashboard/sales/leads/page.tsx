'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Search, Plus, Upload, AlertTriangle, LayoutGrid, BarChart3, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { apiClient } from '@/lib/api/api-client';
import { fetchLeadStages, fetchAssignableUsers } from '@/lib/api/leads';
import { ImportLeadsModal } from '@/components/leads/ImportLeadsModal';
import {
  LEAD_SOURCES,
  formatLeadSource,
  leadSourceVariant,
} from '@/lib/data/leadSources';
import { formatScore, scoreColorClass } from '@/lib/data/leadRating';
import type { LeadStage, AssignableUser } from '@/lib/types/lead';

interface Owner {
  id: number;
  name: string;
  email: string;
}

interface Lead {
  id: number;
  title: string;
  description?: string | null;
  source: string;
  flaggedForReview: boolean;
  status: string;
  priority: string;
  score: number;
  customerId?: number | null;
  owner?: Owner;
  customer?: { id: number; name: string } | null;
}

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

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'won', 'lost', 'converted', 'disqualified'];


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
  const [scoreSort, setScoreSort] = useState<ScoreSort>('none');

  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canConfigureScoring = hasPermission('sales.scoring');

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (stageFilter !== 'all') params.set('stage', stageFilter);
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
  }, [sourceFilter, statusFilter, stageFilter, ownerFilter, locationFilter, scoreMin, scoreMax, searchQuery, toast]);

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

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchAnalytics();
    fetchCustomers();
    fetchLeadStages().then(setStages).catch(() => setStages([]));
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, [fetchAnalytics, fetchCustomers]);

  const refresh = () => {
    fetchLeads();
    fetchAnalytics();
  };

  const clearFilters = () => {
    setSourceFilter('all'); setStatusFilter('all'); setStageFilter('all');
    setOwnerFilter('all'); setLocationFilter(''); setScoreMin(''); setScoreMax('');
  };

  // Search + filtering happen server-side; only score sort is client-side.
  const visibleLeads = [...leads].sort((a, b) => {
    if (scoreSort === 'desc') return (b.score ?? 0) - (a.score ?? 0);
    if (scoreSort === 'asc') return (a.score ?? 0) - (b.score ?? 0);
    return 0;
  });

  // Cycle the score sort: none → high→low → low→high → none.
  const cycleScoreSort = () =>
    setScoreSort((s) => (s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none'));

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
            <Link href="/dashboard/sales/analytics">
              <Button variant="secondary">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </Link>
            {canConfigureScoring && (
              <Link href="/dashboard/leads/scoring-settings">
                <Button variant="secondary">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Scoring
                </Button>
              </Link>
            )}
            <Link href="/dashboard/sales/leads/pipeline">
              <Button variant="secondary">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Pipeline
              </Button>
            </Link>
            <Link href="/dashboard/sales/leads/aging">
              <Button variant="secondary">
                <Clock className="w-4 h-4 mr-2" />
                Aging
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Link href="/dashboard/sales/leads/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Lead
              </Button>
            </Link>
          </div>
        </div>

        {/* Source analytics summary */}
        {analytics && analytics.totalLeads > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

        {/* Filters */}
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
            <Button variant="secondary" onClick={() => setShowAdvanced((v) => !v)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {showAdvanced ? 'Hide Filters' : 'More Filters'}
            </Button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-gray-50/60 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-800">
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
                  <th className="px-6 py-4 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading leads...</td>
                  </tr>
                ) : visibleLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No leads found</td>
                  </tr>
                ) : (
                  visibleLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {lead.title}
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
                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/sales/leads/${lead.id}`}>
                          <Button variant="secondary" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>


      {/* Import wizard (upload → preview + mapping → import) */}
      <ImportLeadsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={refresh}
      />
    </PermissionPageGuard>
  );
}
