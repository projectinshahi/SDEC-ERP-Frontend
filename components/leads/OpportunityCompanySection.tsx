'use client';

import { InputField } from '@/components/ui/InputField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TextareaField } from '@/components/ui/TextareaField';
import { createCompany, type Company } from '@/lib/api/companies';
import type { Contact } from '@/lib/api/customers';

/**
 * Company Information section — SHARED by the Create + Edit Opportunity modals (single
 * source; no duplicated Company logic). Integrates directly with the existing Companies
 * module via the CRM Account selector:
 *  • Select an EXISTING company  → fields populate + LOCK (read-only); opportunity links to it.
 *  • "No Company (create new)"   → fields editable; on save `resolveCompanyId` creates the
 *    Company through the existing `createCompany` API and links the new id.
 */
export interface CompanySectionValue {
  companyId: string; // '' = No Company (create new on save)
  name: string;
  industry: string;
  website: string;
  address: string;
  gst: string;
  notes: string;
}

export const emptyCompanySection = (): CompanySectionValue => ({
  companyId: '', name: '', industry: '', website: '', address: '', gst: '', notes: '',
});

/** Build the section value from a linked company (for the Edit modal hydrate). */
export const companySectionFrom = (c?: Company | null): CompanySectionValue =>
  c
    ? { companyId: String(c.id), name: c.name ?? '', industry: c.industry ?? '', website: c.website ?? '', address: c.address ?? '', gst: c.gst ?? '', notes: c.notes ?? '' }
    : emptyCompanySection();

// Distinct sentinel so "No Company" is a real, re-selectable option (SelectField's own
// empty-value placeholder is disabled, so an empty value can't be picked again).
const NO_COMPANY = '__none__';

export function OpportunityCompanySection({
  companies, value, onChange,
}: {
  companies: Company[];
  value: CompanySectionValue;
  onChange: (patch: Partial<CompanySectionValue>) => void;
}) {
  const locked = !!value.companyId;

  const onSelect = (raw: string) => {
    const id = raw === NO_COMPANY ? '' : raw;
    if (id) {
      const c = companies.find((x) => String(x.id) === id);
      onChange({
        companyId: id,
        name: c?.name ?? '',
        industry: c?.industry ?? '',
        website: c?.website ?? '',
        address: c?.address ?? '',
        gst: c?.gst ?? '',
        notes: c?.notes ?? '',
      });
    } else {
      onChange({ companyId: '', name: '', industry: '', website: '', address: '', gst: '', notes: '' });
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Company Information</h3>
      <SearchableSelect
        label="CRM Account" id="opp-company-account" value={value.companyId || NO_COMPANY} onChange={onSelect}
        placeholder="Select a company…" searchPlaceholder="Search companies…"
        options={[{ value: NO_COMPANY, label: '— No Company (create new) —' }, ...companies.map((c) => ({ value: String(c.id), label: c.name, sublabel: c.industry || undefined }))]}
      />
      {locked ? (
        <p className="text-xs text-blue-600 dark:text-blue-400">Linked to an existing company — these fields are read-only.</p>
      ) : value.name.trim() ? (
        <p className="text-xs text-gray-400">A new company will be created in the Companies module and linked to this opportunity.</p>
      ) : null}

      <InputField label="Company Name" id="opp-company-name" value={value.name} onChange={(v) => onChange({ name: v })} disabled={locked} placeholder="e.g. Acme Corporation" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Industry" id="opp-company-industry" value={value.industry} onChange={(v) => onChange({ industry: v })} disabled={locked} placeholder="e.g. Manufacturing" />
        <InputField label="Website" id="opp-company-website" value={value.website} onChange={(v) => onChange({ website: v })} disabled={locked} placeholder="https://" />
      </div>
      <InputField label="GST (optional)" id="opp-company-gst" value={value.gst} onChange={(v) => onChange({ gst: v })} disabled={locked} placeholder="GST number" />
      <TextareaField label="Address" id="opp-company-address" rows={2} value={value.address} onChange={(v) => onChange({ address: v })} disabled={locked} />
    </section>
  );
}

/** Contact → the auto-fillable Contact Information fields (Contact has no Notes field). */
export const contactToFields = (c: Contact) => ({
  name: c.name || '', designation: c.designation || '', phone: c.phone || '', whatsapp: c.whatsapp || '', email: c.email || '',
});

/** Contact → the Company section: reuse its linked CRM company (single source of truth), else
 * fall back to its free-text company name so manual entry still populates. */
export function contactToCompanySection(c: Contact, companies: Company[]): CompanySectionValue {
  const full = c.companyId != null ? companies.find((x) => x.id === c.companyId) : undefined;
  if (full) return companySectionFrom(full);
  if (c.companyRef) return { companyId: String(c.companyRef.id), name: c.companyRef.name || '', industry: c.companyRef.industry || '', website: c.companyRef.website || '', address: c.companyRef.address || '', gst: c.companyRef.gst || '', notes: '' };
  return { ...emptyCompanySection(), name: c.company || '' };
}

/**
 * Resolve the company link at submit time. An existing selection wins; otherwise a manually
 * entered company is created via the existing `createCompany` API. Dedup-safe: a duplicate
 * name (409) reuses the already-existing company rather than failing. Returns the companyId,
 * or undefined when no company was provided.
 */
export async function resolveCompanyId(v: CompanySectionValue, companies: Company[]): Promise<number | undefined> {
  if (v.companyId) return Number(v.companyId);
  if (!v.name.trim()) return undefined;
  try {
    const created = await createCompany({
      name: v.name.trim(),
      industry: v.industry.trim() || undefined,
      website: v.website.trim() || undefined,
      address: v.address.trim() || undefined,
      gst: v.gst.trim() || undefined,
      notes: v.notes.trim() || undefined,
    });
    return created.id;
  } catch (e: any) {
    // Global name-dedup: reuse the existing company instead of erroring out.
    const match = companies.find((c) => c.name.trim().toLowerCase() === v.name.trim().toLowerCase());
    if (match) return match.id;
    const existingId = e?.response?.data?.companyId ?? e?.companyId;
    if (existingId) return Number(existingId);
    throw e;
  }
}
