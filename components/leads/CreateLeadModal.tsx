'use client';

import { useState, useEffect, useMemo } from 'react';
import { Phone, Mail, Globe, MessageCircle, Megaphone, Users, MoreHorizontal, Plus, ChevronDown, ChevronUp, Handshake, Send } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { classNames } from '@/lib/utils';
import { TEMPERATURE_OPTIONS, type LeadTemperature } from '@/lib/data/leadTemperature';
import { DISTRICT_OPTIONS } from '@/lib/data/districts';
import {
  sanitizeText,
  validateName,
  validateTextField,
  validateLongText,
  validateEmail,
  validatePhone,
  validateAmount,
  focusFirstInvalid,
} from '@/lib/validation';
import {
  createManualLead,
  fetchAssignableUsers,
  type CreateLeadPayload,
} from '@/lib/api/leads';
import { fetchCompanyOptions, type Company } from '@/lib/api/companies';
import { fetchContacts, type Contact } from '@/lib/api/customers';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  OpportunityCompanySection,
  resolveCompanyId,
  emptyCompanySection,
  contactToFields,
  contactToCompanySection,
  type CompanySectionValue,
} from './OpportunityCompanySection';
import type { AssignableUser } from '@/lib/types/lead';

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
  { value: 'outreach', label: 'Outreach', icon: Send },
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

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired after a lead is created so the parent can refresh its list. */
  onCreated: () => void;
}

/** Returns tomorrow (same time) as a value for the date-time picker. */
function tomorrowDateTimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/**
 * Create-opportunity modal — a modern CRM form in four sections: Opportunity Details,
 * Contact Information, Company Information (with CRM Account selector), and Notes & Next
 * Action. Reuses the existing manual-lead + companies APIs; the Company section either
 * links an existing CRM account or auto-creates one via the Companies module on save.
 */
export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const meId = user?.id ? String(user.id) : '';

  const [form, setForm] = useState({
    // ── Opportunity Details ──
    title: '',
    source: '',
    ownerId: meId,
    leadValue: '',
    priority: 'medium',
    temperature: 'COLD',
    district: '',
    referralName: '',
    // ── Contact Information ──
    name: '',
    designation: '',
    phone: '',
    whatsapp: '',
    email: '',
    // ── Notes ──
    notes: '',
  });
  const [companySec, setCompanySec] = useState<CompanySectionValue>(emptyCompanySection());

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
    fetchCompanyOptions().then(setCompanies).catch(() => setCompanies([]));
    fetchContacts().then(setContacts).catch(() => setContacts([]));
  }, []);

  // Existing contact list for the searchable selector (reuses Contacts data).
  const contactOptions = useMemo(() => [
    { value: '', label: '— Enter contact manually —' },
    ...contacts.map((c) => ({ value: String(c.id), label: c.name, sublabel: [c.email, c.company].filter(Boolean).join(' · ') || undefined })),
  ], [contacts]);

  // Auto-fill the Contact Information section + sync the linked CRM Company (single source).
  const onSelectContact = (id: string) => {
    setSelectedContactId(id);
    const c = id ? contacts.find((x) => String(x.id) === id) : null;
    if (!c) return;
    setForm((f) => ({ ...f, ...contactToFields(c) }));
    setCompanySec(contactToCompanySection(c, companies));
  };

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
  const setCompany = (patch: Partial<CompanySectionValue>) => setCompanySec((c) => ({ ...c, ...patch }));
  const setAct = (key: keyof typeof action, value: string) => {
    setAction((a) => ({ ...a, [key]: value }));
    if (key === 'title') setErrors((p) => { const n = { ...p }; delete n.actionTitle; return n; });
    if (key === 'description') setErrors((p) => { const n = { ...p }; delete n.actionDescription; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    // Opportunity Name (required).
    const titleErr = validateName(form.title, 'Opportunity Name', { maxLength: 200 });
    if (titleErr) e.title = titleErr;
    // Contact Name (required).
    const nameErr = validateName(form.name, 'Contact Name');
    if (nameErr) e.name = nameErr;
    // Phone (required).
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    else {
      const phoneErr = validatePhone(form.phone, 'Phone number');
      if (phoneErr) e.phone = phoneErr;
    }
    // Email (optional — validated only when provided).
    const emailErr = validateEmail(form.email, 'Email');
    if (emailErr) e.email = emailErr;
    if (form.whatsapp.trim()) {
      const waErr = validatePhone(form.whatsapp, 'WhatsApp number');
      if (waErr) e.whatsapp = waErr;
    }
    // Source.
    if (!form.source) e.source = 'Lead source is required.';
    else if (form.source === 'referral') {
      const refErr = validateName(form.referralName, 'Referral Name', { maxLength: 200 });
      if (refErr) e.referralName = refErr;
      else if (!form.referralName.trim()) e.referralName = 'Referral Name is required.';
    }
    // Opportunity Value (required, existing rule).
    if (!form.leadValue.trim()) e.leadValue = 'Opportunity Value is required.';
    else {
      const valueErr = validateAmount(form.leadValue, 'Opportunity Value');
      if (valueErr) e.leadValue = valueErr;
    }
    // Company (optional — only when entering a new one). Reuse existing field rules.
    if (!companySec.companyId && companySec.name.trim()) {
      const cErr = validateTextField(companySec.name, 'Company Name', { maxLength: 200 });
      if (cErr) e.companyName = cErr;
      const indErr = validateTextField(companySec.industry, 'Industry', { maxLength: 100 });
      if (indErr) e.companyName = e.companyName || indErr;
      const webErr = validateTextField(companySec.website, 'Website', { maxLength: 500 });
      if (webErr) e.companyName = e.companyName || webErr;
    }
    // Notes.
    const notesErr = validateLongText(form.notes, 'Notes', { maxLength: 5000 });
    if (notesErr) e.notes = notesErr;
    // Next Action (optional section).
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
    // Blocked submits used to bail silently — in a form this long the offending
    // field is usually scrolled out of sight. Take the user to it.
    if (!validate()) {
      focusFirstInvalid(ev.currentTarget as HTMLElement);
      return;
    }

    try {
      setIsSubmitting(true);

      // Resolve the CRM company: existing selection, or create a new one via the
      // Companies module (single source — no duplicate company logic here).
      const companyId = await resolveCompanyId(companySec, companies);

      const payload: CreateLeadPayload = {
        title: sanitizeText(form.title) || undefined,
        name: sanitizeText(form.name),
        company: sanitizeText(companySec.name) || undefined,
        email: form.email.trim().toLowerCase() || undefined,
        phone: form.phone.trim() || undefined,
        designation: sanitizeText(form.designation) || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        source: form.source,
        ownerId: form.ownerId ? Number(form.ownerId) : undefined,
        industry: sanitizeText(companySec.industry) || undefined,
        website: companySec.website.trim() || undefined,
        address: sanitizeText(companySec.address) || undefined,
        leadValue: form.leadValue.trim() || undefined,
        companyId,
        priority: form.priority,
        temperature: form.temperature as LeadTemperature,
        district: form.district || undefined,
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

      await createManualLead(payload);
      toast('Opportunity created successfully', 'success');
      onCreated();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create opportunity';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Opportunity" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
        {submitError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            {submitError}
          </div>
        )}

        {/* ── Section 1 · Opportunity Details ── */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Opportunity Details</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Lead Source <span className="text-red-500 font-bold">*</span>
            </label>
            {/* aria-invalid + tabIndex let focusFirstInvalid() find and scroll to this
                hand-rolled tile group, exactly like the shared field components. */}
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              aria-invalid={errors.source ? 'true' : 'false'}
              tabIndex={-1}
            >
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
            {errors.source && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.source}</p>}
          </div>

          <InputField
            label="Opportunity Name" id="opp-name" required
            value={form.title} onChange={(v) => set('title', v)} error={errors.title}
            placeholder="e.g. ERP implementation — Acme"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Owner" id="opp-owner" value={form.ownerId} onChange={(v) => set('ownerId', v)} placeholder="Assign to…" options={ownerOptions} />
            <InputField label="Opportunity Value" id="opp-value" required value={form.leadValue} onChange={(v) => set('leadValue', v)} error={errors.leadValue} placeholder="e.g. 500000" />
            {form.source === 'referral' && (
              <InputField label="Referral Name" id="opp-referral" required value={form.referralName} onChange={(v) => set('referralName', v)} error={errors.referralName} placeholder="Who referred this?" />
            )}
            <SelectField label="Priority" id="opp-priority" value={form.priority} onChange={(v) => set('priority', v)} options={PRIORITY_OPTIONS} />
            <SelectField label="Lead Status" id="opp-temperature" value={form.temperature} onChange={(v) => set('temperature', v)} options={TEMPERATURE_OPTIONS} required />
            <SelectField label="District" id="opp-district" value={form.district} onChange={(v) => set('district', v)} placeholder="Select District" options={DISTRICT_OPTIONS} />
          </div>
        </section>

        {/* ── Section 2 · Contact Information ── */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Contact Information</h3>
          <SearchableSelect
            id="opp-contact-select" label="Select existing Contact (optional)"
            value={selectedContactId} onChange={onSelectContact}
            placeholder="— Enter contact manually —" searchPlaceholder="Search contacts…"
            options={contactOptions}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Contact Name" id="contact-name" required value={form.name} onChange={(v) => set('name', v)} error={errors.name} placeholder="e.g. John Doe" />
            <InputField label="Designation" id="contact-designation" value={form.designation} onChange={(v) => set('designation', v)} placeholder="e.g. Founder / CTO" />
            <InputField label="Phone" id="contact-phone" required value={form.phone} onChange={(v) => set('phone', v)} error={errors.phone} placeholder="+91 98765 43210" />
            <InputField label="WhatsApp" id="contact-whatsapp" value={form.whatsapp} onChange={(v) => set('whatsapp', v)} error={errors.whatsapp} placeholder="+91 98765 43210" />
            <InputField label="Email" id="contact-email" type="email" value={form.email} onChange={(v) => set('email', v)} error={errors.email} placeholder="name@company.com" />
            <InputField label="Company" id="contact-company" value={companySec.name} onChange={() => {}} disabled placeholder="Set in Company Information below" />
          </div>
        </section>

        {/* ── Section 3 · Company Information (CRM Account) ── */}
        <div aria-invalid={errors.companyName ? 'true' : 'false'} tabIndex={-1}>
          <OpportunityCompanySection companies={companies} value={companySec} onChange={setCompany} />
          {errors.companyName && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.companyName}</p>}
        </div>

        {/* ── Section 4 · Notes & Next Action ── */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Notes &amp; Next Action</h3>
          <TextareaField
            label="Notes" id="opp-notes" rows={4}
            value={form.notes} onChange={(v) => set('notes', v)}
            error={errors.notes}
            maxLength={5000} showCharCount
            placeholder="What is the opportunity about? Notes appear in the opportunity's Notes section and can be edited later."
          />

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
                <SelectField label="Action Type" id="action-type" value={action.type} onChange={(v) => setAct('type', v)} options={ACTION_TYPES} />
                <SelectField label="Priority" id="action-priority" value={action.priority} onChange={(v) => setAct('priority', v)} options={PRIORITY_OPTIONS} />
              </div>
              <InputField label="Action Title" id="action-title" required value={action.title} onChange={(v) => setAct('title', v)} error={errors.actionTitle} placeholder="e.g. Call client about proposal" />
              <TextareaField label="Description" id="action-description" rows={2} value={action.description} onChange={(v) => setAct('description', v)} error={errors.actionDescription} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label="Assigned To" id="action-assignee" value={action.assignedTo} onChange={(v) => setAct('assignedTo', v)} placeholder="Assign to…" options={ownerOptions} />
                <DateTimePicker label="Due Date & Time" id="action-due" required value={action.dueDate} onChange={(v) => setAct('dueDate', v)} error={errors.actionDue} />
              </div>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Create Opportunity</Button>
        </div>
      </form>
    </Modal>
  );
}
