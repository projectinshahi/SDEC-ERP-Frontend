'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
// SelectField removed to support multi-role selection
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { User as UserIcon, Mail, Lock, ShieldCheck, Loader2, Eye, EyeOff, Info } from 'lucide-react';
import type { User as UserType, UserFormData } from '@/lib/types/user-management';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  availableRoles: string[];
  editUser?: UserType | null;
  isSubmitting?: boolean;
}

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 5) return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-green-600' };
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

  const [showPassword, setShowPassword] = useState(false);
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
      setShowPassword(false);
    }
  }, [isOpen, editUser]);

  // Run validation checks on fields
  const validateField = (field: keyof UserFormData, value: any): string => {
    switch (field) {
      case 'name': {
        const name = String(value).trim();
        if (!name) return 'Full name is required';
        if (name.length < 2) return 'Name must be at least 2 characters';
        if (name.length > 50) return 'Name must be under 50 characters';
        if (!/^[A-Za-z\s.'-]+$/.test(name)) return 'Name can only contain letters, spaces, dots, hyphens and apostrophes';
        if (/^\s|\s$/.test(String(value))) return 'Name cannot start or end with spaces';
        return '';
      }
      case 'email': {
        const email = String(value).trim();
        if (!email) return 'Email address is required';
        if (email.length > 100) return 'Email must be under 100 characters';
        if (/\s/.test(email)) return 'Email cannot contain spaces';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email (e.g. name@gmail.com)';
        if (!email.toLowerCase().endsWith('@gmail.com')) return 'Only Gmail addresses are allowed (e.g. name@gmail.com)';
        return '';
      }
      case 'password': {
        const pwd = String(value);
        // Password is only required when adding a new user, not when editing
        if (!editUser && !pwd) return 'Password is required for new users';
        if (pwd) {
          if (pwd.length < 6) return 'Password must be at least 6 characters';
          if (pwd.length > 128) return 'Password must be under 128 characters';
        }
        return '';
      }
      case 'roles':
        if (!Array.isArray(value) || value.length === 0 || !value[0]) {
          return 'Please assign at least one role to the user';
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

      // Only show errors after field has been touched
      if (touched[field]) {
        const errorMsg = validateField(field, value);
        setErrors((errs) => ({
          ...errs,
          [field]: errorMsg,
        }));
      }

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

  // Password strength
  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  // Password requirement checks for visual hints
  const passwordChecks = useMemo(() => {
    const pwd = formData.password;
    return [
      { label: 'At least 6 characters', met: pwd.length >= 6 },
    ];
  }, [formData.password]);

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
              : 'Add a new member to the ERP platform. All fields marked with * are mandatory.'}
          </div>
        </div>

        {/* Name Field */}
        <div>
          <InputField
            label="Full Name"
            id="name"
            placeholder="e.g. John Doe"
            icon={UserIcon}
            value={formData.name}
            onChange={(val) => handleFieldChange('name', val)}
            onBlur={() => handleBlur('name')}
            error={touched.name ? errors.name : undefined}
            showSuccess={touched.name && !errors.name && formData.name.trim().length >= 2}
            required
            disabled={isSubmitting}
            autoFocus
            maxLength={50}
          />
          {touched.name && !errors.name && formData.name.trim() && (
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span>✓</span> Name looks good
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
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
            showSuccess={touched.email && !errors.email && formData.email.trim().length > 0}
            required
            disabled={isSubmitting}
            maxLength={100}
          />
          {touched.email && !errors.email && formData.email.trim() && (
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span>✓</span> Valid email format
            </p>
          )}
        </div>

        {/* Password Field with strength indicator */}
        <div>
          <div className="relative">
            <InputField
              label={editUser ? 'Reset Password (Optional)' : 'Password'}
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={editUser ? '•••••• (Leave blank to keep original)' : 'Min. 6 characters'}
              icon={Lock}
              value={formData.password}
              onChange={(val) => handleFieldChange('password', val)}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : undefined}
              showSuccess={touched.password && !errors.password && formData.password !== ''}
              required={!editUser}
              disabled={isSubmitting}
              maxLength={128}
            />
            {/* Toggle password visibility */}
            {formData.password && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>

          {/* Password Strength Bar */}
          {formData.password && (
            <div className="mt-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${passwordStrength.score >= level
                          ? passwordStrength.color
                          : 'bg-gray-200'
                        }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-bold ${passwordStrength.score <= 1 ? 'text-red-500' :
                    passwordStrength.score <= 2 ? 'text-orange-500' :
                      passwordStrength.score <= 3 ? 'text-yellow-600' :
                        'text-emerald-600'
                  }`}>
                  {passwordStrength.label}
                </span>
              </div>

              {/* Password requirement checklist */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${check.met ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                  >
                    {check.met ? (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                    )}
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Select Checkbox Group */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Assigned Authorization Roles <span className="text-red-500">*</span>
          </label>
          {roleOptions.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2">
              <Info size={14} className="flex-shrink-0" />
              No roles available. Please create a role first in Role Management.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {roleOptions.map((roleName) => {
                const isChecked = formData.roles.includes(roleName);
                return (
                  <button
                    key={roleName}
                    type="button"
                    onClick={() => handleRoleToggle(roleName)}
                    disabled={isSubmitting}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer shadow-sm ${isChecked
                        ? 'border-blue-600 bg-blue-50/40 text-blue-700 ring-2 ring-blue-600/10'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                  >
                    <span>{roleName}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked
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
          )}
          {touched.roles && errors.roles && (
            <p className="text-xs font-semibold text-red-500 mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.roles}
            </p>
          )}
          {touched.roles && !errors.roles && formData.roles.length > 0 && (
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span>✓</span> {formData.roles.length} role{formData.roles.length > 1 ? 's' : ''} selected
            </p>
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

        {/* Validation Summary (shown on submit attempt with errors) */}
        {Object.values(touched).some(Boolean) && hasErrors && (
          <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 flex gap-2.5 items-start">
            <Info size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-semibold">
              Please fix the highlighted errors above before submitting.
            </p>
          </div>
        )}

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

