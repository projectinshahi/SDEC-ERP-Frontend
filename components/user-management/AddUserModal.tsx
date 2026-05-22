'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
// SelectField removed to support multi-role selection
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { User as UserIcon, Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import type { User as UserType, UserFormData } from '@/lib/types/user-management';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  availableRoles: string[];
  editUser?: UserType | null;
  isSubmitting?: boolean;
}

export function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
  availableRoles,
  editUser,
  isSubmitting = false,
}: AddUserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    roles: [],
    status: 'active',
  });


  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof UserFormData, boolean>>>({});

  // Reset form when editUser changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editUser?.name || '',
        email: editUser?.email || '',
        password: '',
        roles: editUser?.roles || [],
        status: editUser?.status || 'active',
      });

      setErrors({});
      setTouched({});
    }
  }, [isOpen, editUser]);

  // Run validation checks on fields
  const validateField = (field: keyof UserFormData, value: any): string => {
    switch (field) {
      case 'name':
        if (!String(value).trim()) return 'Full name is required';
        if (String(value).trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!String(value).trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return 'Please enter a valid email format';
        return '';
      case 'password':
        // Password is only required when adding a new user, not when editing
        if (!editUser && !value) return 'Password is required';
        if (value && String(value).length < 6) return 'Password must be at least 6 characters';
        return '';
      case 'roles':
        if (!Array.isArray(value) || value.length === 0 || !value[0]) {
          return 'Please select a user role';
        }
        return '';
      default:
        return '';
    }
  };

  // Perform real-time validation as fields change
  const handleFieldChange = (field: keyof UserFormData, value: any) => {
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

  const handleBlur = (field: keyof UserFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors((errs) => ({
      ...errs,
      [field]: errorMsg,
    }));
  };

  const handleRoleToggle = (roleName: string) => {
    setTouched((prev) => ({ ...prev, roles: true }));
    setFormData((prev) => {
      const isSelected = prev.roles.includes(roleName);
      const updatedRoles = isSelected
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName];

      const errorMsg = validateField('roles', updatedRoles);
      setErrors((errs) => ({
        ...errs,
        roles: errorMsg,
      }));

      return { ...prev, roles: updatedRoles };
    });
  };

  const handleStatusToggle = (isActive: boolean) => {
    const nextStatus = isActive ? 'active' : 'inactive';
    setFormData((prev) => ({ ...prev, status: nextStatus }));
  };

  // Determine if form is completely valid
  const hasErrors =
    validateField('name', formData.name) !== '' ||
    validateField('email', formData.email) !== '' ||
    validateField('password', formData.password) !== '' ||
    validateField('roles', formData.roles) !== '';

  const isFormValid = !hasErrors;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all as touched
    const allTouched: Partial<Record<keyof UserFormData, boolean>> = {
      name: true,
      email: true,
      password: true,
      roles: true,
    };
    setTouched(allTouched);

    // Validate all
    const newErrors: Partial<Record<keyof UserFormData, string>> = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      roles: validateField('roles', formData.roles),
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

  // Combine dynamic role options from parent with user requested standard dummy choices
  const roleOptions = availableRoles.length > 0 ? availableRoles : ['Admin', 'Manager', 'Employee'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editUser ? 'Edit User Profile' : 'Create New User'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5" role="dialog" aria-modal="true">
        {/* Helper Instructions Banner */}
        <div className="bg-blue-50/35 border border-blue-100 rounded-xl p-3.5 flex gap-3 items-start shadow-sm">
          <ShieldCheck size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed font-semibold">
            {editUser
              ? `You are currently modifying settings for user "${editUser.name}". Verify security levels before proceeding.`
              : 'Add a new member to the ERP platform. Choose their security authorization and set their initial status.'}
          </div>
        </div>

        {/* Name Field */}
        <InputField
          label="Full Name"
          id="name"
          placeholder="Enter full name"
          icon={UserIcon}
          value={formData.name}
          onChange={(val) => handleFieldChange('name', val)}
          onBlur={() => handleBlur('name')}
          error={touched.name ? errors.name : undefined}
          showSuccess={touched.name && !errors.name}
          required
          disabled={isSubmitting}
          autoFocus
        />

        {/* Email Field */}
        <InputField
          label="Email Address"
          id="email"
          type="email"
          placeholder="e.g. name@company.com"
          icon={Mail}
          value={formData.email}
          onChange={(val) => handleFieldChange('email', val)}
          onBlur={() => handleBlur('email')}
          error={touched.email ? errors.email : undefined}
          showSuccess={touched.email && !errors.email}
          required
          disabled={isSubmitting}
        />

        {/* Password (Optional for editing, required for new users) */}
        <InputField
          label={editUser ? 'Reset Password (Optional)' : 'Initial Password'}
          id="password"
          type="password"
          placeholder={editUser ? '•••••• (Leave blank to keep original)' : 'Choose a strong password'}
          icon={Lock}
          value={formData.password}
          onChange={(val) => handleFieldChange('password', val)}
          onBlur={() => handleBlur('password')}
          error={touched.password ? errors.password : undefined}
          showSuccess={touched.password && !errors.password && formData.password !== ''}
          required={!editUser}
          disabled={isSubmitting}
        />

        {/* Role Select Checkbox Group */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Assigned Authorization Roles <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {roleOptions.map((roleName) => {
              const isChecked = formData.roles.includes(roleName);
              return (
                <button
                  key={roleName}
                  type="button"
                  onClick={() => handleRoleToggle(roleName)}
                  disabled={isSubmitting}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer shadow-sm ${
                    isChecked
                      ? 'border-blue-600 bg-blue-50/40 text-blue-700 ring-2 ring-blue-600/10'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span>{roleName}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isChecked 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {isChecked && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {touched.roles && errors.roles && (
            <p className="text-xs font-semibold text-red-500 mt-1.5">{errors.roles}</p>
          )}
        </div>

        {/* Status Toggle Switch */}
        <ToggleSwitch
          label="Account Operational Status"
          id="status"
          checked={formData.status === 'active'}
          onChange={(isActive) => handleStatusToggle(isActive)}
          description="Designate if this user should be allowed to log in and interact with resources immediately."
          activeLabel="Active"
          inactiveLabel="Inactive"
          disabled={isSubmitting}
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
                {editUser ? 'Saving Changes...' : 'Creating User...'}
              </span>
            ) : editUser ? (
              'Save Profile Changes'
            ) : (
              'Create User'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
