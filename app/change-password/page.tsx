'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiClient } from '@/lib/api/api-client';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/Button';
import { Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  return { score: 5, label: 'Strong', color: 'bg-emerald-500' };
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, logout, updateUser } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password requirement checks for visual hints
  const passwordChecks = useMemo(() => {
    return [
      { label: 'At least 8 characters', met: newPassword.length >= 8 },
      { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
      { label: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
      { label: 'Number', met: /[0-9]/.test(newPassword) },
      { label: 'Special character', met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const isStrongEnough = passwordStrength.score === 5;
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword;

  // Protect route
  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  // If they don't need to change password, redirect to dashboard
  if (user && !user.mustChangePassword) {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current temporary password.');
      return;
    }

    if (!isStrongEnough) {
      setError('Please ensure your new password meets all security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('New password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      // Update local storage user state
      if (user) {
        const updatedUser = { ...user, mustChangePassword: false };
        updateUser(updatedUser);
      }

      toast.success('Password updated successfully!');
      
      // Redirect to dashboard now that password is changed
      router.push('/dashboard');
    } catch (err: any) {
      console.error('[ChangePassword] Error:', err);
      setError(err.response?.data?.error || err.message || 'An error occurred while changing password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security Update Required</h1>
          <p className="text-indigo-100 mt-2 text-sm">
            For your security, you must change your temporary password before accessing the ERP portal.
          </p>
        </div>

        <div className="p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="relative">
                <InputField
                  label="Current Password"
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter your temporary password"
                  icon={Lock}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  required
                  disabled={isSubmitting}
                />
                {currentPassword && (
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="relative">
                <InputField
                  label="New Password"
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  icon={Lock}
                  value={newPassword}
                  onChange={setNewPassword}
                  required
                  disabled={isSubmitting}
                />
                {newPassword && (
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              
              {/* Password Strength Bar */}
              {newPassword && (
                <div className="mt-3 space-y-3">
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
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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

            <div>
              <InputField
                label="Confirm New Password"
                id="confirmPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                icon={Lock}
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                disabled={isSubmitting}
                error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
                showSuccess={confirmPassword !== '' && passwordsMatch}
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !isStrongEnough || !passwordsMatch || !currentPassword}
                fullWidth
                className="py-3 text-base shadow-md hover:shadow-lg transition-all"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Updating Password...
                  </span>
                ) : (
                  'Update Password & Continue'
                )}
              </Button>
            </div>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={logout}
                disabled={isSubmitting}
                className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Logout instead
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
