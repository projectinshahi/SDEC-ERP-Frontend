'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import { CheckboxGroup } from './CheckboxGroup';
import { Shield, ShieldAlert, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { createRoleApi, updateRoleApi } from '@/lib/api/roles';
import type { Permission } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
  roleToEdit?: {
    id: string | number;
    name: string;
    description: string;
    permissions: string[];
  } | null;
}

const DEFAULT_PERMISSIONS: Permission[] = [
  // User Management
  { id: 'create_user', name: 'Create User', description: 'Create and provision new system users', category: 'User Management' },
  { id: 'edit_user', name: 'Edit User', description: 'Update profile and status details for existing users', category: 'User Management' },
  { id: 'delete_user', name: 'Delete User', description: 'Permanently remove system users from the database', category: 'User Management' },
  
  // Task Management
  { id: 'create_task', name: 'Create Task', description: 'Create new operational tasks', category: 'Task Management' },
  { id: 'edit_task', name: 'Edit Task', description: 'Modify execution details for existing tasks', category: 'Task Management' },
  { id: 'delete_task', name: 'Delete Task', description: 'Permanently remove operational tasks from the database', category: 'Task Management' },
];

export function CreateRoleModal({
  isOpen,
  onClose,
  onSubmitSuccess,
  roleToEdit = null,
}: CreateRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Reset form or populate with edit values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (roleToEdit) {
        setFormData({
          name: roleToEdit.name || '',
          description: roleToEdit.description || '',
          permissions: Array.isArray(roleToEdit.permissions) ? roleToEdit.permissions : [],
        });
      } else {
        setFormData({
          name: '',
          description: '',
          permissions: [],
        });
      }
      setErrors({});
      setTouched({});
      setSubmitError(null);
      setShowSuccessToast(false);
    }
  }, [isOpen, roleToEdit]);

  // Form field validation checks
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'name':
        if (!String(value).trim()) return 'Role Name is required';
        if (String(value).trim().length < 3) return 'Role Name must be at least 3 characters';
        return '';
      case 'permissions':
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one permission must be selected';
        }
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      
      const errorMsg = validateField(field, value);
      setErrors((errs) => ({
        ...errs,
        [field]: errorMsg,
      }));

      return next;
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, (formData as any)[field]);
    setErrors((errs) => ({
      ...errs,
      [field]: errorMsg,
    }));
  };

  const hasErrors =
    validateField('name', formData.name) !== '' ||
    validateField('permissions', formData.permissions) !== '';

  const isFormValid = !hasErrors;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Mark all as touched
    setTouched({
      name: true,
      permissions: true,
    });

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

      // Trigger success animations
      setShowSuccessToast(true);
      
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      }, 1500);
    } catch (err: any) {
      console.error(roleToEdit ? 'Error updating role:' : 'Error creating role:', err);
      setSubmitError(
        err.response?.data?.message || 
        err.message || 
        'Failed to connect to backend service. Ensure DB and server are running.'
      );
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent close during loading
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={roleToEdit ? 'Edit Role' : 'Create New Role'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full" role="dialog" aria-modal="true">
          {/* Form Content Wrapper (Scrollable area) */}
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {/* Helper Instructions Banner */}
            <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3.5 flex gap-3 items-start shadow-sm">
              <Shield size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed font-semibold">
                {roleToEdit 
                  ? 'Modify the selected security role details and update its access permissions.' 
                  : 'Configure a new system security role by specifying its name, general purpose, and granular task access limits.'}
              </div>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-900 rounded-xl p-3.5 flex gap-2.5 items-start animate-fade-in shadow-sm">
                <ShieldAlert size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs font-bold leading-normal">{submitError}</div>
              </div>
            )}

            {/* General Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Role Name Field */}
              <div className="md:col-span-1">
                <InputField
                  label="Role Name"
                  id="name"
                  placeholder="Enter role name"
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

              {/* Description textarea */}
              <div className="md:col-span-2">
                <TextareaField
                  label="Description"
                  id="description"
                  placeholder="Enter role description"
                  value={formData.description}
                  onChange={(val) => handleFieldChange('description', val)}
                  maxLength={150}
                  showCharCount
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Permissions Checklist Group */}
            <div className="border-t border-gray-100 pt-4">
              <CheckboxGroup
                label="Assign Permissions"
                permissions={DEFAULT_PERMISSIONS}
                selected={formData.permissions}
                onChange={(selected) => handleFieldChange('permissions', selected)}
                error={touched.permissions ? errors.permissions : undefined}
                required
              />
            </div>
          </div>

          {/* Sticky Actions Footer */}
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
                    ? (roleToEdit ? 'Role Updated!' : 'Role Created!') 
                    : (roleToEdit ? 'Updating Role...' : 'Creating Role...')}
                </span>
              ) : (
                roleToEdit ? 'Update Role' : 'Create Role'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Floating Action Success Toast Notification */}
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
