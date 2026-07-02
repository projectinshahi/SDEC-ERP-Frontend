'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import {
  ArrowLeft, Mail, Phone, User, Building2, Globe, MapPin, Briefcase,
  Target, AlertCircle, CalendarDays,
} from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { apiClient } from '@/lib/api/api-client';
import { formatINR } from '@/lib/utils/currency';

interface ContactLead {
  id: number; title: string; status: string; stage: string; score: number; createdAt: string;
}
interface ContactDeal {
  id: number; title: string; amount: number; stage: string; status: string; createdAt: string;
}
interface Contact {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: number; name: string; email: string } | null;
  leads?: ContactLead[];
  deals?: ContactDeal[];
}

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};
// Centralized INR formatter — single source of truth for the ₹ symbol.
const money = (n: number) => formatINR(n || 0);

export default function ContactDetailsPage() {
  const params = useParams();
  const contactId = params.id as string;
  const { toast } = useToast();

  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get<Contact>(`/sales/customers/${contactId}`);
      setContact(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contact';
      setError(message);
      toast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/customers' },
              { label: 'Contacts', href: '/dashboard/sales/customers' },
              { label: isLoading ? 'Loading…' : contact?.name || 'Contact Details' },
            ]}
          />
        </div>

        <Link
          href="/dashboard/sales/customers"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Contacts
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 rounded-2xl lg:col-span-1" />
            <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
          </div>
        ) : error || !contact ? (
          <Card className="p-10 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/30">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Contact not found</h2>
            <p className="mt-1 text-sm text-gray-500">{error || 'This contact may have been removed.'}</p>
            <Link href="/dashboard/sales/customers" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
              Return to Contacts
            </Link>
          </Card>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 text-lg font-bold">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{contact.name}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{contact.company || 'No company'}</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                {contact.status || 'active'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Section title="Contact Information" icon={User}>
                <Field icon={Mail} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                <Field icon={Phone} label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
                <Field icon={User} label="Owner" value={contact.owner?.name} />
                <Field icon={CalendarDays} label="Added" value={fmtDate(contact.createdAt)} />
              </Section>

              {/* Company Information */}
              <Section title="Company Information" icon={Building2}>
                <Field icon={Building2} label="Company" value={contact.company} />
                <Field icon={Briefcase} label="Industry" value={contact.industry} />
                <Field
                  icon={Globe}
                  label="Website"
                  value={contact.website}
                  href={contact.website ? (contact.website.startsWith('http') ? contact.website : `https://${contact.website}`) : undefined}
                  external
                />
                <Field icon={MapPin} label="Address" value={contact.address} />
              </Section>
            </div>

            {/* Associated Leads & Deals (live) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title={`Associated Leads (${contact.leads?.length ?? 0})`} icon={Target}>
                {(contact.leads?.length ?? 0) === 0 ? (
                  <EmptyRow label="No leads linked to this contact." />
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 -my-1">
                    {contact.leads!.map((l) => (
                      <li key={l.id} className="py-2.5">
                        <Link href={`/dashboard/sales/leads/${l.id}`} className="group flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">{l.title}</p>
                            <p className="text-xs text-gray-400">{l.stage} · {l.status}</p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-gray-500 tabular-nums">Score {l.score}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={`Associated Deals (${contact.deals?.length ?? 0})`} icon={Briefcase}>
                {(contact.deals?.length ?? 0) === 0 ? (
                  <EmptyRow label="No deals linked to this contact." />
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 -my-1">
                    {contact.deals!.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{d.title}</p>
                          <p className="text-xs text-gray-400">{d.stage} · {d.status}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{money(d.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </>
        )}
      </div>
    </PermissionPageGuard>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode;
}) {
  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <Icon size={16} className="text-gray-400" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function Field({ icon: Icon, label, value, href, external }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value?: string | null; href?: string; external?: boolean;
}) {
  const display = value && String(value).trim() ? value : '—';
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        {href && value ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="break-words text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {value}
          </a>
        ) : (
          <p className="break-words text-sm font-medium text-gray-800 dark:text-gray-100">{display}</p>
        )}
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="py-4 text-center text-sm text-gray-400">{label}</p>;
}
