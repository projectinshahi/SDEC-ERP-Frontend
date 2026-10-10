'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Mail, Lock, AlertCircle, CheckCircle, Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import { ApiError } from '@/lib/api-errors';

/**
 * Self sign-up. Creates an account with the limited "External" role
 * (POST /auth/register). An administrator then assigns the real company role
 * from User Management → Users → Edit. Company staff are still added there
 * directly. No auto-login: until a role is assigned the account can't use the
 * company modules, so the user is sent back to the login page.
 */

// Same rules as the backend (auth.controller passwordProblem).
function passwordProblem(pwd: string): string | null {
  if (pwd.length < 8) return 'At least 8 characters';
  if (!/[A-Z]/.test(pwd)) return 'Add an uppercase letter';
  if (!/[a-z]/.test(pwd)) return 'Add a lowercase letter';
  if (!/[0-9]/.test(pwd)) return 'Add a number';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Add a special character';
  return null;
}

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const inputClass = (bad: boolean) =>
  `w-full pl-11 pr-4 py-3 rounded-xl border bg-gray-950 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-60 ${
    bad ? 'border-red-500/50 focus:ring-red-500/30' : 'border-gray-700 focus:border-indigo-500/50 focus:ring-indigo-500/30 hover:border-gray-600'
  }`;

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [success, setSuccess] = useState(false);

  const errors = {
    name: name.trim().length < 2 || name.trim().length > 50 ? 'Name must be 2–50 characters' : null,
    email: !validEmail(email.trim()) ? 'Please enter a valid email address' : null,
    password: passwordProblem(password),
    confirm: confirm !== password ? 'Passwords do not match' : null,
  };
  const isFormValid = !Object.values(errors).some(Boolean) && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);
    setAlreadyExists(false);
    try {
      await apiClient.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) setAlreadyExists(true);
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldError = (msg: string | null, value: string) =>
    touched || value ? msg : null;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-emerald-500/20 p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-white mb-3">Account Created</h1>
          <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
            Your account <span className="text-emerald-400 font-semibold">{email.trim().toLowerCase()}</span> is ready.
            An administrator will assign your role — you'll get full access after that.
          </p>
          <Link href="/login">
            <button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 active:scale-95">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const fields: { id: string; label: string; type: string; value: string; set: (v: string) => void; icon: any; err: string | null; auto: string; placeholder: string }[] = [
    { id: 'name', label: 'Full Name', type: 'text', value: name, set: setName, icon: User, err: fieldError(errors.name, name), auto: 'name', placeholder: 'e.g. Anjali Nair' },
    { id: 'email', label: 'Email Address', type: 'email', value: email, set: setEmail, icon: Mail, err: fieldError(errors.email, email), auto: 'email', placeholder: 'your.email@example.com' },
    { id: 'password', label: 'Password', type: 'password', value: password, set: setPassword, icon: Lock, err: fieldError(errors.password, password), auto: 'new-password', placeholder: '8+ chars, Aa, 1, !' },
    { id: 'confirm', label: 'Confirm Password', type: 'password', value: confirm, set: setConfirm, icon: Lock, err: fieldError(errors.confirm, confirm), auto: 'new-password', placeholder: 'Repeat your password' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-8 transition-colors text-sm">
          <ArrowLeft size={16} className="mr-2" />
          Back to Login
        </Link>

        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-indigo-500/20 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <UserPlus size={22} className="text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400 text-sm">An administrator will assign your role after you sign up.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">{error}</p>
                {alreadyExists && (
                  <Link href="/login" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 mt-1 inline-block">
                    Go to Login →
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {fields.map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-sm font-medium text-gray-300 mb-2">{f.label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <f.icon size={16} className="text-gray-500" />
                  </div>
                  <input
                    id={f.id}
                    type={f.type}
                    autoComplete={f.auto}
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={(e) => { f.set(e.target.value); setError(null); }}
                    disabled={isLoading}
                    className={inputClass(!!f.err)}
                  />
                </div>
                {f.err && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {f.err}
                  </p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isFormValid
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white active:scale-95 shadow-lg shadow-indigo-500/20'
                  : 'bg-indigo-600/30 text-indigo-300/70'
              }`}
            >
              {isLoading ? (<><Loader2 size={18} className="animate-spin" /> Creating account…</>) : (<><UserPlus size={16} /> Sign Up</>)}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
