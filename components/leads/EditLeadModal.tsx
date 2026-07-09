'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { updateLead, fetchAssignableUsers } from '@/lib/api/leads';
import { SELECTABLE_LEAD_SOURCES, formatLeadSource } from '@/lib/data/leadSources';
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
 * Edit-lead form. Covers basic details, business details, assignment and the
 * pipeline stage. Validates email/phone format and requires a name. Persists
 * via the lead update API (last-write-wins) and reports the result.
 */
export function EditLeadModal({ isOpen, onClose, lead, stages, onSaved }: EditLeadModalProps) {
  const { toast } = useToast();
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '',
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    address: '',
    source: 'manual',
    priority: 'medium',
    stage: 'New',
    tags: '',
    ownerId: '',
    description: '',
    referralName: '',
  });

  // Hydrate the form whenever the modal opens for a (possibly new) lead.
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm({
      title: lead.title || '',
      name: lead.customer?.name || '',
      company: lead.customer?.company || '',
      email: lead.customer?.email || '',
      phone: lead.customer?.phone || '',
      website: lead.customer?.website || '',
      industry: lead.customer?.industry || '',
      address: lead.customer?.address || '',
      source: lead.source || 'manual',
      priority: lead.priority || 'medium',
      stage: lead.stage || 'New',
      tags: lead.tags || '',
      ownerId: lead.ownerId ? String(lead.ownerId) : '',
      description: lead.description || '',
      referralName: lead.referralName || '',
    });
  }, [isOpen, lead]);

  useEffect(() => {
    if (!isOpen) return;
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, [isOpen]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Lead name is required.';
    if (form.email.trim() && !isValidEmail(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.phone.trim() && !isValidPhone(form.phone.trim())) e.phone = 'Enter a valid phone number.';
    if (form.source === 'referral' && !form.referralName.trim()) e.referralName = 'Referral Name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload: UpdateLeadPayload = {
      title: form.title.trim(),
      description: form.description,
      source: form.source,
      priority: form.priority,
      stage: form.stage,
      tags: form.tags.trim() || null,
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      industry: form.industry.trim(),
      address: form.address.trim(),

      referralName: form.source === 'referral' ? form.referralName.trim() : undefined,
    };
    if (form.ownerId) payload.ownerId = Number(form.ownerId);

    try {
      setIsSaving(true);
      await updateLead(lead.id, payload);
      toast('Lead updated', 'success');
      onSaved();
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Failed to update lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Lead" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Basic details */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Basic Details</h3>
          <InputField
            label="Lead Name" id="title" required
            value={form.title} onChange={(v) => set('title', v)} error={errors.title}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Contact Name" id="name" value={form.name} onChange={(v) => set('name', v)} />
            <InputField label="Company" id="company" value={form.company} onChange={(v) => set('company', v)} />
            <InputField label="Email" id="email" type="email" value={form.email} onChange={(v) => set('email', v)} error={errors.email} />
            <InputField label="Phone" id="phone" value={form.phone} onChange={(v) => set('phone', v)} error={errors.phone} />
            <InputField label="Website" id="website" value={form.website} onChange={(v) => set('website', v)} />
            <InputField label="Address" id="address" value={form.address} onChange={(v) => set('address', v)} />
          </div>
        </section>

        {/* Business details */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Business Details</h3>
          <InputField label="Industry" id="industry" value={form.industry} onChange={(v) => set('industry', v)} />
          <InputField
            label="Tags (comma separated)" id="tags"
            value={form.tags} onChange={(v) => set('tags', v)} placeholder="enterprise, hot, referral"
          />
          <p className="text-xs text-gray-400">
            The lead score is calculated automatically from your scoring criteria and the lead&apos;s activity.
          </p>
        </section>

        {/* Assignment & pipeline */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Assignment & Pipeline</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Owner" id="ownerId" value={form.ownerId}
              onChange={(v) => set('ownerId', v)} placeholder="Select owner"
              options={owners.map((o) => ({ value: String(o.id), label: o.name }))}
            />
            <SelectField
              label="Lead Source" id="source"
              value={form.source} onChange={(v) => set('source', v)}
              options={SELECTABLE_LEAD_SOURCES.map((s) => ({ value: s, label: formatLeadSource(s) }))}
            />
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
              label="Stage" id="stage" value={form.stage} onChange={(v) => set('stage', v)}
              options={stages.map((s) => ({ value: s.name, label: s.name }))}
            />
            <SelectField
              label="Priority" id="priority" value={form.priority} onChange={(v) => set('priority', v)}
              options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
            />
          </div>
          <TextareaField
            label="Description / Notes" id="description" rows={3}
            value={form.description} onChange={(v) => set('description', v)}
          />
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
