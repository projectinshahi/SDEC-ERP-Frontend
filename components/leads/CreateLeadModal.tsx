'use client';

import { useState, useEffect, useMemo } from 'react';
import { Phone, Mail, Globe, MessageCircle, Megaphone, Users, MoreHorizontal, Plus, ChevronDown, ChevronUp, Handshake } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { classNames } from '@/lib/utils';
import { SELECTABLE_LEAD_SOURCES } from '@/lib/data/leadSources';
import { TEMPERATURE_OPTIONS, type LeadTemperature } from '@/lib/data/leadTemperature';
import {
  sanitizeText,
  validateName,
  validateTextField,
  validateLongText,
  validateEmail,
  validatePhone,
  validateAmount,
} from '@/lib/validation';
import {
  createManualLead,
  fetchAssignableUsers,
  type CreateLeadPayload,
} from '@/lib/api/leads';
import type { AssignableUser } from '@/lib/types/lead';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired after a lead is created so the parent can refresh its list. */
  onCreated: () => void;
}

// Channels a lead may be captured through (must match the backend
// MANUAL_LEAD_SOURCES whitelist / SELECTABLE_LEAD_SOURCES).
const SOURCE_OPTIONS = [
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'meta_ads', label: 'Meta Ads', icon: Megaphone },
  { value: 'referral', label: 'Referrals', icon: Users },
  { value: 'face_to_face', label: 'Face-to-Face', icon: Handshake },
  { value: 'other', label: 'Others', icon: MoreHorizontal },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// Next-action types (values map to the follow-up `type` stored server-side).
const ACTION_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'demo', label: 'Demo' },
  { value: 'other', label: 'Other' },
];

// Email and phone validation now delegated to @/lib/validation.

/** Returns tomorrow (same time) as a value for the date-time picker. */
function tomorrowDateTimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/**
 * Create-lead modal. Captures lead details, syncs notes to the lead's editable
 * Notes section, and can create an optional first "next action" (follow-up task)
 * together with the lead — all without leaving the Leads page.
 *
 * Mounted only while open (the parent gates rendering), so state is initialised
 * fresh on each open via useState initialisers — no reset effect needed.
 */
export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const meId = user?.id ? String(user.id) : '';

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    source: '',
    ownerId: meId,
    industry: '',
    website: '',
    address: '',
    leadValue: '',
    priority: 'medium',
    temperature: 'COLD',
    notes: '',
    referralName: '',
  });

  const [withAction, setWithAction] = useState(false);
  const [action, setAction] = useState({
    type: 'call',
    title: '',
    description: '',
    assignedTo: meId,
    dueDate: tomorrowDateTimeLocal(),
    priority: 'medium',
  });

  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, []);

  // Owner / assignee options — always include the current user as a fallback.
  const ownerOptions = useMemo(() => {
    const opts = owners.map((o) => ({ value: String(o.id), label: o.name }));
    if (meId && !owners.some((o) => String(o.id) === meId)) {
      opts.unshift({ value: meId, label: `${user?.name || 'Me'} (You)` });
    }
    return opts;
  }, [owners, meId, user?.name]);

  // Set a field and immediately clear its validation error (real-time feedback).
  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };
  const setAct = (key: keyof typeof action, value: string) => {
    setAction((a) => ({ ...a, [key]: value }));
    // Clear related action errors.
    if (key === 'title') setErrors((p) => { const n = { ...p }; delete n.actionTitle; return n; });
    if (key === 'description') setErrors((p) => { const n = { ...p }; delete n.actionDescription; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    // ── Lead Name (required, name-rules) ──────────────────────────────────
    const nameErr = validateName(form.name, 'Lead Name');
    if (nameErr) e.name = nameErr;

    // ── Contact: at least email or phone ──────────────────────────────────
    if (!form.email.trim() && !form.phone.trim()) {
      e.contact = 'Email or phone number is required.';
    }

    // ── Email ─────────────────────────────────────────────────────────────
    const emailErr = validateEmail(form.email, 'Email');
    if (emailErr) e.email = emailErr;

    // ── Phone ─────────────────────────────────────────────────────────────
    const phoneErr = validatePhone(form.phone, 'Phone number');
    if (phoneErr) e.phone = phoneErr;

    // ── Source ────────────────────────────────────────────────────────────
    if (!form.source) e.source = 'Lead source is required.';
    else if (form.source === 'referral') {
      const refErr = validateName(form.referralName, 'Referral Name', { maxLength: 200 });
      if (refErr) e.referralName = refErr;
      else if (!form.referralName.trim()) e.referralName = 'Referral Name is required.';
    }

    // ── Company ───────────────────────────────────────────────────────────
    const companyErr = validateTextField(form.company, 'Company', { maxLength: 200 });
    if (companyErr) e.company = companyErr;

    // ── Industry ──────────────────────────────────────────────────────────
    const industryErr = validateTextField(form.industry, 'Industry', { maxLength: 100 });
    if (industryErr) e.industry = industryErr;

    // ── Website ───────────────────────────────────────────────────────────
    const websiteErr = validateTextField(form.website, 'Website', { maxLength: 500 });
    if (websiteErr) e.website = websiteErr;

    // ── Location / Address ────────────────────────────────────────────────
    const addressErr = validateTextField(form.address, 'Location', { maxLength: 500 });
    if (addressErr) e.address = addressErr;

    // ── Lead Value ────────────────────────────────────────────────────────
    if (!form.leadValue.trim()) {
      e.leadValue = 'Lead Value is required.';
    } else {
      const valueErr = validateAmount(form.leadValue, 'Lead Value');
      if (valueErr) e.leadValue = valueErr;
    }

    // ── Notes ─────────────────────────────────────────────────────────────
    const notesErr = validateLongText(form.notes, 'Notes', { maxLength: 5000 });
    if (notesErr) e.notes = notesErr;

    // ── Next Action (optional section) ────────────────────────────────────
    if (withAction) {
      const actionTitleErr = validateName(action.title, 'Action title', { maxLength: 200 });
      if (actionTitleErr) e.actionTitle = actionTitleErr;
      if (!action.dueDate) e.actionDue = 'A due date & time is required.';
      const actionDescErr = validateLongText(action.description, 'Action description', { maxLength: 2000 });
      if (actionDescErr) e.actionDescription = actionDescErr;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    const payload: CreateLeadPayload = {
      name: sanitizeText(form.name),
      company: sanitizeText(form.company) || undefined,
      email: form.email.trim().toLowerCase() || undefined,
      phone: form.phone.trim() || undefined,
      source: form.source,
      ownerId: form.ownerId ? Number(form.ownerId) : undefined,
      industry: sanitizeText(form.industry) || undefined,
      website: form.website.trim() || undefined,
      address: sanitizeText(form.address) || undefined,
      leadValue: form.leadValue.trim() || undefined,
      priority: form.priority,
      temperature: form.temperature as LeadTemperature,
      notes: form.notes.trim() || undefined,
      referralName: form.source === 'referral' ? sanitizeText(form.referralName) || undefined : undefined,
    };
    if (withAction) {
      payload.nextAction = {
        type: action.type,
        title: action.title.trim(),
        description: action.description.trim() || undefined,
        assignedTo: action.assignedTo ? Number(action.assignedTo) : undefined,
        dueDate: new Date(action.dueDate).toISOString(),
        priority: action.priority,
      };
    }

    try {
      setIsSubmitting(true);
      await createManualLead(payload);
      toast('Lead created successfully', 'success');
      onCreated();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create lead';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Lead" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
        {submitError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            {submitError}
          </div>
        )}
        {/* Lead Information */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Lead Information</h3>

          {/* Source — manual capture is Phone / Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Lead Source <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SOURCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form.source === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('source', opt.value)}
                    className={classNames(
                      'flex items-center gap-2 p-3 rounded-xl border text-left transition-colors',
                      active
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                    )}
                  >
                    <Icon className={classNames('w-5 h-5', active ? 'text-blue-600' : 'text-gray-400')} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.source && (
              <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.source}</p>
            )}
          </div>

          <InputField
            label="Lead Name" id="lead-name" required
            value={form.name} onChange={(v) => set('name', v)} error={errors.name}
            placeholder="e.g. John Doe"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Company" id="lead-company" value={form.company} onChange={(v) => set('company', v)} error={errors.company} placeholder="e.g. ABC Technologies" />
            <SelectField
              label="Owner" id="lead-owner" value={form.ownerId} onChange={(v) => set('ownerId', v)}
              placeholder="Assign to…" options={ownerOptions}
            />
            <InputField
              label="Email" id="lead-email" type="email" value={form.email}
              onChange={(v) => set('email', v)} error={errors.email}
              placeholder="name@company.com"
            />
            <InputField
              label="Phone" id="lead-phone" value={form.phone}
              onChange={(v) => set('phone', v)} error={errors.phone}
              placeholder="+1 555 123 4567"
            />
            <InputField label="Industry" id="lead-industry" value={form.industry} onChange={(v) => set('industry', v)} error={errors.industry} />
            <InputField label="Website" id="lead-website" value={form.website} onChange={(v) => set('website', v)} error={errors.website} placeholder="https://" />
            <InputField label="Location" id="lead-location" value={form.address} onChange={(v) => set('address', v)} error={errors.address} placeholder="City / address" />
            <InputField label="Lead Value" id="lead-value" required value={form.leadValue} onChange={(v) => set('leadValue', v)} error={errors.leadValue} placeholder="e.g. 5000" />
            {/* Removed duplicate SelectField for Lead Source */}
            {form.source === 'referral' && (
              <InputField
                label="Referral Name"
                id="referralName"
                value={form.referralName}
                onChange={(v) => set('referralName', v)}
                error={errors.referralName}
                required
                placeholder="Name of person or organization who referred this lead"
              />
            )}
            <SelectField
              label="Priority" id="lead-priority" value={form.priority} onChange={(v) => set('priority', v)}
              options={PRIORITY_OPTIONS}
            />
            <SelectField
              label="Lead Temperature" id="lead-temperature" value={form.temperature} onChange={(v) => set('temperature', v)}
              options={TEMPERATURE_OPTIONS}
              required
            />
          </div>
          {errors.contact && (
            <p className="text-red-500 text-xs font-semibold">{errors.contact}</p>
          )}
          <p className="text-xs text-gray-400">Provide at least an email or a phone number.</p>
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Notes</h3>
          <TextareaField
            label="Notes" id="lead-notes" rows={4}
            value={form.notes} onChange={(v) => set('notes', v)}
            error={errors.notes}
            maxLength={5000} showCharCount
            placeholder="What is the lead interested in? Notes appear in the lead's Notes section and can be edited later."
          />
        </section>

        {/* Next Action (optional) */}
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setWithAction((v) => !v)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={withAction}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Next Action <span className="font-medium normal-case tracking-normal">(optional)</span>
            </span>
            {withAction ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {!withAction ? (
            <button
              type="button"
              onClick={() => setWithAction(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add an initial next action
            </button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Action Type" id="action-type" value={action.type}
                  onChange={(v) => setAct('type', v)} options={ACTION_TYPES}
                />
                <SelectField
                  label="Priority" id="action-priority" value={action.priority}
                  onChange={(v) => setAct('priority', v)} options={PRIORITY_OPTIONS}
                />
              </div>
              <InputField
                label="Action Title" id="action-title" required
                value={action.title} onChange={(v) => setAct('title', v)} error={errors.actionTitle}
                placeholder="e.g. Call client about proposal"
              />
              <TextareaField
                label="Description" id="action-description" rows={2}
                value={action.description} onChange={(v) => setAct('description', v)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Assigned To" id="action-assignee" value={action.assignedTo}
                  onChange={(v) => setAct('assignedTo', v)} placeholder="Assign to…" options={ownerOptions}
                />
                <DateTimePicker
                  label="Due Date & Time" id="action-due" required
                  value={action.dueDate} onChange={(v) => setAct('dueDate', v)} error={errors.actionDue}
                />
              </div>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Create Lead</Button>
        </div>
      </form>
    </Modal>
  );
}
