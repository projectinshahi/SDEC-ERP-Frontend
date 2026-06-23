'use client';

import { useMemo, useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, KeyRound, ShieldCheck, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import { useToast } from '@/components/ToastProvider';
import { classNames } from '@/lib/utils';

/**
 * Account Security → Change Password card.
 *
 * Lets the signed-in user update their own password. Validates on the frontend
 * (required, match, new ≠ current, strength: ≥8 + upper + lower + number +
 * special) and the backend re-verifies with bcrypt before hashing with bcrypt
 * (PUT /api/auth/change-password). Used inside the Master Dashboard Settings page
 * (SuperAdmin-only via the master layout), but the card itself is generic.
 */

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  return { score: 5, label: 'Strong', color: 'bg-emerald-500' };
}

function PasswordField({
  label, id, value, onChange, show, onToggleShow, placeholder, autoComplete, disabled, error, success,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  success?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={classNames(
            'w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-100',
            error
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100 dark:border-rose-800 dark:focus:ring-rose-900/40'
              : success
                ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100 dark:border-emerald-800 dark:focus:ring-emerald-900/40'
                : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 dark:border-slate-700 dark:focus:ring-indigo-900/40',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={onToggleShow}
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function ChangePasswordCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = useMemo(() => [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Number', met: /[0-9]/.test(newPassword) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ], [newPassword]);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const isStrongEnough = strength.score === 5;
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword;
  const newDiffersFromCurrent = newPassword !== '' && newPassword !== currentPassword;

  const canSubmit =
    !isSubmitting && !!currentPassword && isStrongEnough && passwordsMatch && newDiffersFromCurrent;

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) { toast('Please enter your current password.', 'error'); return; }
    if (!newPassword) { toast('Please enter a new password.', 'error'); return; }
    if (!confirmPassword) { toast('Please confirm your new password.', 'error'); return; }
    if (!isStrongEnough) { toast('New password does not meet the strength requirements.', 'error'); return; }
    if (!passwordsMatch) { toast('New password and confirm password do not match.', 'error'); return; }
    if (!newDiffersFromCurrent) { toast('New password must be different from the current password.', 'error'); return; }

    setIsSubmitting(true);
    try {
      await apiClient.put('/auth/change-password', { currentPassword, newPassword });
      toast('Password updated successfully', 'success');
      resetForm();
    } catch (err: unknown) {
      // apiClient throws an ApiError whose `message` is the backend's error string
      // (e.g. "Current password is incorrect.").
      const message = err instanceof Error && err.message
        ? err.message
        : 'Something went wrong while updating your password.';
      toast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Password</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password to keep it secure.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <PasswordField
          label="Current Password"
          id="currentPassword"
          value={currentPassword}
          onChange={setCurrentPassword}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((s) => !s)}
          placeholder="Enter your current password"
          autoComplete="current-password"
          disabled={isSubmitting}
        />

        <div>
          <PasswordField
            label="New Password"
            id="newPassword"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew((s) => !s)}
            placeholder="Create a strong password"
            autoComplete="new-password"
            disabled={isSubmitting}
            error={newPassword && !newDiffersFromCurrent ? 'Must differ from your current password' : undefined}
          />

          {/* Strength meter + checklist */}
          {newPassword && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={classNames(
                        'h-1.5 flex-1 rounded-full transition-all duration-300',
                        strength.score >= level ? strength.color : 'bg-slate-200 dark:bg-slate-700',
                      )}
                    />
                  ))}
                </div>
                <span
                  className={classNames(
                    'text-xs font-bold',
                    strength.score <= 1 ? 'text-rose-500'
                      : strength.score <= 2 ? 'text-amber-500'
                        : strength.score <= 3 ? 'text-yellow-600'
                          : 'text-emerald-600',
                  )}
                >
                  {strength.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={classNames(
                      'flex items-center gap-1.5 text-xs font-medium transition-colors',
                      check.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400',
                    )}
                  >
                    {check.met ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <PasswordField
          label="Confirm Password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggleShow={() => setShowConfirm((s) => !s)}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          disabled={isSubmitting}
          error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
          success={!!confirmPassword && passwordsMatch}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified with bcrypt — never stored as plain text.
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
            ) : (
              'Update Password'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
