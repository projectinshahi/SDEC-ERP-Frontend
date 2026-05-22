'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FormInput } from './FormInput';
import { CheckboxGroup } from './CheckboxGroup';
import { ShieldAlert, Info, Shield, Loader2 } from 'lucide-react';
import type { RoleFormData, Permission } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  availablePermissions: Permission[];
  editRole?: RoleFormData | null;
  isSubmitting?: boolean;
}

export function AddRoleModal({
  isOpen,
  onClose,
  onSubmit,
  availablePermissions,
  editRole,
  isSubmitting = false,
}: AddRoleModalProps) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RoleFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RoleFormData, boolean>>>({});

  // Reset form when editRole changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editRole?.name || '',
        description: editRole?.description || '',
        permissions: editRole?.permissions || [],
      });
      setErrors({});
      setTouched({});
    }
  }, [isOpen, editRole]);

  // Run validation checks on fields
  const validateField = (field: keyof RoleFormData, value: any): string => {
    switch (field) {
      case 'name':
        if (!String(value).trim()) return 'Role name is required';
        if (String(value).trim().length < 3) return 'Role name must be at least 3 characters';
        return '';
      case 'description':
        if (!String(value).trim()) return 'Description is required';
        if (String(value).trim().length < 10) return 'Description must be at least 10 characters';
        return '';
      case 'permissions':
        if (!Array.isArray(value) || value.length === 0) return 'At least one permission must be assigned';
        return '';
      default:
        return '';
    }
  };

  // Perform real-time validation as fields change
  const handleFieldChange = (field: keyof RoleFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      
      // Update errors immediately
      const errorMsg = validateField(field, value);
      setErrors((errs) => ({
        ...errs,
        [field]: errorMsg,
      }));

      return next;
    });
  };

  const handleBlur = (field: keyof RoleFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors((errs) => ({
      ...errs,
      [field]: errorMsg,
    }));
  };

  // Determine if form is completely valid
  const hasErrors =
    validateField('name', formData.name) !== '' ||
    validateField('description', formData.description) !== '' ||
    validateField('permissions', formData.permissions) !== '';

  const isFormValid = !hasErrors;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all as touched
    const allTouched: Partial<Record<keyof RoleFormData, boolean>> = {
      name: true,
      description: true,
      permissions: true,
    };
    setTouched(allTouched);

    // Validate all
    const newErrors: Partial<Record<keyof RoleFormData, string>> = {
      name: validateField('name', formData.name),
      description: validateField('description', formData.description),
      permissions: validateField('permissions', formData.permissions),
    };

    setErrors(newErrors);

    const hasValidationErrors = Object.values(newErrors).some((err) => err !== '');
    if (hasValidationErrors) return;

    onSubmit(formData);
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing while saving
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editRole ? 'Edit Role Details' : 'Create Custom Security Role'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Helper Instructions */}
        <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-3 flex gap-2.5 items-start">
          <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-normal font-semibold">
            {editRole
              ? `Modifying permissions for "${editRole.name}". Changes propagate immediately to all assigned users.`
              : 'Create a security role mapping. Select granular permissions to delegate module access safely.'}
          </div>
        </div>

        {/* SECTION A: General Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Role Name */}
          <div className="md:col-span-1">
            <FormInput
              label="Role Name"
              id="name"
              placeholder="e.g. Sales Executive"
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

          {/* Description */}
          <div className="md:col-span-2 space-y-1.5 w-full">
            <div className="flex justify-between items-center">
              <label
                htmlFor="description"
                className={classNames(
                  'block text-sm font-semibold transition-colors duration-150',
                  touched.description && errors.description ? 'text-red-500' : 'text-gray-700'
                )}
              >
                Role Purpose Description
                <span className="text-red-500 ml-1 font-bold">*</span>
              </label>
              <span className="text-[10px] text-gray-400 font-semibold">
                {formData.description.length}/100 chars
              </span>
            </div>
            <div className="relative">
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                onBlur={() => handleBlur('description')}
                rows={2}
                placeholder="Brief summary detailing this role's purpose, operational limits, and scope."
                className={classNames(
                  'w-full py-2.5 px-3.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-sm bg-white resize-none',
                  touched.description && errors.description
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300'
                    : touched.description && !errors.description && formData.description
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500 text-gray-900'
                    : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400',
                  isSubmitting && 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed shadow-none'
                )}
                disabled={isSubmitting}
              />
            </div>
            {touched.description && errors.description ? (
              <p className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-1 animate-slide-down">
                <ShieldAlert size={12} className="inline flex-shrink-0" />
                {errors.description}
              </p>
            ) : (
              <p className="text-gray-400 text-xs font-medium pl-0.5 leading-normal">
                Helps administrators select correct assignments during user onboarding.
              </p>
            )}
          </div>
        </div>

        {/* SECTION B: Grant Granular Permissions */}
        <CheckboxGroup
          label="Grant Granular Permissions"
          permissions={availablePermissions}
          selected={formData.permissions}
          onChange={(perms) => handleFieldChange('permissions', perms)}
          error={touched.permissions ? errors.permissions : undefined}
          required
        />

        {/* ACTIONS */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-gray-100 mt-6">
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
                {editRole ? 'Saving Roles...' : 'Granting Access Role...'}
              </span>
            ) : editRole ? (
              'Save Role Changes'
            ) : (
              'Create Role'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
