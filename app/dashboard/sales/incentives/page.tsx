'use client';

/**
 * SE-042.1 — Incentive Slab configuration.
 *
 * Managers pick a BDE (or view their own) and configure achievement-based
 * incentive slabs: each slab maps an achievement range to either an incentive
 * percentage or a fixed amount. The backend rejects overlapping slabs — those
 * errors are surfaced via toast. Create/edit/delete is gated behind
 * `sales.incentive.manage`; without it the page renders read-only.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Plus, Pencil, Trash2, Percent, Info } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchIncentiveSlabs,
  createIncentiveSlab,
  updateIncentiveSlab,
  deleteIncentiveSlab,
} from '@/lib/api/incentives';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type { IncentiveSlab, IncentiveSlabPayload } from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

type IncentiveMode = 'percent' | 'amount';

interface SlabFormState {
  minAchievementPct: string;
  maxAchievementPct: string; // blank => open-ended top slab
  mode: IncentiveMode;
  incentivePct: string;
  incentiveAmount: string;
}

const EMPTY_FORM: SlabFormState = {
  minAchievementPct: '',
  maxAchievementPct: '',
  mode: 'percent',
  incentivePct: '',
  incentiveAmount: '',
};

const MODE_OPTIONS = [
  { value: 'percent', label: 'Incentive %' },
  { value: 'amount', label: 'Fixed Amount (INR)' },
];

function rangeLabel(slab: IncentiveSlab): string {
  if (slab.maxAchievementPct == null) return `${slab.minAchievementPct}%+`;
  return `${slab.minAchievementPct}% – ${slab.maxAchievementPct}%`;
}

function incentiveLabel(slab: IncentiveSlab): string {
  if (slab.incentivePct != null) return `${slab.incentivePct}%`;
  if (slab.incentiveAmount != null) return inr(slab.incentiveAmount);
  return '—';
}

function IncentivesPageInner() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const canManage = hasPermission('sales.incentive.manage');
  const canPickOwner = hasPermission('sales.targets.manage');

  const currentUserId = user ? Number(user.id) : undefined;

  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [ownerId, setOwnerId] = useState<number | undefined>(currentUserId);
  const [slabs, setSlabs] = useState<IncentiveSlab[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IncentiveSlab | null>(null);
  const [form, setForm] = useState<SlabFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load assignable users once (only managers pick another owner).
  useEffect(() => {
    if (!canPickOwner) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAssignableUsers();
        if (!cancelled) setUsers(list);
      } catch {
        /* selector is optional — silently ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canPickOwner]);

  const loadSlabs = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchIncentiveSlabs(ownerId);
      // Sort by lower bound for a readable ladder.
      list.sort((a, b) => a.minAchievementPct - b.minAchievementPct);
      setSlabs(list);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to load incentive slabs', 'error');
      setSlabs([]);
    } finally {
      setIsLoading(false);
    }
  }, [ownerId, toast]);

  useEffect(() => {
    loadSlabs();
  }, [loadSlabs]);

  const ownerOptions = useMemo(
    () => users.map((u) => ({ value: String(u.id), label: u.name })),
    [users]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (slab: IncentiveSlab) => {
    setEditing(slab);
    setForm({
      minAchievementPct: String(slab.minAchievementPct),
      maxAchievementPct: slab.maxAchievementPct == null ? '' : String(slab.maxAchievementPct),
      mode: slab.incentiveAmount != null && slab.incentivePct == null ? 'amount' : 'percent',
      incentivePct: slab.incentivePct == null ? '' : String(slab.incentivePct),
      incentiveAmount: slab.incentiveAmount == null ? '' : String(slab.incentiveAmount),
    });
    setFormError('');
    setModalOpen(true);
  };

  const validateAndBuild = (): IncentiveSlabPayload | null => {
    const min = Number(form.minAchievementPct);
    if (form.minAchievementPct.trim() === '' || Number.isNaN(min) || min < 0) {
      setFormError('Enter a valid non-negative minimum achievement %.');
      return null;
    }

    let max: number | null = null;
    if (form.maxAchievementPct.trim() !== '') {
      max = Number(form.maxAchievementPct);
      if (Number.isNaN(max) || max < 0) {
        setFormError('Enter a valid non-negative maximum achievement % (or leave blank for an open-ended top slab).');
        return null;
      }
      if (max <= min) {
        setFormError('Maximum % must be greater than the minimum %.');
        return null;
      }
    }

    const payload: IncentiveSlabPayload = {
      minAchievementPct: min,
      maxAchievementPct: max,
      incentivePct: null,
      incentiveAmount: null,
    };

    if (form.mode === 'percent') {
      const pct = Number(form.incentivePct);
      if (form.incentivePct.trim() === '' || Number.isNaN(pct) || pct < 0) {
        setFormError('Enter a valid non-negative incentive %.');
        return null;
      }
      payload.incentivePct = pct;
    } else {
      const amt = Number(form.incentiveAmount);
      if (form.incentiveAmount.trim() === '' || Number.isNaN(amt) || amt < 0) {
        setFormError('Enter a valid non-negative incentive amount.');
        return null;
      }
      payload.incentiveAmount = amt;
    }

    if (ownerId != null) payload.ownerId = ownerId;
    return payload;
  };

  const handleSave = async () => {
    const payload = validateAndBuild();
    if (!payload) return;
    try {
      setIsSaving(true);
      if (editing) {
        await updateIncentiveSlab(editing.id, payload);
        toast('Incentive slab updated', 'success');
      } else {
        await createIncentiveSlab(payload);
        toast('Incentive slab created', 'success');
      }
      setModalOpen(false);
      await loadSlabs();
    } catch (error: unknown) {
      // Backend rejects overlapping slabs — surface its message.
      toast(error instanceof Error ? error.message : 'Failed to save incentive slab', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (slab: IncentiveSlab) => {
    const ok = await confirm({
      title: 'Delete incentive slab',
      message: `Delete the ${rangeLabel(slab)} slab? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteIncentiveSlab(slab.id);
      toast('Incentive slab deleted', 'success');
      await loadSlabs();
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to delete incentive slab', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Incentive Slabs', href: '/dashboard/sales/incentives' },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Incentive Slabs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Map achievement ranges to incentive payouts. Incentive is computed live from target achievement.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={openCreate}>
            <Plus size={18} /> Add Slab
          </Button>
        )}
      </div>

      {/* BDE selector (managers only) */}
      {canPickOwner && ownerOptions.length > 0 && (
        <Card className="border border-gray-200 p-4 dark:border-gray-700">
          <div className="max-w-xs">
            <SelectField
              id="incentive-owner"
              label="Business Development Executive"
              options={ownerOptions}
              value={ownerId != null ? String(ownerId) : ''}
              placeholder="Select a BDE"
              onChange={(v) => setOwnerId(v ? Number(v) : undefined)}
            />
          </div>
        </Card>
      )}

      {/* Example structure hint */}
      <Card className="border border-dashed border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
          <Info size={14} /> Example slab structure
        </p>
        <p className="mt-1.5 text-xs text-blue-600/90 dark:text-blue-300/80">
          0–50% → 0% &nbsp;·&nbsp; 50–80% → 2% &nbsp;·&nbsp; 80–100% → 5% &nbsp;·&nbsp; 100%+ → 8%
        </p>
      </Card>

      {/* Slab list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : slabs.length === 0 ? (
        <EmptyState
          icon={<Coins size={32} />}
          title="No incentive slabs configured"
          description={
            canManage
              ? 'Add slabs to define how achievement translates into incentives.'
              : 'No incentive slabs have been configured yet.'
          }
          actionLabel={canManage ? 'Add Slab' : undefined}
          onAction={canManage ? openCreate : undefined}
        />
      ) : (
        <Card className="overflow-hidden border border-gray-200 p-0 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                  <th className="px-4 py-3">Achievement Range</th>
                  <th className="px-4 py-3">Incentive</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {slabs.map((slab) => (
                  <tr key={slab.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <Badge variant="info">{rangeLabel(slab)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                        {slab.incentivePct != null && <Percent size={13} className="text-emerald-500" />}
                        {incentiveLabel(slab)}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(slab)}>
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(slab)}>
                            <Trash2 size={14} /> Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Incentive Slab' : 'Add Incentive Slab'}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define the achievement range and the incentive it earns. Leave the maximum blank for an open-ended top slab (e.g. 100%+).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              id="slab-min"
              label="Min Achievement %"
              type="number"
              min={0}
              placeholder="e.g. 80"
              value={form.minAchievementPct}
              onChange={(v) => {
                setForm((f) => ({ ...f, minAchievementPct: v }));
                if (formError) setFormError('');
              }}
              required
            />
            <InputField
              id="slab-max"
              label="Max Achievement %"
              type="number"
              min={0}
              placeholder="blank = open"
              value={form.maxAchievementPct}
              onChange={(v) => {
                setForm((f) => ({ ...f, maxAchievementPct: v }));
                if (formError) setFormError('');
              }}
            />
          </div>

          <SelectField
            id="slab-mode"
            label="Incentive Type"
            options={MODE_OPTIONS}
            value={form.mode}
            onChange={(v) => {
              setForm((f) => ({ ...f, mode: v as IncentiveMode }));
              if (formError) setFormError('');
            }}
          />

          {form.mode === 'percent' ? (
            <InputField
              id="slab-incentive-pct"
              label="Incentive %"
              type="number"
              min={0}
              placeholder="e.g. 5"
              value={form.incentivePct}
              onChange={(v) => {
                setForm((f) => ({ ...f, incentivePct: v }));
                if (formError) setFormError('');
              }}
              required
            />
          ) : (
            <InputField
              id="slab-incentive-amount"
              label="Fixed Amount (INR)"
              type="number"
              min={0}
              placeholder="e.g. 10000"
              value={form.incentiveAmount}
              onChange={(v) => {
                setForm((f) => ({ ...f, incentiveAmount: v }));
                if (formError) setFormError('');
              }}
              required
            />
          )}

          {formError && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-500" role="alert">
              <Info size={13} className="shrink-0" /> {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              {editing ? 'Save Changes' : 'Create Slab'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function IncentivesPage() {
  return (
    <PermissionPageGuard module="sales">
      <IncentivesPageInner />
    </PermissionPageGuard>
  );
}
