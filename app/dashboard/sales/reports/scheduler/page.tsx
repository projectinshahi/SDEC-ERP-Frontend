'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  fetchReportSchedules,
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
} from '@/lib/api/salesReports';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type {
  ReportSchedule,
  ReportFrequency,
  CreateReportSchedulePayload,
  DailyReportState,
} from '@/lib/types/salesReports';
import type { AssignableUser } from '@/lib/types/lead';

const FREQUENCY_OPTIONS: { value: ReportFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const FREQUENCY_LABEL: Record<ReportFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const STATUS_VARIANT: Record<DailyReportState, BadgeVariant> = {
  generated: 'success',
  pending: 'warning',
  failed: 'danger',
};
const STATUS_LABEL: Record<DailyReportState, string> = {
  generated: 'Generated',
  pending: 'Pending',
  failed: 'Failed',
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface FormState {
  name: string;
  frequency: ReportFrequency;
  executionTime: string; // HH:MM
  recipients: number[];
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  frequency: 'daily',
  executionTime: '08:00',
  recipients: [],
  active: true,
};

function SchedulerContent() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canConfigure = hasPermission('sales.config');

  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<ReportSchedule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, [users]);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReportSchedules();
      setSchedules(data);
    } catch {
      setSchedules([]);
      toast('Failed to load report schedules.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    let active = true;
    fetchAssignableUsers()
      .then((u) => {
        if (active) setUsers(u);
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (schedule: ReportSchedule) => {
    setEditing(schedule);
    setForm({
      name: schedule.name,
      frequency: schedule.frequency,
      executionTime: schedule.nextRunAt
        ? new Date(schedule.nextRunAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : '08:00',
      recipients: schedule.recipients ?? [],
      active: schedule.active,
    });
    setFormError('');
    setModalOpen(true);
  };

  const toggleRecipient = (id: number) => {
    setForm((prev) => ({
      ...prev,
      recipients: prev.recipients.includes(id)
        ? prev.recipients.filter((r) => r !== id)
        : [...prev.recipients, id],
    }));
  };

  const handleSubmit = async () => {
    if (!canConfigure) return;
    const name = form.name.trim();
    if (!name) {
      setFormError('Schedule name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload: CreateReportSchedulePayload = {
      name,
      frequency: form.frequency,
      executionTime: form.executionTime || undefined,
      recipients: form.recipients,
      active: form.active,
    };
    try {
      if (editing) {
        await updateReportSchedule(editing.id, payload);
        toast('Schedule updated.', 'success');
      } else {
        await createReportSchedule(payload);
        toast('Schedule created.', 'success');
      }
      setModalOpen(false);
      await loadSchedules();
    } catch {
      toast(`Failed to ${editing ? 'update' : 'create'} the schedule.`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (schedule: ReportSchedule) => {
    if (!canConfigure) return;
    setTogglingId(schedule.id);
    try {
      await updateReportSchedule(schedule.id, { active: !schedule.active });
      toast(schedule.active ? 'Schedule disabled.' : 'Schedule enabled.', 'success');
      await loadSchedules();
    } catch {
      toast('Failed to update the schedule.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (schedule: ReportSchedule) => {
    if (!canConfigure) return;
    const ok = await confirm({
      title: 'Delete schedule',
      message: `Delete "${schedule.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteReportSchedule(schedule.id);
      toast('Schedule deleted.', 'success');
      await loadSchedules();
    } catch {
      toast('Failed to delete the schedule.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sales', href: '/dashboard/sales/pipeline' },
            { label: 'Report Scheduler', href: '/dashboard/sales/reports/scheduler' },
          ]}
        />
        {canConfigure && (
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Report Scheduler</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Automate delivery of sales reports to your team on a recurring basis.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-9 w-9" />}
          title="No report schedules configured"
          description="Create a schedule to automatically deliver sales reports to recipients."
          actionLabel={canConfigure ? 'New Schedule' : undefined}
          onAction={canConfigure ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id} variant="outlined" className="flex flex-col">
              <CardBody className="flex flex-col gap-4 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{schedule.name}</h3>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <Badge variant="info">{FREQUENCY_LABEL[schedule.frequency]}</Badge>
                      <Badge variant={schedule.active ? 'success' : 'default'}>
                        {schedule.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="sr-only">Recipients</dt>
                    <dd>
                      {schedule.recipients?.length ?? 0}{' '}
                      {(schedule.recipients?.length ?? 0) === 1 ? 'recipient' : 'recipients'}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="sr-only">Last run</dt>
                    <dd className="flex items-center gap-2">
                      <span>Last run {formatDateTime(schedule.lastRunAt)}</span>
                      {schedule.lastStatus && (
                        <Badge variant={STATUS_VARIANT[schedule.lastStatus]}>
                          {STATUS_LABEL[schedule.lastStatus]}
                        </Badge>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="sr-only">Next run</dt>
                    <dd>Next run {formatDateTime(schedule.nextRunAt)}</dd>
                  </div>
                </dl>

                {canConfigure && (
                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(schedule)}
                      disabled={togglingId === schedule.id}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50 transition-colors"
                    >
                      {schedule.active ? 'Disable' : 'Enable'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(schedule)}
                        className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        aria-label={`Edit ${schedule.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(schedule)}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        aria-label={`Delete ${schedule.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!canConfigure && schedule.recipients?.length > 0 && (
                  <p className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/80 text-xs text-gray-400 truncate">
                    {schedule.recipients
                      .map((id) => userNameById.get(id) ?? `User #${id}`)
                      .join(', ')}
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {canConfigure && (
        <Modal
          isOpen={modalOpen}
          onClose={() => !saving && setModalOpen(false)}
          title={editing ? 'Edit Schedule' : 'New Schedule'}
          size="lg"
        >
          <div className="space-y-5">
            <InputField
              id="schedule-name"
              label="Name"
              required
              placeholder="e.g. Weekly team summary"
              value={form.name}
              onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
              error={formError || undefined}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="schedule-frequency"
                label="Frequency"
                value={form.frequency}
                onChange={(v) => setForm((prev) => ({ ...prev, frequency: v as ReportFrequency }))}
                options={FREQUENCY_OPTIONS}
              />
              <InputField
                id="schedule-time"
                label="Execution time"
                type="time"
                value={form.executionTime}
                onChange={(v) => setForm((prev) => ({ ...prev, executionTime: v }))}
                icon={Clock}
              />
            </div>

            {/* Recipients multi-select */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Recipients{' '}
                <span className="font-medium text-gray-400">
                  ({form.recipients.length} selected)
                </span>
              </label>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {users.length === 0 ? (
                  <p className="px-3.5 py-4 text-sm text-gray-400">No users available.</p>
                ) : (
                  users.map((u) => {
                    const checked = form.recipients.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(u.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{u.name}</span>
                          <span className="block text-xs text-gray-400 truncate">{u.email}</span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <ToggleSwitch
              id="schedule-active"
              label="Active"
              description="Enable automatic delivery on the configured schedule."
              checked={form.active}
              onChange={(v) => setForm((prev) => ({ ...prev, active: v }))}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} isLoading={saving}>
                {editing ? 'Save Changes' : 'Create Schedule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ReportSchedulerPage() {
  return (
    <PermissionPageGuard require="sales.config">
      <SchedulerContent />
    </PermissionPageGuard>
  );
}
