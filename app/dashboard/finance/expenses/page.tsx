'use client';

/**
 * Finance → Expenses. Records money spent by the company. Full CRUD, gated by
 * finance.expenses.* permissions (Founder/Admin bypass). Searchable + status-
 * filterable table. Figures roll up live into the Dashboard/Reports.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Inbox, CreditCard } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import { LabeledSelect, FilterSelect, StatusChip, PAYMENT_METHODS, toDateInput, fmtDate } from '@/components/finance/financeUi';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/components/ConfirmDialogProvider';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatINR } from '@/lib/utils/currency';
import {
  fetchExpenses, createExpense, updateExpense, deleteExpense,
  type ExpenseEntry, type ExpensePayload,
} from '@/lib/api/finance';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
];
const PAYMENT_OPTIONS = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));
const DEFAULT_CATEGORY = 'General';
const CATEGORIES = [DEFAULT_CATEGORY, 'Salaries', 'Marketing', 'Software', 'Office & Admin', 'Rent & Utilities', 'Travel', 'Taxes', 'Other'];
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

export default function FinanceExpensesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('finance.expenses.create');
  const canEdit = hasPermission('finance.expenses.edit');
  const canDelete = hasPermission('finance.expenses.delete');

  const [rows, setRows] = useState<ExpenseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; entry?: ExpenseEntry } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setRows(await fetchExpenses());
    } catch {
      toast('Failed to load expenses', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q && !(r.title.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q) || (r.vendor || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  const total = useMemo(() => visible.reduce((s, r) => s + r.amount, 0), [visible]);

  const handleDelete = async (entry: ExpenseEntry) => {
    const ok = await confirm({
      title: 'Delete expense entry',
      message: `Delete "${entry.title}" (${formatINR(entry.amount)})? This cannot be undone.`,
      confirmLabel: 'Delete', intent: 'danger',
    });
    if (!ok) return;
    try {
      setDeletingId(entry.id);
      await deleteExpense(entry.id);
      toast('Expense deleted', 'success');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-600" /> Expenses
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Record and track company expenses.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setModal({ mode: 'create' })}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Expense
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search title, category or vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <FilterSelect
          ariaLabel="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: 'all', label: 'All Statuses' }, ...STATUS_OPTIONS]}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {visible.length} {visible.length === 1 ? 'entry' : 'entries'} · <span className="font-bold text-rose-600">{formatINR(total)}</span>
        </span>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-500">{rows.length === 0 ? 'No expenses recorded yet.' : 'No entries match your filters.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  {(canEdit || canDelete) && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.category}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.vendor || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-rose-600">{formatINR(r.amount)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(r.expenseDate)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.paymentMethod}</td>
                    <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button onClick={() => setModal({ mode: 'edit', entry: r })} title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(r)} disabled={deletingId === r.id} title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors disabled:opacity-50">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <ExpenseFormModal
          mode={modal.mode}
          entry={modal.entry}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

/* ── Create / Edit modal ─────────────────────────────────────────────────────── */

function ExpenseFormModal({ mode, entry, onClose, onSaved }: {
  mode: 'create' | 'edit'; entry?: ExpenseEntry; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(entry?.title ?? '');
  const [category, setCategory] = useState(entry?.category ?? DEFAULT_CATEGORY);
  const [vendor, setVendor] = useState(entry?.vendor ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [date, setDate] = useState(entry ? toDateInput(entry.expenseDate) : toDateInput(new Date().toISOString()));
  const [paymentMethod, setPaymentMethod] = useState(entry?.paymentMethod ?? PAYMENT_METHODS[0]);
  const [status, setStatus] = useState<string>(entry?.status ?? 'pending');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [errors, setErrors] = useState<{ title?: string; amount?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Title is required.';
    const amt = Number(amount);
    if (!amount.trim() || Number.isNaN(amt) || amt < 0) next.amount = 'Enter a valid non-negative amount.';
    if (!date) next.date = 'Date is required.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload: ExpensePayload = {
      title: title.trim(),
      category,
      vendor: vendor.trim() || null,
      amount: amt,
      date: new Date(date).toISOString(),
      paymentMethod,
      status: status as ExpensePayload['status'],
      notes: notes.trim() || null,
    };
    try {
      setSaving(true);
      if (mode === 'create') { await createExpense(payload); toast('Expense added', 'success'); }
      else if (entry) { await updateExpense(entry.id, payload); toast('Expense updated', 'success'); }
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={mode === 'create' ? 'Add Expense' : 'Edit Expense'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <InputField label="Expense Title" id="expense-title" required value={title} onChange={setTitle} error={errors.title} placeholder="e.g. Office Rent — June" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledSelect label="Category" id="expense-category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} required />
          <InputField label="Vendor (optional)" id="expense-vendor" value={vendor} onChange={setVendor} placeholder="e.g. WeWork" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Amount (₹)" id="expense-amount" type="number" required value={amount} onChange={setAmount} error={errors.amount} placeholder="0" />
          <InputField label="Date" id="expense-date" type="date" required value={date} onChange={setDate} error={errors.date} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledSelect label="Payment Method" id="expense-method" value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_OPTIONS} />
          <LabeledSelect label="Status" id="expense-status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
        <TextareaField label="Notes (optional)" id="expense-notes" rows={3} value={notes} onChange={setNotes} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{mode === 'create' ? 'Add Expense' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}
