'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import {
  sanitizeText,
  validateName,
  validateLongText,
} from '@/lib/validation';
import {
  createDeal,
  updateDeal,
  fetchSalesCustomers,
  type CustomerOption,
} from '@/lib/api/leadLifecycle';
import type { Deal, DealStage } from '@/lib/types/leadLifecycle';
import type { AssignableUser } from '@/lib/types/lead';

interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Refresh the deals list / pipeline / analytics after a successful save. */
  onSaved: () => void;
  /** Provide a deal to EDIT / VIEW; omit to CREATE a new deal. */
  deal?: Deal | null;
  stages: DealStage[];
  owners: AssignableUser[];
  /** View-only (no sales.edit): renders disabled fields with no Save button. */
  readOnly?: boolean;
  /** Whether the user may assign the deal to ANOTHER owner (sales.assign). When
   *  false the owner is fixed to the creator/current owner (RBAC). */
  canAssignOwner?: boolean;
}

interface FieldErrors {
  title?: string;
  customerId?: string;
  amount?: string;
  probability?: string;
  notes?: string;
  description?: string;
}

/** ISO timestamp → 'YYYY-MM-DD' for a <input type="date">. */
function toDateInput(iso?: string | null): string {
  return iso ? String(iso).slice(0, 10) : '';
}

/**
 * Create / Edit / View a deal. Backed by the live deal APIs (POST /sales/deals,
 * PUT /sales/deals/:id) — no mock/local persistence. The "New Deal" button on the
 * Deals page opens this in CREATE mode; a row opens it in EDIT (sales.edit) or
 * read-only VIEW mode. On save it calls onSaved() so the list, pipeline counts
 * and analytics re-fetch from the database.
 */
export function DealFormModal({ isOpen, onClose, onSaved, deal, stages, owners, readOnly = false, canAssignOwner = false }: DealFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!deal;

  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [probability, setProbability] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Prefill (edit/view) or reset (create) whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSaving(false);
    if (deal) {
      setTitle(deal.title ?? '');
      setCustomerId(String(deal.customerId ?? ''));
      setAmount(deal.amount != null ? String(deal.amount) : '');
      setStage(deal.stage ?? '');
      setOwnerId(deal.ownerId != null ? String(deal.ownerId) : '');
      setProbability(deal.probability != null ? String(deal.probability) : '');
      setExpectedCloseDate(toDateInput(deal.expectedCloseDate));
      setNotes(deal.notes ?? '');
      setDescription(deal.description ?? '');
    } else {
      setTitle('');
      setCustomerId('');
      setAmount('');
      setStage(stages[0]?.name ?? '');
      setOwnerId('');
      setProbability('');
      setExpectedCloseDate('');
      setNotes('');
      setDescription('');
    }
  }, [isOpen, deal, stages]);

  // The "Linked Account" picker only needs the full customer list in CREATE mode
  // (edit can't reassign the account — updateDeal does not change customerId).
  useEffect(() => {
    if (!isOpen || isEdit || readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingCustomers(true);
        const data = await fetchSalesCustomers();
        if (!cancelled) setCustomers(data);
      } catch {
        if (!cancelled) toast('Failed to load accounts', 'error');
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isEdit, readOnly, toast]);

  const validate = (): boolean => {
    const next: FieldErrors = {};

    // ── Deal Name (required, name-rules) ─────────────────────────────────
    const nameErr = validateName(title, 'Deal Name');
    if (nameErr) next.title = nameErr;

    // ── Linked Account (required on create) ─────────────────────────────
    if (!isEdit && !customerId) next.customerId = 'Select a linked account.';

    // ── Deal Value ───────────────────────────────────────────────────────
    const value = Number(amount);
    const amountOk = isEdit ? value >= 0 : value > 0;
    if (amount === '' || isNaN(value) || !amountOk) {
      next.amount = isEdit ? 'Deal value cannot be negative.' : 'Deal value must be greater than 0.';
    }

    // ── Probability ──────────────────────────────────────────────────────
    if (probability !== '') {
      const p = Number(probability);
      if (isNaN(p) || p < 0 || p > 100) next.probability = 'Probability must be between 0 and 100.';
    }

    // ── Notes ─────────────────────────────────────────────────────────────
    const notesErr = validateLongText(notes, 'Notes', { maxLength: 5000 });
    if (notesErr) next.notes = notesErr;

    // ── Description ──────────────────────────────────────────────────────
    const descErr = validateLongText(description, 'Description', { maxLength: 10000 });
    if (descErr) next.description = descErr;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (readOnly || !validate()) return;
    const common = {
      title: sanitizeText(title),
      amount: Number(amount),
      stage: stage || undefined,
      ownerId: ownerId ? Number(ownerId) : undefined,
      probability: probability !== '' ? Number(probability) : undefined,
      expectedCloseDate: expectedCloseDate || null,
      notes: notes.trim() || null,
      description: description.trim() || null,
    };
    try {
      setSaving(true);
      if (deal) {
        await updateDeal(deal.id, common);
        toast('Deal updated', 'success');
      } else {
        await createDeal({ ...common, customerId: Number(customerId) });
        toast('Deal created', 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save deal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const customerOptions = customers.map((c) => ({
    value: String(c.id),
    label: c.company ? `${c.name} — ${c.company}` : c.name,
  }));
  const stageOptions = stages.map((s) => ({ value: s.name, label: s.name }));
  const ownerOptions = owners.map((o) => ({ value: String(o.id), label: o.name }));

  const title2 = readOnly ? 'Deal Details' : isEdit ? 'Edit Deal' : 'New Deal';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title2} size="lg">
      <div className="space-y-5">
        <InputField
          label="Deal Name"
          id="deal-title"
          value={title}
          onChange={(v) => { setTitle(v); setErrors((p) => ({ ...p, title: undefined })); }}
          placeholder="e.g. Annual ERP Licence — Acme Corp"
          required
          disabled={readOnly}
          error={errors.title}
        />

        {/* Linked Account: a picker on create; a fixed (read-only) value on edit/view
            since the backend does not reassign a deal's account. */}
        {isEdit || readOnly ? (
          <InputField
            label="Linked Account"
            id="deal-account"
            value={deal?.customer?.company ? `${deal?.customer?.name} — ${deal?.customer?.company}` : deal?.customer?.name ?? `Account #${deal?.customerId ?? ''}`}
            onChange={() => {}}
            disabled
          />
        ) : (
          <SelectField
            label="Linked Account"
            id="deal-account"
            options={customerOptions}
            value={customerId}
            onChange={(v) => {
              setCustomerId(v);
              setErrors((p) => ({ ...p, customerId: undefined }));
            }}
            placeholder={loadingCustomers ? 'Loading accounts…' : 'Select an account'}
            required
            error={errors.customerId}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Deal Value"
            id="deal-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setErrors((p) => ({ ...p, amount: undefined }));
            }}
            placeholder="0"
            required
            disabled={readOnly}
            error={errors.amount}
          />
          <InputField
            label="Probability (%)"
            id="deal-probability"
            type="number"
            min={0}
            max={100}
            value={probability}
            onChange={(v) => {
              setProbability(v);
              setErrors((p) => ({ ...p, probability: undefined }));
            }}
            placeholder="Follows the stage by default"
            disabled={readOnly}
            error={errors.probability}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Deal Stage"
            id="deal-stage"
            options={stageOptions}
            value={stage}
            onChange={setStage}
            placeholder="Select a stage"
            disabled={readOnly}
          />
          {canAssignOwner && !readOnly ? (
            <SelectField
              label="Deal Owner"
              id="deal-owner"
              options={ownerOptions}
              value={ownerId}
              onChange={setOwnerId}
              placeholder="Defaults to you"
            />
          ) : (
            // Without the assign permission the owner is fixed (defaults to the
            // creator on a new deal); shown read-only for context.
            <InputField
              label="Deal Owner"
              id="deal-owner"
              value={deal?.owner?.name ?? owners.find((o) => String(o.id) === ownerId)?.name ?? 'You (creator)'}
              onChange={() => {}}
              disabled
            />
          )}
        </div>

        <InputField
          label="Expected Close Date"
          id="deal-close-date"
          type="date"
          value={expectedCloseDate}
          onChange={setExpectedCloseDate}
          disabled={readOnly}
        />

        <TextareaField
          label="Notes"
          id="deal-notes"
          value={notes}
          onChange={(v) => { setNotes(v); setErrors((p) => ({ ...p, notes: undefined })); }}
          placeholder="Short internal note."
          rows={2}
          disabled={readOnly}
          error={errors.notes}
          maxLength={5000}
          showCharCount
        />

        <TextareaField
          label="Description"
          id="deal-description"
          value={description}
          onChange={(v) => { setDescription(v); setErrors((p) => ({ ...p, description: undefined })); }}
          placeholder="Full description of the deal, scope and context."
          rows={3}
          disabled={readOnly}
          error={errors.description}
          maxLength={10000}
          showCharCount
        />

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button variant="primary" onClick={handleSave} isLoading={saving}>
              {isEdit ? 'Save Changes' : 'Create Deal'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
