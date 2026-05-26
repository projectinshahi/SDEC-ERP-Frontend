'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft, Send } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEmailTouched, setIsEmailTouched] = useState(false);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const emailError =
    isEmailTouched && email.trim() && !validateEmail(email)
      ? 'Please enter a valid email address'
      : null;

  const isFormValid = !!email.trim() && validateEmail(email) && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailTouched(true);
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/auth/forgot-password',
        { email: email.trim().toLowerCase() }
      );

      console.log('[ForgotPassword] Response:', response.data);

      // ── Only show success if backend explicitly confirms email was sent ──
      if (response.data?.success === true) {
        setSuccess(true);
      } else {
        // Backend returned 200 but success: false
        setError(
          response.data?.message ||
            'Failed to send reset email. Please try again.'
        );
      }
    } catch (err: unknown) {
      // Network error or backend returned 4xx/5xx
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to send reset email. Please check your connection and try again.';
      console.error('[ForgotPassword] Error:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-emerald-500/20 p-8 shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-white mb-3">
              Check Your Email
            </h1>
            <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
              We've sent a password reset link to{' '}
              <span className="text-emerald-400 font-semibold">{email}</span>.
              Please check your inbox and click the link to reset your password.
            </p>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-emerald-300">
                💡 <strong>Note:</strong> The reset link expires in 15 minutes.
                Check your spam folder if you don't see it.
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
              <p className="text-xs text-amber-300">
                🛡️ <strong>Security Tip:</strong> We'll never ask you to share your
                password. If you didn't request this, ignore the email.
              </p>
            </div>

            <Link href="/login">
              <button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 active:scale-95">
                Back to Login
              </button>
            </Link>

            <button
              onClick={() => { setSuccess(false); setEmail(''); setError(null); }}
              className="w-full mt-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 px-4 rounded-xl transition-all duration-200 active:scale-95"
            >
              Try Another Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form screen ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-8 transition-colors text-sm"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Login
        </Link>

        {/* Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-indigo-500/20 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Mail size={22} className="text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
            <p className="text-gray-400 text-sm">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {/* Error alert — only shown when email actually failed to send */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Failed to Send Email</p>
                <p className="text-xs text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onBlur={() => setIsEmailTouched(true)}
                  disabled={isLoading}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-gray-950 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    emailError
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-gray-700 focus:border-indigo-500/50 focus:ring-indigo-500/30 hover:border-gray-600'
                  }`}
                />
              </div>
              {emailError && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {emailError}
                </p>
              )}
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3.5">
              <p className="text-xs text-indigo-300 leading-relaxed">
                ℹ️ For security, we only confirm email delivery — not whether the address is registered.
              </p>
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isFormValid
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white active:scale-95 shadow-lg shadow-indigo-500/20'
                  : 'bg-indigo-600/30 text-indigo-400/50 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending Reset Link…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <Link href="/login">
            <button className="w-full py-3 px-4 rounded-xl font-semibold text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200 border border-gray-700 hover:border-gray-600 text-sm">
              Back to Login
            </button>
          </Link>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
