'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { createCompany, updateCompany, type Company, type CompanyInput } from '@/lib/api/companies';

/**
 * Create/Edit a Company (CRM account). Reuses the shared Modal + form-field atoms.
 * Global-dedup duplicate-name conflicts (409) surface as an inline field error.
 */
export function CompanyFormModal({
  isOpen, onClose, onSaved, company,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  company?: Company | null;
}) {
  const { toast } = useToast();
  const editing = !!company;
  const [form, setForm] = useState<CompanyInput>({ name: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: company?.name ?? '',
      industry: company?.industry ?? '',
      website: company?.website ?? '',
      address: company?.address ?? '',
      gst: company?.gst ?? '',
      notes: company?.notes ?? '',
    });
    setErrors({});
  }, [isOpen, company]);

  const set = (k: keyof CompanyInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErrors({ name: 'Company name is required' }); return; }
    setSaving(true);
    try {
      if (editing && company) await updateCompany(company.id, form);
      else await createCompany(form);
      toast(editing ? 'Company updated.' : 'Company created.', 'success');
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to save the company.';
      if (/already exists/i.test(msg)) setErrors({ name: msg });
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Company' : 'New Company'} size="lg">
      <div className="space-y-4">
        <InputField
          id="company-name" label="Company Name" required
          value={form.name} onChange={set('name')} error={errors.name}
          placeholder="e.g. Acme Corporation"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField id="company-industry" label="Industry" value={form.industry ?? ''} onChange={set('industry')} placeholder="e.g. Manufacturing" />
          <InputField id="company-website" label="Website" value={form.website ?? ''} onChange={set('website')} placeholder="https://…" />
        </div>
        <InputField id="company-gst" label="GST (optional)" value={form.gst ?? ''} onChange={set('gst')} placeholder="GST number" />
        <TextareaField id="company-address" label="Address" value={form.address ?? ''} onChange={set('address')} rows={2} />
        <TextareaField id="company-notes" label="Notes" value={form.notes ?? ''} onChange={set('notes')} rows={3} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} isLoading={saving}>{editing ? 'Save Changes' : 'Create Company'}</Button>
        </div>
      </div>
    </Modal>
  );
}
