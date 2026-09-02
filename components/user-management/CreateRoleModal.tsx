'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import {
  Shield,
  ShieldAlert,
  Loader2,
  CheckSquare,
  Square,
  Search,
  X,
} from 'lucide-react';
import { createRoleApi, updateRoleApi } from '@/lib/api/roles';
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS } from '@/lib/permissions/permissions.constants';
import type { PermissionKey } from '@/lib/permissions/permission.types';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';

// ── Module filter (focuses the permission list by product area) ──────────────
// Values match `PermissionGroup.module`, so a new module only needs its entry here
// (its groups are picked up by the generic filter below — no per-module code).
type ModuleFilter = 'all' | 'development' | 'sales' | 'hr' | 'finance' | 'marketing';
const MODULE_FILTERS: { value: ModuleFilter; label: string }[] = [
  { value: 'all', label: 'All Modules' },
  { value: 'development', label: 'Development' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
];
// Permission groups that belong to the Development product area.
const DEV_MODULES: string[] = ['dashboard', 'task', 'bugs', 'tickets', 'sprints', 'blockers', 'meetings', 'project'];

/**
 * Narrow the permission list by module AND free-text search.
 *
 * Search matches the group label (module/feature area, e.g. "Marketing · Content
 * Production"), the permission label, its description and its key — so "marketing",
 * "content", "lead" and "view" all work. A group whose LABEL matches keeps all of
 * its permissions; otherwise only its matching permissions are kept.
 *
 * This filters DISPLAY ONLY. Selection lives in `formData.permissions`, which is
 * never touched here, and every mutation below (`toggleGroup` / `toggleAll`) adds
 * or removes only the keys currently visible — so permissions selected outside the
 * current search/module stay selected, and clearing the search brings them back.
 */
function searchPermissionGroups(groups: typeof PERMISSION_GROUPS, term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return groups;
  const out: typeof PERMISSION_GROUPS = [];
  for (const g of groups) {
    if (g.label.toLowerCase().includes(q) || g.module.toLowerCase().includes(q)) { out.push(g); continue; }
    const perms = g.permissions.filter((p) =>
      p.label.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      String(p.description ?? '').toLowerCase().includes(q));
    if (perms.length) out.push({ ...g, permissions: perms });
  }
  return out;
}

function filterPermissionGroups(filter: ModuleFilter) {
  if (filter === 'all') return PERMISSION_GROUPS;
  if (filter === 'sales') return PERMISSION_GROUPS.filter((g) => g.module === 'sales');
  if (filter === 'development') return PERMISSION_GROUPS.filter((g) => DEV_MODULES.includes(g.module));
  // Every other module (marketing / hr / finance) tags its groups with its own
  // `module` value, so this generic match covers them — including Marketing ·
  // Content Production. A module with no groups yet falls through to the
  // "reserved for a future module" empty state below.
  return PERMISSION_GROUPS.filter((g) => g.module === filter);
}

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
  roleToEdit?: {
    id: string | number;
    name: string;
    description: string;
    permissions: string[] | string | unknown;
  } | null;
}

/** Normalise the permissions field coming from the API (may be JSON string or array) */
function normalisePermissions(raw: unknown): PermissionKey[] {
  if (Array.isArray(raw)) return raw as PermissionKey[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PermissionKey[];
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function CreateRoleModal({
  isOpen,
  onClose,
  onSubmitSuccess,
  roleToEdit = null,
}: CreateRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as PermissionKey[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  // Free-text permission search. Display-only: it never mutates the selection.
  const [permSearch, setPermSearch] = useState('');
  const { toast } = useToast();

  // Reset / populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (roleToEdit) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({
          name: roleToEdit.name || '',
          description: roleToEdit.description || '',
          permissions: normalisePermissions(roleToEdit.permissions),
        });
      } else {
        setFormData({ name: '', description: '', permissions: [] });
      }
      setErrors({});
      setTouched({});
      setSubmitError(null);
      setModuleFilter('all');
      setPermSearch('');
    }
  }, [isOpen, roleToEdit]);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateField = (field: string, value: unknown): string => {
    switch (field) {
      case 'name':
        if (!String(value).trim()) return 'Role Name is required';
        if (String(value).trim().length < 3) return 'Role Name must be at least 3 characters';
        return '';
      case 'permissions':
        if (!Array.isArray(value) || value.length === 0)
          return 'At least one permission must be selected';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((errs) => ({ ...errs, [field]: validateField(field, value) }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((errs) => ({
      ...errs,
      [field]: validateField(field, (formData as Record<string, unknown>)[field]),
    }));
  };

  const isFormValid =
    validateField('name', formData.name) === '' &&
    validateField('permissions', formData.permissions) === '';

  // ─── Permission helpers ─────────────────────────────────────────────────────

  const togglePermission = (key: PermissionKey) => {
    const next = formData.permissions.includes(key)
      ? formData.permissions.filter((k) => k !== key)
      : [...formData.permissions, key];
    handleFieldChange('permissions', next);
  };

  const toggleGroup = (keys: PermissionKey[]) => {
    const allSelected = keys.every((k) => formData.permissions.includes(k));
    const next = allSelected
      ? formData.permissions.filter((k) => !keys.includes(k))
      : [...new Set([...formData.permissions, ...keys])];
    handleFieldChange('permissions', next);
  };

  // Permission groups currently shown (module filter THEN search) + their keys.
  const visibleGroups = searchPermissionGroups(filterPermissionGroups(moduleFilter), permSearch);
  const visibleKeys = visibleGroups.flatMap((g) => g.permissions.map((p) => p.key));

  // "Select all" acts on the VISIBLE permissions, so it respects the filter.
  const isAllSelected = visibleKeys.length > 0 && visibleKeys.every((k) => formData.permissions.includes(k));
  const toggleAll = () => {
    handleFieldChange(
      'permissions',
      isAllSelected
        ? formData.permissions.filter((k) => !visibleKeys.includes(k))
        : [...new Set([...formData.permissions, ...visibleKeys])],
    );
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setTouched({ name: true, permissions: true });

    const newErrors = {
      name: validateField('name', formData.name),
      permissions: validateField('permissions', formData.permissions),
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.permissions) return;

    setIsSubmitting(true);
    try {
      if (roleToEdit) {
        await updateRoleApi(roleToEdit.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          permissions: formData.permissions,
        });
      } else {
        await createRoleApi({
          name: formData.name.trim(),
          description: formData.description.trim(),
          permissions: formData.permissions,
        });
      }

      toast(roleToEdit ? 'Role updated successfully' : 'Role created successfully', 'success');
      setIsSubmitting(false);
      onClose();
      onSubmitSuccess?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to connect to backend service.');
      setSubmitError(message);
      setIsSubmitting(false);
      toast(message, 'error');
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={roleToEdit ? 'Edit Role' : 'Create New Role'}
        size="xl"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6 flex flex-col h-full"
          role="dialog"
          aria-modal="true"
        >
          {/* Scrollable content */}
          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
            {/* Info banner */}
            <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3.5 flex gap-3 items-start shadow-sm">
              <Shield size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed font-semibold">
                {roleToEdit
                  ? 'Modify the selected security role details and update its access permissions.'
                  : 'Configure a new system security role by specifying its name, purpose, and granular access permissions.'}
              </div>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-900 rounded-xl p-3.5 flex gap-2.5 items-start animate-fade-in shadow-sm">
                <ShieldAlert size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs font-bold leading-normal">{submitError}</div>
              </div>
            )}

            {/* Name + Description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1">
                <InputField
                  label="Role Name"
                  id="name"
                  placeholder="e.g. Sales Manager"
                  icon={Shield}
                  value={formData.name}
                  onChange={(val) => handleFieldChange('name', val)}
                  onBlur={() => handleBlur('name')}
                  error={touched.name ? errors.name : undefined}
                  showSuccess={touched.name && !errors.name}
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <div className="md:col-span-2">
                <TextareaField
                  label="Description"
                  id="description"
                  placeholder="Brief summary of this role's purpose and scope"
                  value={formData.description}
                  onChange={(val) => handleFieldChange('description', val)}
                  maxLength={150}
                  showCharCount
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Permissions section */}
            <div className="border-t border-gray-100 pt-4 space-y-3.5">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-800">
                    Assign Permissions
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">
                    Selected:{' '}
                    <span className="text-blue-600 font-bold">{formData.permissions.length}</span>{' '}
                    of {ALL_PERMISSION_KEYS.length} permissions
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {/* Permission search — module name, permission name or feature.
                      Filters the DISPLAYED list only; selections are untouched. */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Search permissions..."
                      aria-label="Search permissions"
                      className="w-48 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs font-semibold text-gray-700 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {permSearch && (
                      <button
                        type="button"
                        onClick={() => setPermSearch('')}
                        aria-label="Clear permission search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {/* Module filter — focus the list by product area */}
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value as ModuleFilter)}
                    aria-label="Filter permissions by module"
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    {MODULE_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={toggleAll}
                    disabled={visibleKeys.length === 0}
                    className={classNames(
                      'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
                      isAllSelected
                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                    )}
                  >
                    {isAllSelected ? (
                      <><Square size={14} /> Deselect All</>
                    ) : (
                      <><CheckSquare size={14} /> Select All</>
                    )}
                  </button>
                </div>
              </div>

              {/* Permission groups */}
              <div className="max-h-[320px] overflow-y-auto pr-1 border border-gray-200/80 rounded-xl p-4 divide-y divide-gray-100/70 space-y-5 bg-white shadow-inner">
                {visibleGroups.length === 0 ? (
                  permSearch.trim() ? (
                    /* Search miss — distinct from the "future module" state, and it
                       reassures the admin that nothing was deselected. */
                    <div className="py-10 text-center">
                      <p className="text-sm font-semibold text-gray-500">
                        No permissions match &ldquo;{permSearch.trim()}&rdquo;
                        {moduleFilter !== 'all' && <> in {MODULE_FILTERS.find((f) => f.value === moduleFilter)?.label}</>}.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Your {formData.permissions.length} selected permission{formData.permissions.length === 1 ? '' : 's'} {formData.permissions.length === 1 ? 'is' : 'are'} still selected.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPermSearch('')}
                        className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-sm font-semibold text-gray-500">
                        {MODULE_FILTERS.find((f) => f.value === moduleFilter)?.label} is reserved for a future module.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">No permissions are available here yet.</p>
                    </div>
                  )
                ) : visibleGroups.map((group, idx) => {
                  const groupKeys = group.permissions.map((p) => p.key);
                  const selectedInGroup = groupKeys.filter((k) =>
                    formData.permissions.includes(k)
                  ).length;
                  const isGroupAllSelected = selectedInGroup === groupKeys.length;

                  return (
                    <div key={group.label} className={classNames('space-y-2.5', idx > 0 && 'pt-4')}>
                      {/* Group header */}
                      <div className="flex justify-between items-center bg-gray-50/70 py-1.5 px-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-blue-500" />
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                            {group.label}
                          </h4>
                          <span className="text-[10px] font-semibold bg-gray-200/75 text-gray-600 py-0.5 px-1.5 rounded-full">
                            {selectedInGroup}/{groupKeys.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKeys)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {isGroupAllSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      {/* Permission items */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                        {group.permissions.map((permission) => {
                          const isChecked = formData.permissions.includes(permission.key);
                          return (
                            <label
                              key={permission.key}
                              onClick={() => togglePermission(permission.key)}
                              className={classNames(
                                'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all duration-150',
                                isChecked
                                  ? 'bg-blue-50/15 border-blue-200 ring-2 ring-blue-500/5'
                                  : 'bg-white border-gray-150 hover:border-gray-250 hover:bg-gray-50/30'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-200 rounded focus:ring-blue-500/20 focus:ring-2 cursor-pointer transition-all flex-shrink-0"
                              />
                              <div className="flex-1 leading-none">
                                <p
                                  className={classNames(
                                    'text-xs font-bold text-gray-800 transition-colors',
                                    isChecked && 'text-blue-600'
                                  )}
                                >
                                  {permission.label}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-relaxed">
                                  {permission.description}
                                </p>
                                <p className="text-[9px] text-gray-300 mt-0.5 font-mono">
                                  {permission.key}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Permissions error */}
              {touched.permissions && errors.permissions && (
                <p className="text-red-500 text-xs font-semibold flex items-center gap-1 animate-slide-down">
                  <ShieldAlert size={12} className="inline flex-shrink-0" />
                  {errors.permissions}
                </p>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-gray-100 mt-6 sticky bottom-0 bg-white z-10">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !isFormValid}
              fullWidth
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {roleToEdit ? 'Updating Role...' : 'Creating Role...'}
                </span>
              ) : roleToEdit ? (
                'Update Role'
              ) : (
                'Create Role'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
