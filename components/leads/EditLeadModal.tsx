'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { updateLead, fetchAssignableUsers } from '@/lib/api/leads';
import { fetchCompanyOptions, type Company } from '@/lib/api/companies';
import { fetchContacts, type Contact } from '@/lib/api/customers';
import { SELECTABLE_LEAD_SOURCES, formatLeadSource } from '@/lib/data/leadSources';
import { TEMPERATURE_OPTIONS, type LeadTemperature } from '@/lib/data/leadTemperature';
import { DISTRICT_OPTIONS } from '@/lib/data/districts';
import {
  OpportunityCompanySection,
  resolveCompanyId,
  emptyCompanySection,
  companySectionFrom,
  contactToFields,
  contactToCompanySection,
  type CompanySectionValue,
} from './OpportunityCompanySection';
import { focusFirstInvalid } from '@/lib/validation';
import type { LeadDetail, LeadStage, AssignableUser, UpdateLeadPayload } from '@/lib/types/lead';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadDetail;
  stages: LeadStage[];
  onSaved: () => void;
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => {
  if (!/^[+\d][\d\s().-]*$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * Edit-opportunity form — the same four sections as create (Opportunity Details, Contact
 * Information, Company Information, Notes & Next Action). Persists via the lead update API
 * (last-write-wins); the Company section links an existing CRM account or auto-creates one.
 */
export function EditLeadModal({ isOpen, onClose, lead, stages, onSaved }: EditLeadModalProps) {
  const { toast } = useToast();
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '',
    name: '',
    designation: '',
    email: '',
    phone: '',
    whatsapp: '',
    source: 'manual',
    priority: 'medium',
    temperature: 'COLD',
    district: '',
    stage: 'NQL',
    tags: '',
    ownerId: '',
    description: '',
    referralName: '',
    leadValue: '',
  });
  const [companySec, setCompanySec] = useState<CompanySectionValue>(emptyCompanySection());

  // Hydrate the form whenever the modal opens for a (possibly new) lead.
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm({
      title: lead.title || '',
      name: lead.customer?.name || '',
      designation: lead.customer?.designation || '',
      email: lead.customer?.email || '',
      phone: lead.customer?.phone || '',
      whatsapp: lead.customer?.whatsapp || '',
      source: lead.source || 'manual',
      priority: lead.priority || 'medium',
      temperature: lead.temperature || 'COLD',
      district: lead.district || '',
      stage: lead.stage || 'NQL',
      tags: lead.tags || '',
      ownerId: lead.ownerId ? String(lead.ownerId) : '',
      description: lead.description || '',
      referralName: lead.referralName || '',
      leadValue: lead.leadValue != null ? String(lead.leadValue) : '',
    });
    // Seed the Company section from the linked account (full fields filled once the
    // companies list loads, below).
    setCompanySec(
      lead.companyId != null
        ? { companyId: String(lead.companyId), name: lead.companyRef?.name || lead.customer?.company || '', industry: lead.companyRef?.industry || '', website: lead.companyRef?.website || '', address: lead.companyRef?.address || '', gst: lead.companyRef?.gst || '', notes: lead.companyRef?.notes || '' }
        : { ...emptyCompanySection(), name: lead.customer?.company || '' },
    );
  }, [isOpen, lead]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedContactId('');
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
    fetchCompanyOptions().then(setCompanies).catch(() => setCompanies([]));
    fetchContacts().then(setContacts).catch(() => setContacts([]));
  }, [isOpen]);

  const contactOptions = useMemo(() => [
    { value: '', label: '— Enter contact manually —' },
    ...contacts.map((c) => ({ value: String(c.id), label: c.name, sublabel: [c.email, c.company].filter(Boolean).join(' · ') || undefined })),
  ], [contacts]);

  const onSelectContact = (id: string) => {
    setSelectedContactId(id);
    const c = id ? contacts.find((x) => String(x.id) === id) : null;
    if (!c) return;
    setForm((f) => ({ ...f, ...contactToFields(c) }));
    setCompanySec(contactToCompanySection(c, companies));
  };

  // Once companies load, fill the linked account's full fields (gst/notes/etc).
  useEffect(() => {
    if (!isOpen || lead.companyId == null) return;
    const c = companies.find((x) => x.id === lead.companyId);
    if (c) setCompanySec(companySectionFrom(c));
  }, [companies, isOpen, lead.companyId]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setCompany = (patch: Partial<CompanySectionValue>) => setCompanySec((c) => ({ ...c, ...patch }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Opportunity name is required.';
    if (form.email.trim() && !isValidEmail(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    else if (!isValidPhone(form.phone.trim())) e.phone = 'Enter a valid phone number.';
    if (form.whatsapp.trim() && !isValidPhone(form.whatsapp.trim())) e.whatsapp = 'Enter a valid WhatsApp number.';
    if (form.source === 'referral' && !form.referralName.trim()) e.referralName = 'Referral Name is required.';
    if (!form.leadValue.trim()) {
      e.leadValue = 'Opportunity Value is required.';
    } else {
      const num = Number(form.leadValue);
      if (isNaN(num) || num < 0) e.leadValue = 'Opportunity Value must be a valid positive number.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // Don't bail silently — scroll + focus the first field that blocked the save.
    if (!validate()) {
      focusFirstInvalid(ev.currentTarget as HTMLElement);
      return;
    }

    try {
      setIsSaving(true);
      const companyId = await resolveCompanyId(companySec, companies);

      const payload: UpdateLeadPayload = {
        title: form.title.trim(),
        description: form.description,
        source: form.source,
        priority: form.priority,
        temperature: form.temperature as LeadTemperature,
        district: form.district || null,
        stage: form.stage,
        tags: form.tags.trim() || null,
        name: form.name.trim(),
        company: companySec.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        whatsapp: form.whatsapp.trim(),
        website: companySec.website.trim(),
        industry: companySec.industry.trim(),
        address: companySec.address.trim(),
        referralName: form.source === 'referral' ? form.referralName.trim() : undefined,
        leadValue: form.leadValue.trim() ? Number(form.leadValue.trim()) : null,
        companyId: companyId ?? null,
      };
      if (form.ownerId) payload.ownerId = Number(form.ownerId);

      await updateLead(lead.id, payload);
      toast('Opportunity updated', 'success');
      onSaved();
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Failed to update opportunity', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Opportunity" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* ── Section 1 · Opportunity Details ── */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Opportunity Details</h3>
          <InputField label="Opportunity Name" id="edit-title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Owner" id="edit-owner" value={form.ownerId} onChange={(v) => set('ownerId', v)} placeholder="Select owner" options={owners.map((o) => ({ value: String(o.id), label: o.name }))} />
            <SelectField label="Lead Source" id="edit-source" value={form.source} onChange={(v) => set('source', v)} options={SELECTABLE_LEAD_SOURCES.map((s) => ({ value: s, label: formatLeadSource(s) }))} />
            {form.source === 'referral' && (
              <InputField label="Referral Name" id="edit-referral" required value={form.referralName} onChange={(v) => set('referralName', v)} error={errors.referralName} placeholder="Who referred this?" />
            )}
            <SelectField label="Stage" id="edit-stage" value={form.stage} onChange={(v) => set('stage', v)} options={stages.map((s) => ({ value: s.name, label: s.name }))} />
            <InputField label="Opportunity Value" id="edit-value" required value={form.leadValue} onChange={(v) => set('leadValue', v)} error={errors.leadValue} placeholder="e.g. 500000" />
            <SelectField label="Priority" id="edit-priority" value={form.priority} onChange={(v) => set('priority', v)} options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
            <SelectField label="Lead Status" id="edit-temperature" value={form.temperature} onChange={(v) => set('temperature', v)} options={TEMPERATURE_OPTIONS} required />
            <SelectField label="District" id="edit-district" value={form.district} onChange={(v) => set('district', v)} placeholder="Select District" options={DISTRICT_OPTIONS} />
            <InputField label="Tags (comma separated)" id="edit-tags" value={form.tags} onChange={(v) => set('tags', v)} placeholder="enterprise, hot, referral" />
          </div>
        </section>

        {/* ── Section 2 · Contact Information ── */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Contact Information</h3>
          <SearchableSelect
            id="edit-contact-select" label="Select existing Contact (optional)"
            value={selectedContactId} onChange={onSelectContact}
            placeholder="— Enter contact manually —" searchPlaceholder="Search contacts…"
            options={contactOptions}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Contact Name" id="edit-name" value={form.name} onChange={(v) => set('name', v)} />
            <InputField label="Designation" id="edit-designation" value={form.designation} onChange={(v) => set('designation', v)} placeholder="e.g. Founder / CTO" />
            <InputField label="Phone" id="edit-phone" required value={form.phone} onChange={(v) => set('phone', v)} error={errors.phone} />
            <InputField label="WhatsApp" id="edit-whatsapp" value={form.whatsapp} onChange={(v) => set('whatsapp', v)} error={errors.whatsapp} />
            <InputField label="Email" id="edit-email" type="email" value={form.email} onChange={(v) => set('email', v)} error={errors.email} />
            <InputField label="Company" id="edit-contact-company" value={companySec.name} onChange={() => {}} disabled placeholder="Set in Company Information below" />
          </div>
        </section>

        {/* ── Section 3 · Company Information (CRM Account) ── */}
        <OpportunityCompanySection companies={companies} value={companySec} onChange={setCompany} />

        {/* ── Section 4 · Notes & Next Action ── */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Notes &amp; Next Action</h3>
          <TextareaField label="Notes" id="edit-description" rows={3} value={form.description} onChange={(v) => set('description', v)} />
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
