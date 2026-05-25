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
  CheckCircle2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { createRoleApi, updateRoleApi } from '@/lib/api/roles';
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS } from '@/lib/permissions/permissions.constants';
import type { PermissionKey } from '@/lib/permissions/permission.types';
import { classNames } from '@/lib/utils';

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
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Reset / populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (roleToEdit) {
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
      setShowSuccessToast(false);
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

  const toggleAll = () => {
    const allSelected = ALL_PERMISSION_KEYS.every((k) => formData.permissions.includes(k));
    handleFieldChange('permissions', allSelected ? [] : [...ALL_PERMISSION_KEYS]);
  };

  const isAllSelected = ALL_PERMISSION_KEYS.every((k) => formData.permissions.includes(k));

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

      setShowSuccessToast(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        onSubmitSuccess?.();
      }, 1500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to connect to backend service.');
      setSubmitError(message);
      setIsSubmitting(false);
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
                <button
                  type="button"
                  onClick={toggleAll}
                  className={classNames(
                    'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 self-start sm:self-center',
                    isAllSelected
                      ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                  )}
                >
                  {isAllSelected ? (
                    <>
                      <Square size={14} />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare size={14} />
                      Select All Permissions
                    </>
                  )}
                </button>
              </div>

              {/* Permission groups */}
              <div className="max-h-[320px] overflow-y-auto pr-1 border border-gray-200/80 rounded-xl p-4 divide-y divide-gray-100/70 space-y-5 bg-white shadow-inner">
                {PERMISSION_GROUPS.map((group, idx) => {
                  const groupKeys = group.permissions.map((p) => p.key);
                  const selectedInGroup = groupKeys.filter((k) =>
                    formData.permissions.includes(k)
                  ).length;
                  const isGroupAllSelected = selectedInGroup === groupKeys.length;

                  return (
                    <div key={group.module} className={classNames('space-y-2.5', idx > 0 && 'pt-4')}>
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
                  {showSuccessToast
                    ? roleToEdit
                      ? 'Role Updated!'
                      : 'Role Created!'
                    : roleToEdit
                    ? 'Updating Role...'
                    : 'Creating Role...'}
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

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-[200] pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl border border-green-100 bg-white animate-slide-in-right max-w-sm w-full">
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 animate-pulse">
            <CheckCircle2 size={16} />
          </div>
          <div className="flex-1 text-xs font-bold text-green-800 leading-normal">
            {roleToEdit ? 'Role updated successfully' : 'Role created successfully'}
          </div>
        </div>
      )}
    </>
  );
}
