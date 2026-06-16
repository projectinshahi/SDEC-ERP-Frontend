'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, List, Plus } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { LeadPipelineBoard } from '@/components/leads/LeadPipelineBoard';
import {
  fetchLeads, fetchLeadStages, fetchAssignableUsers, moveLeadStage,
} from '@/lib/api/leads';
import { LEAD_SOURCES, formatLeadSource } from '@/lib/data/leadSources';
import type { Lead, LeadStage, AssignableUser } from '@/lib/types/lead';

export default function LeadPipelinePage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canMove = hasPermission('sales.edit');
  const canCreate = hasPermission('sales.create');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const loadLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setLeads(await fetchLeads({ source: sourceFilter, ownerId: ownerFilter }));
    } catch {
      toast('Failed to load leads', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sourceFilter, ownerFilter, toast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    fetchLeadStages().then(setStages).catch(() => setStages([]));
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, []);

  // Client-side search across title / company so typing feels instant.
  // Leads that have left the active pipeline (disqualified/converted/closed) are
  // hidden from the board.
  const INACTIVE = ['disqualified', 'converted', 'won', 'lost', 'closed'];

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (INACTIVE.includes((l.status || '').toLowerCase())) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        (l.customer?.company || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, search]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of stages) map[s.name] = [];
    for (const lead of visibleLeads) {
      // A lead always belongs to exactly one stage; default unknown to first column.
      const key = map[lead.stage] ? lead.stage : stages[0]?.name;
      if (key) map[key].push(lead);
    }
    return map;
  }, [visibleLeads, stages]);

  // Optimistic move with revert on failure (invalid drops never reach here).
  const handleMove = async (leadId: number, targetStage: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target || target.stage === targetStage) return;

    const previousStage = target.stage;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l)));

    try {
      await moveLeadStage(leadId, targetStage);
      toast(`Moved "${target.title}" to ${targetStage}`, 'success');
    } catch (error: any) {
      // Revert the card to its previous stage.
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l)));
      toast(error?.message || 'Failed to move lead', 'error');
    }
  };

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/leads' },
              { label: 'Leads', href: '/dashboard/sales/leads' },
              { label: 'Pipeline', href: '/dashboard/sales/leads/pipeline' },
            ]}
          />
          <div className="flex gap-2">
            <Link href="/dashboard/sales/leads">
              <Button variant="secondary">
                <List className="w-4 h-4 mr-2" />
                List View
              </Button>
            </Link>
            {canCreate && (
              <Link href="/dashboard/sales/leads/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Lead
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              <option key={s} value={s}>{formatLeadSource(s)}</option>
            ))}
          </select>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          >
            <option value="all">All Owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
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
            onMove={handleMove}
          />
        )}
      </div>
    </PermissionPageGuard>
  );
}
