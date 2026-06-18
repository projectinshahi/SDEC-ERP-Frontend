'use client';

/**
 * SE-027 — Recurring task rules.
 *
 * Self-contained manager for recurrence rules: lists every rule (cadence, next
 * run, parent lead/deal, active state) and offers a "New recurring task" modal,
 * an enable/disable toggle and a delete action — all gated by sales permissions.
 * A recurrence rule belongs to exactly one Lead OR one Deal (like tasks).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Repeat,
  Plus,
  Trash2,
  Target,
  TrendingUp,
  CalendarClock,
  User,
  Power,
  PowerOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchRecurrenceRules,
  createRecurrenceRule,
  updateRecurrenceRule,
  deleteRecurrenceRule,
} from '@/lib/api/recurringTasks';
import { fetchLeads, fetchAssignableUsers } from '@/lib/api/leads';
import { fetchPipelineDeals } from '@/lib/api/pipeline';
import { classNames } from '@/lib/utils';
import type {
  RecurrenceRule,
  CreateRecurrenceRulePayload,
  RecurrenceFrequency,
  SalesTaskType,
  SalesTaskPriority,
} from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

interface ParentOption {
  value: string;
  label: string;
}

const TYPE_OPTIONS: { value: SalesTaskType; label: string }[] = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'proposal_review', label: 'Proposal Review' },
];

const PRIORITY_OPTIONS: { value: SalesTaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const FREQUENCY_PLURAL: Record<RecurrenceFrequency, string> = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
};

/** Human cadence label, e.g. "Every 2 weeks" / "Weekly". */
function cadenceLabel(frequency: RecurrenceFrequency, interval: number): string {
  if (interval <= 1) {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }
  return `Every ${interval} ${FREQUENCY_PLURAL[frequency]}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'MMM d, yyyy');
  } catch {
    return value;
  }
}

export function RecurringTasksList() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('sales.create');
  const canEdit = hasPermission('sales.edit');
  const canDelete = hasPermission('sales.delete');

  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setRules(await fetchRecurrenceRules());
    } catch (error: any) {
      toast(error?.message || 'Failed to load recurring tasks', 'error');
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (rule: RecurrenceRule) => {
    try {
      setTogglingId(rule.id);
      await updateRecurrenceRule(rule.id, { active: !rule.active });
      toast(rule.active ? 'Recurring task paused' : 'Recurring task resumed', 'success');
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to update recurring task', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (rule: RecurrenceRule) => {
    const ok = await confirm({
      title: 'Delete recurring task',
      message: `Delete the recurring rule “${rule.title}”? Existing generated tasks are kept, but no new ones will be created.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteRecurrenceRule(rule.id);
      toast('Recurring task deleted', 'success');
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to delete recurring task', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Automatically generate follow-up tasks on a fixed cadence for a lead or deal.
        </p>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New recurring task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<Repeat size={32} />}
          title="No recurring tasks"
          description="Set up a recurring rule to auto-create calls, meetings or follow-ups on a schedule."
          actionLabel={canCreate ? 'New recurring task' : undefined}
          onAction={canCreate ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {rules.map((rule) => {
            const parentTitle = rule.deal?.title ?? rule.lead?.title ?? null;
            const ParentIcon = rule.dealId ? TrendingUp : Target;
            return (
              <div
                key={rule.id}
                className={classNames(
                  'group flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md dark:bg-gray-800',
                  rule.active
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 opacity-70 dark:border-gray-700'
                )}
              >
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
                  <Repeat size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {rule.title}
                    </h3>
                    <Badge variant={rule.active ? 'success' : 'default'}>
                      {rule.active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 font-medium text-violet-600 dark:text-violet-300">
                      <Repeat size={12} />
                      {cadenceLabel(rule.frequency, rule.interval)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <CalendarClock size={12} className="text-gray-400" />
                      Next run: {formatDate(rule.nextRunAt)}
                    </span>
                    {parentTitle && (
                      <span className="inline-flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
                        <ParentIcon size={12} className={rule.dealId ? 'text-violet-500' : 'text-amber-500'} />
                        <span className="max-w-[180px] truncate">{parentTitle}</span>
                      </span>
                    )}
                    {rule.assignee?.name && (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        {rule.assignee.name}
                      </span>
                    )}
                  </div>
                </div>

                {(canEdit || canDelete) && (
                  <div className="flex shrink-0 items-center gap-1 self-start opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rule)}
                        disabled={togglingId === rule.id}
                        title={rule.active ? 'Pause recurring task' : 'Resume recurring task'}
                        className={classNames(
                          'rounded-lg p-1.5 transition-colors disabled:opacity-50',
                          rule.active
                            ? 'text-gray-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/20'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                        )}
                      >
                        {rule.active ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(rule)}
                        title="Delete recurring task"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateRecurrenceRuleModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </div>
  );
}

// ── Create recurrence rule modal ──────────────────────────────────────────────

interface CreateRecurrenceRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateRecurrenceRuleModal({ isOpen, onClose, onCreated }: CreateRecurrenceRuleModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<SalesTaskType>('follow_up');
  const [priority, setPriority] = useState<SalesTaskPriority>('medium');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setIntervalValue] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [notes, setNotes] = useState('');

  const [parentKind, setParentKind] = useState<'lead' | 'deal'>('lead');
  const [parentId, setParentId] = useState('');

  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [leadOptions, setLeadOptions] = useState<ParentOption[]>([]);
  const [dealOptions, setDealOptions] = useState<ParentOption[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; startDate?: string; interval?: string; parent?: string }>({});

  // Reset + seed when opened.
  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setType('follow_up');
    setPriority('medium');
    setFrequency('weekly');
    setIntervalValue('1');
    setStartDate('');
    setEndDate('');
    setNotes('');
    setErrors({});
    setAssigneeId(user?.id ? String(user.id) : '');
    setParentKind('lead');
    setParentId('');
  }, [isOpen, user?.id]);

  // Load reference data when opened.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    fetchAssignableUsers()
      .then((users) => active && setAssignees(users))
      .catch(() => active && setAssignees([]));

    fetchLeads({})
      .then(
        (leads) =>
          active &&
          setLeadOptions(
            leads.map((l) => ({
              value: String(l.id),
              label: l.customer?.company ? `${l.title} — ${l.customer.company}` : l.title,
            }))
          )
      )
      .catch(() => active && setLeadOptions([]));

    fetchPipelineDeals({})
      .then(
        (res) =>
          active &&
          setDealOptions(
            res.deals.map((d) => ({
              value: String(d.id),
              label: d.customer?.company ? `${d.title} — ${d.customer.company}` : d.title,
            }))
          )
      )
      .catch(() => active && setDealOptions([]));

    return () => {
      active = false;
    };
  }, [isOpen]);

  const assigneeOptions = useMemo(
    () => assignees.map((a) => ({ value: String(a.id), label: a.role ? `${a.name} (${a.role})` : a.name })),
    [assignees]
  );

  const handleSubmit = async () => {
    const nextErrors: typeof errors = {};
    if (!title.trim()) nextErrors.title = 'Title is required';
    if (!startDate) nextErrors.startDate = 'Start date is required';
    const intervalNum = Number(interval);
    if (!Number.isInteger(intervalNum) || intervalNum < 1) {
      nextErrors.interval = 'Interval must be at least 1';
    }
    if (!parentId) {
      nextErrors.parent = `Select a ${parentKind} to link this rule to`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateRecurrenceRulePayload = {
      title: title.trim(),
      type,
      priority,
      frequency,
      interval: intervalNum,
      startDate,
      endDate: endDate || null,
      notes: notes.trim() || null,
    };
    if (assigneeId) payload.assigneeId = Number(assigneeId);
    if (parentKind === 'deal') payload.dealId = Number(parentId);
    else payload.leadId = Number(parentId);

    try {
      setSubmitting(true);
      await createRecurrenceRule(payload);
      toast('Recurring task created', 'success');
      onCreated();
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Failed to create recurring task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Recurring Task" size="lg">
      <div className="space-y-4">
        <InputField
          id="rec-title"
          label="Title"
          required
          placeholder="e.g. Weekly check-in call"
          value={title}
          onChange={setTitle}
          error={errors.title}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="rec-type"
            label="Type"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(v) => setType(v as SalesTaskType)}
          />
          <SelectField
            id="rec-priority"
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={(v) => setPriority(v as SalesTaskPriority)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="rec-frequency"
            label="Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(v) => setFrequency(v as RecurrenceFrequency)}
          />
          <InputField
            id="rec-interval"
            label="Repeat every (interval)"
            type="number"
            min={1}
            value={interval}
            onChange={setIntervalValue}
            error={errors.interval}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            id="rec-start"
            label="Start date"
            type="date"
            required
            value={startDate}
            onChange={setStartDate}
            error={errors.startDate}
          />
          <InputField
            id="rec-end"
            label="End date (optional)"
            type="date"
            value={endDate}
            onChange={setEndDate}
          />
        </div>

        <SelectField
          id="rec-assignee"
          label="Assignee"
          placeholder="Select assignee"
          options={assigneeOptions}
          value={assigneeId}
          onChange={setAssigneeId}
        />

        {/* Parent picker — exactly one Lead OR Deal */}
        <div className="space-y-1.5">
          <span className="block text-sm font-semibold text-gray-700">
            Link to <span className="ml-1 font-bold text-red-500">*</span>
          </span>
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
            {(['lead', 'deal'] as const).map((kind) => {
              const active = parentKind === kind;
              const Icon = kind === 'lead' ? Target : TrendingUp;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    setParentKind(kind);
                    setParentId('');
                    setErrors((e) => ({ ...e, parent: undefined }));
                  }}
                  className={classNames(
                    'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-300'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  )}
                >
                  <Icon size={14} />
                  {kind === 'lead' ? 'Lead' : 'Deal'}
                </button>
              );
            })}
          </div>
          <div className="pt-1">
            <SelectField
              id="rec-parent"
              label={parentKind === 'lead' ? 'Lead' : 'Deal'}
              placeholder={parentKind === 'lead' ? 'Select a lead' : 'Select a deal'}
              options={parentKind === 'lead' ? leadOptions : dealOptions}
              value={parentId}
              onChange={(v) => {
                setParentId(v);
                setErrors((e) => ({ ...e, parent: undefined }));
              }}
              error={errors.parent}
            />
          </div>
        </div>

        <TextareaField
          id="rec-notes"
          label="Notes"
          rows={3}
          placeholder="Optional context applied to each generated task…"
          value={notes}
          onChange={setNotes}
        />

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
            Create Recurring Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
