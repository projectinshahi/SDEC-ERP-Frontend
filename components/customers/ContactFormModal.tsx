'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { useToast } from '@/lib/hooks/useToast';
import { createContact, updateContact, type Contact, type ContactInput } from '@/lib/api/customers';
import { fetchCompanyOptions, type Company } from '@/lib/api/companies';

/**
 * Create/Edit a Contact (person). The Company picker links the contact to a normalized
 * Company record (the previous free-text `company` string is superseded). Reuses the
 * shared Modal + form-field atoms.
 */
export function ContactFormModal({
  isOpen, onClose, onSaved, contact,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  contact?: Contact | null;
}) {
  const { toast } = useToast();
  const editing = !!contact;
  const [form, setForm] = useState<ContactInput>({ name: '' });
  const [companyId, setCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: contact?.name ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      whatsapp: contact?.whatsapp ?? '',
      designation: contact?.designation ?? '',
    });
    setCompanyId(contact?.companyId != null ? String(contact.companyId) : '');
    setErrors({});
    fetchCompanyOptions().then(setCompanies).catch(() => setCompanies([]));
  }, [isOpen, contact]);

  const set = (k: keyof ContactInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErrors({ name: 'Contact name is required' }); return; }
    setSaving(true);
    try {
      const payload: ContactInput = { ...form, companyId: companyId ? Number(companyId) : null };
      if (editing && contact) await updateContact(contact.id, payload);
      else await createContact(payload);
      toast(editing ? 'Contact updated.' : 'Contact created.', 'success');
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to save the contact.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const companyOptions = [
    { value: '', label: '— No company —' },
    ...companies.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Contact' : 'New Contact'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField id="contact-name" label="Contact Name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="e.g. Jane Doe" />
          <InputField id="contact-designation" label="Designation" value={form.designation ?? ''} onChange={set('designation')} placeholder="e.g. Procurement Head" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField id="contact-phone" label="Phone" value={form.phone ?? ''} onChange={set('phone')} placeholder="Phone number" />
          <InputField id="contact-whatsapp" label="WhatsApp" value={form.whatsapp ?? ''} onChange={set('whatsapp')} placeholder="WhatsApp number" />
        </div>
        <InputField id="contact-email" label="Email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="name@company.com" />
        <SelectField
          id="contact-company" label="Company" value={companyId} onChange={setCompanyId}
          options={companyOptions} placeholder="— No company —"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} isLoading={saving}>{editing ? 'Save Changes' : 'Create Contact'}</Button>
        </div>
      </div>
    </Modal>
  );
}
