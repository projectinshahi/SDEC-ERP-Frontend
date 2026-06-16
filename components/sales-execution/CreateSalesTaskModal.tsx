'use client';

/**
 * SE-023 — Create Sales Task modal.
 *
 * A task MUST belong to exactly one Lead OR one Deal. When a preset parent is
 * supplied (from a lead/deal detail page) the parent is locked; otherwise the
 * user picks a target via a Lead | Deal segmented selector + a searchable
 * SelectField populated from the leads / pipeline-deals APIs.
 */

import { useEffect, useMemo, useState } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { createSalesTask } from '@/lib/api/salesTasks';
import { fetchLeads, fetchAssignableUsers } from '@/lib/api/leads';
import { fetchPipelineDeals } from '@/lib/api/pipeline';
import { classNames } from '@/lib/utils';
import type { CreateSalesTaskPayload, SalesTaskType, SalesTaskPriority } from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

interface CreateSalesTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  presetLeadId?: number;
  presetDealId?: number;
}

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

export function CreateSalesTaskModal({
  isOpen,
  onClose,
  onCreated,
  presetLeadId,
  presetDealId,
}: CreateSalesTaskModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const hasPreset = presetLeadId != null || presetDealId != null;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<SalesTaskType>('follow_up');
  const [priority, setPriority] = useState<SalesTaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [notes, setNotes] = useState('');

  const [parentKind, setParentKind] = useState<'lead' | 'deal'>(presetDealId != null ? 'deal' : 'lead');
  const [parentId, setParentId] = useState('');

  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [leadOptions, setLeadOptions] = useState<ParentOption[]>([]);
  const [dealOptions, setDealOptions] = useState<ParentOption[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; parent?: string }>({});

  // Reset + seed the form whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setType('follow_up');
    setPriority('medium');
    setDueDate('');
    setNotes('');
    setErrors({});
    setAssigneeId(user?.id ? String(user.id) : '');
    setParentKind(presetDealId != null ? 'deal' : 'lead');
    setParentId('');
  }, [isOpen, user?.id, presetDealId, presetLeadId]);

  // Load reference data once the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    fetchAssignableUsers()
      .then((users) => active && setAssignees(users))
      .catch(() => active && setAssignees([]));

    if (!hasPreset) {
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
    }

    return () => {
      active = false;
    };
  }, [isOpen, hasPreset]);

  const assigneeOptions = useMemo(
    () => assignees.map((a) => ({ value: String(a.id), label: a.role ? `${a.name} (${a.role})` : a.name })),
    [assignees]
  );

  const handleSubmit = async () => {
    const nextErrors: { title?: string; parent?: string } = {};
    if (!title.trim()) nextErrors.title = 'Title is required';
    if (!hasPreset && !parentId) {
      nextErrors.parent = `Select a ${parentKind === 'lead' ? 'lead' : 'deal'} to link this task to`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateSalesTaskPayload = {
      title: title.trim(),
      type,
      priority,
      dueDate: dueDate || null,
      notes: notes.trim() || null,
    };
    if (assigneeId) payload.assigneeId = Number(assigneeId);

    // Exactly one parent — preset takes precedence, else the picked target.
    if (presetDealId != null) payload.dealId = presetDealId;
    else if (presetLeadId != null) payload.leadId = presetLeadId;
    else if (parentKind === 'deal') payload.dealId = Number(parentId);
    else payload.leadId = Number(parentId);

    try {
      setSubmitting(true);
      await createSalesTask(payload);
      toast('Task created', 'success');
      onCreated();
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const presetLabel = presetDealId != null ? 'Linked to deal' : 'Linked to lead';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Sales Task" size="lg">
      <div className="space-y-4">
        <InputField
          id="task-title"
          label="Title"
          required
          placeholder="e.g. Follow up on proposal"
          value={title}
          onChange={setTitle}
          error={errors.title}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="task-type"
            label="Type"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(v) => setType(v as SalesTaskType)}
          />
          <SelectField
            id="task-priority"
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={(v) => setPriority(v as SalesTaskPriority)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            id="task-due"
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={setDueDate}
          />
          <SelectField
            id="task-assignee"
            label="Assignee"
            placeholder="Select assignee"
            options={assigneeOptions}
            value={assigneeId}
            onChange={setAssigneeId}
          />
        </div>

        {/* Parent picker */}
        {hasPreset ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
            {presetLabel} — this task will be attached to the current record.
          </div>
        ) : (
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
                id="task-parent"
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
        )}

        <TextareaField
          id="task-notes"
          label="Notes"
          rows={3}
          placeholder="Optional context for this task…"
          value={notes}
          onChange={setNotes}
        />

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
            Create Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
