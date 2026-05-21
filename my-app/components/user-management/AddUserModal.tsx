'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FormInput } from './FormInput';
import { MultiSelect } from './MultiSelect';
import { User, Mail, Lock, CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import type { User as UserType, UserFormData } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';

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
        if (!Array.isArray(value) || value.length === 0) return 'At least one role must be assigned';
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editUser ? 'Edit User Profile' : 'Create New User'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Helper Instructions */}
        <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-3 flex gap-2.5 items-start">
          <ShieldCheck size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-normal font-semibold">
            {editUser
              ? `You are editing profile settings for user "${editUser.name}". Review changes before updating.`
              : 'Add a new member to your team. They will receive credentials matching the password provided below.'}
          </div>
        </div>

        {/* SECTION A: General Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name"
            id="name"
            placeholder="e.g. Sarah Connor"
            icon={User}
            value={formData.name}
            onChange={(val) => handleFieldChange('name', val)}
            onBlur={() => handleBlur('name')}
            error={touched.name ? errors.name : undefined}
            showSuccess={touched.name && !errors.name}
            required
            disabled={isSubmitting}
            autoFocus
          />

          <FormInput
            label="Email Address"
            id="email"
            type="email"
            placeholder="sarah@skynet.com"
            icon={Mail}
            value={formData.email}
            onChange={(val) => handleFieldChange('email', val)}
            onBlur={() => handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            showSuccess={touched.email && !errors.email}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* SECTION B: Security (Password) */}
        <FormInput
          label={editUser ? 'Reset Password (Optional)' : 'Security Password'}
          id="password"
          type="password"
          placeholder={editUser ? '•••••• (Leave blank to keep current)' : 'Provide a strong password'}
          icon={Lock}
          value={formData.password}
          onChange={(val) => handleFieldChange('password', val)}
          onBlur={() => handleBlur('password')}
          error={touched.password ? errors.password : undefined}
          showSuccess={touched.password && !errors.password && formData.password !== ''}
          helperText={editUser ? 'Fill only if you want to set a new password.' : 'Minimum length of 6 characters.'}
          required={!editUser}
          disabled={isSubmitting}
        />

        {/* SECTION C: Access Authorization (Roles) */}
        <MultiSelect
          label="Assigned Roles"
          options={availableRoles}
          selected={formData.roles}
          onChange={(roles) => handleFieldChange('roles', roles)}
          error={touched.roles ? errors.roles : undefined}
          required
        />

        {/* SECTION D: User Account Status */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Account Access Status</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Active Card */}
            <label
              className={classNames(
                'flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all duration-200 shadow-sm bg-white',
                formData.status === 'active'
                  ? 'border-green-500 ring-2 ring-green-500/10'
                  : 'border-gray-200 hover:border-gray-300',
                isSubmitting && 'opacity-65 cursor-not-allowed'
              )}
            >
              <input
                type="radio"
                name="status"
                value="active"
                checked={formData.status === 'active'}
                onChange={() => !isSubmitting && handleFieldChange('status', 'active')}
                className="w-4 h-4 text-green-600 border-gray-200 mt-0.5 focus:ring-green-500 cursor-pointer"
                disabled={isSubmitting}
              />
              <div className="leading-none">
                <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Active Access
                </span>
                <p className="text-[10px] text-gray-400 font-semibold mt-1 leading-normal">
                  User holds full login permissions and can interact with assigned modules.
                </p>
              </div>
            </label>

            {/* Inactive Card */}
            <label
              className={classNames(
                'flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all duration-200 shadow-sm bg-white',
                formData.status === 'inactive'
                  ? 'border-red-400 ring-2 ring-red-400/10'
                  : 'border-gray-200 hover:border-gray-300',
                isSubmitting && 'opacity-65 cursor-not-allowed'
              )}
            >
              <input
                type="radio"
                name="status"
                value="inactive"
                checked={formData.status === 'inactive'}
                onChange={() => !isSubmitting && handleFieldChange('status', 'inactive')}
                className="w-4 h-4 text-red-600 border-gray-200 mt-0.5 focus:ring-red-500 cursor-pointer"
                disabled={isSubmitting}
              />
              <div className="leading-none">
                <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  Suspended
                </span>
                <p className="text-[10px] text-gray-400 font-semibold mt-1 leading-normal">
                  Login is blocked immediately. Data remains intact for audits.
                </p>
              </div>
            </label>
          </div>
        </div>

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
                {editUser ? 'Saving Changes...' : 'Creating Account...'}
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
