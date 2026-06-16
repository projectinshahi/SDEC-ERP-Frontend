'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { InputField } from '@/components/ui/InputField';
import { ArrowLeft, Plus, Trash2, Pencil, SlidersHorizontal, ToggleLeft, ToggleRight } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import {
  fetchScoringCriteria,
  createScoringCriterion,
  updateScoringCriterion,
  deleteScoringCriterion,
} from '@/lib/api/leadQualification';
import type { ScoringCriterion } from '@/lib/types/leadQualification';

export default function ScoringSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [criteria, setCriteria] = useState<ScoringCriterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScoringCriterion | null>(null);
  const [form, setForm] = useState({ factor: '', label: '', weight: '10' });
  const [errors, setErrors] = useState<{ label?: string; weight?: string; factor?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setCriteria(await fetchScoringCriteria());
    } catch {
      toast('Failed to load scoring criteria', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const activeTotal = criteria.filter((c) => c.isActive).reduce((sum, c) => sum + c.weight, 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ factor: '', label: '', weight: '10' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (c: ScoringCriterion) => {
    setEditing(c);
    setForm({ factor: c.factor, label: c.label, weight: String(c.weight) });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.label.trim()) e.label = 'Label is required.';
    if (!editing && !form.factor.trim()) e.factor = 'Factor key is required.';
    const w = Number(form.weight);
    if (form.weight === '' || isNaN(w)) e.weight = 'Weight is required.';
    else if (w <= 0) e.weight = 'Weight must be positive.';
    else if (w > 100) e.weight = 'Weight must not exceed 100.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setIsSaving(true);
      if (editing) {
        await updateScoringCriterion(editing.id, { label: form.label.trim(), weight: Number(form.weight) });
        toast('Criterion updated', 'success');
      } else {
        await createScoringCriterion({ factor: form.factor.trim(), label: form.label.trim(), weight: Number(form.weight) });
        toast('Criterion created', 'success');
      }
      setIsModalOpen(false);
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to save criterion', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (c: ScoringCriterion) => {
    try {
      await updateScoringCriterion(c.id, { isActive: !c.isActive });
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to update criterion', 'error');
    }
  };

  const handleDelete = async (c: ScoringCriterion) => {
    if (!window.confirm(`Delete scoring factor "${c.label}"?`)) return;
    try {
      await deleteScoringCriterion(c.id);
      toast('Criterion deleted', 'success');
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to delete criterion', 'error');
    }
  };

  return (
    <PermissionPageGuard require="sales.scoring">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Leads', href: '/dashboard/sales/leads' },
              { label: 'Scoring Settings', href: '/dashboard/leads/scoring-settings' },
            ]}
          />
          <div className="flex gap-2">
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Factor
            </Button>
            <Button variant="secondary" onClick={() => router.push('/dashboard/sales/leads')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-start gap-3">
            <SlidersHorizontal className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Scoring Criteria</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Define the factors and weights used to score leads from 1–100. Active weights are
                normalised, so they need not sum to 100. Current active weight total:{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{activeTotal}</span>.
              </p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Factor</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Key</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Weight</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading…</td></tr>
                ) : criteria.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No scoring factors yet.</td></tr>
                ) : (
                  criteria.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.label}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.factor}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-semibold">{c.weight}</td>
                      <td className="px-6 py-4">
                        <Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleActive(c)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                            title={c.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {c.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Scoring Factor' : 'Add Scoring Factor'}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editing && (
            <InputField
              label="Factor Key" id="factor" required
              value={form.factor} onChange={(v) => setForm((f) => ({ ...f, factor: v }))}
              error={errors.factor} placeholder="e.g. budget_fit"
            />
          )}
          <InputField
            label="Label" id="label" required
            value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))}
            error={errors.label} placeholder="e.g. Budget Fit"
          />
          <InputField
            label="Weight (1–100)" id="weight" type="number" required
            value={form.weight} onChange={(v) => setForm((f) => ({ ...f, weight: v }))}
            error={errors.weight}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </PermissionPageGuard>
  );
}
