'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ArrowLeft, AlertTriangle, Phone, Mail } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { apiClient } from '@/lib/api/api-client';

// Manual capture records leads that arrived by phone or email enquiry.
const SOURCE_OPTIONS = [
  { value: 'phone', label: 'Phone', icon: Phone, hint: 'Lead received via a phone call' },
  { value: 'email', label: 'Email', icon: Mail, hint: 'Lead received via an email enquiry' },
] as const;

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: '',
  jobTitle: '',
  industry: '',
  website: '',
  address: '',
  leadValue: '',
  tags: '',
  notes: '',
  priority: 'medium',
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => {
  if (!/^[+\d][\d\s().-]*$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

export default function ManualLeadCapturePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Mirrors the server-side validation so the user gets immediate feedback.
  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Full name is required.');
    if (!form.email.trim() && !form.phone.trim()) errs.push('Email or Phone Number is required.');
    if (form.email.trim() && !isValidEmail(form.email.trim())) errs.push('Please enter a valid email address.');
    if (form.phone.trim() && !isValidPhone(form.phone.trim())) errs.push('Please enter a valid phone number.');
    if (!form.source) errs.push('Lead Source is required.');
    return errs;
  };

  // Live duplicate check when the user finishes entering an email / phone.
  const checkDuplicate = async () => {
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!email && !phone) {
      setDuplicateWarning('');
      return;
    }
    try {
      const res = await apiClient.post<{ duplicate: boolean; message: string | null }>(
        '/sales/leads/check-duplicate',
        { email, phone }
      );
      setDuplicateWarning(res.data.duplicate ? res.data.message ?? 'A lead already exists with this email or phone number.' : '');
    } catch {
      // Non-blocking: the server re-checks on submit anyway.
    }
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    try {
      setIsSubmitting(true);
      await apiClient.post('/sales/leads/manual', {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        source: form.source,
        jobTitle: form.jobTitle.trim() || undefined,
        industry: form.industry.trim() || undefined,
        website: form.website.trim() || undefined,
        address: form.address.trim() || undefined,
        leadValue: form.leadValue.trim() || undefined,
        tags: form.tags.trim() || undefined,
        notes: form.notes.trim() || undefined,
        priority: form.priority,
      });
      toast('Lead captured successfully', 'success');
      router.push('/dashboard/sales/leads');
    } catch (error: any) {
      // 409 (duplicate) and 400 (validation) surface their server message here.
      const message = error?.message || 'Failed to create lead';
      setErrors([message]);
      if (message.toLowerCase().includes('already exists')) setDuplicateWarning(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/leads' },
              { label: 'Leads', href: '/dashboard/sales/leads' },
              { label: 'Capture Lead', href: '/dashboard/sales/leads/new' },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard/sales/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Manual Lead Capture</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Record a lead received through a phone call or email enquiry.
          </p>

          {errors.length > 0 && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              <ul className="list-disc list-inside space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {duplicateWarning && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {duplicateWarning}
            </div>
          )}

          {/* Source selector — only Phone / Email for manual capture */}
          <div className="mt-6">
            <label className={labelClass}>Lead Source *</label>
            <div className="grid grid-cols-2 gap-3">
              {SOURCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form.source === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('source', opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{opt.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required contact details */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <input className={inputClass} value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="e.g. ABC Technologies" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} onBlur={checkDuplicate} placeholder="name@company.com" />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} onBlur={checkDuplicate} placeholder="+1 555 123 4567" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Provide at least an email or a phone number.</p>

          {/* Optional details */}
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Additional details (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Job Title</label>
                <input className={inputClass} value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Industry</label>
                <input className={inputClass} value={form.industry} onChange={(e) => set('industry', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input className={inputClass} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
              </div>
              <div>
                <label className={labelClass}>Lead Value</label>
                <input className={inputClass} value={form.leadValue} onChange={(e) => set('leadValue', e.target.value)} placeholder="e.g. 5000" />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Tags</label>
                <input className={inputClass} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="comma,separated" />
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  {['low', 'medium', 'high'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Notes</label>
              <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="What is the lead interested in?" />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => router.push('/dashboard/sales/leads')}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>Create Lead</Button>
          </div>
        </Card>
      </div>
    </PermissionPageGuard>
  );
}
