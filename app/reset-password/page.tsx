'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';

interface ValidationError {
  password?: string;
  confirmPassword?: string;
  token?: string;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [errors, setErrors] = useState<ValidationError>({});
  const [success, setSuccess] = useState(false);
  const [isTouched, setIsTouched] = useState({ password: false, confirmPassword: false });

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setErrors({ token: 'No reset token provided. Please use the link from your email.' });
        setIsValidatingToken(false);
        return;
      }

      try {
        console.log('[Auth] Validating reset token');
        await apiClient.post('/auth/validate-reset-token', { token });
        setIsValidatingToken(false);
      } catch (err: any) {
        console.error('[Auth] Token validation failed:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Reset link is invalid or has expired. Please request a new one.';
        setErrors({ token: errorMessage });
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd))
      return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pwd))
      return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd))
      return 'Password must contain at least one special character';
    return null;
  };

  const validateConfirmPassword = (confirm: string): string | null => {
    if (!confirm) return 'Please confirm your password';
    if (confirm !== password) return 'Passwords do not match';
    return null;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (isTouched.password) {
      const error = validatePassword(value);
      setErrors((prev) => ({ ...prev, password: error || undefined }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (isTouched.confirmPassword) {
      const error = validateConfirmPassword(value);
      setErrors((prev) => ({ ...prev, confirmPassword: error || undefined }));
    }
  };

  const handlePasswordBlur = () => {
    setIsTouched((prev) => ({ ...prev, password: true }));
    const error = validatePassword(password);
    setErrors((prev) => ({ ...prev, password: error || undefined }));
  };

  const handleConfirmPasswordBlur = () => {
    setIsTouched((prev) => ({ ...prev, confirmPassword: true }));
    const error = validateConfirmPassword(confirmPassword);
    setErrors((prev) => ({ ...prev, confirmPassword: error || undefined }));
  };

  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'text-red-400' };
    if (score <= 2) return { score: 2, label: 'Fair', color: 'text-yellow-400' };
    if (score <= 3) return { score: 3, label: 'Good', color: 'text-blue-400' };
    return { score: 4, label: 'Strong', color: 'text-emerald-400' };
  };

  const passwordStrength = getPasswordStrength(password);
  const isFormValid =
    password &&
    confirmPassword &&
    !errors.password &&
    !errors.confirmPassword &&
    !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);

    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError || undefined,
        confirmPassword: confirmPasswordError || undefined,
      });
      return;
    }

    if (!token) {
      setErrors({ token: 'Reset token is missing. Please use the link from your email.' });
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Auth] Submitting password reset');
      const response = await apiClient.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });

      setSuccess(true);
      console.log('[Auth] Password reset successful');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setErrors({ token: errorMessage });
      console.error('[Auth] Password reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Token error state
  if (errors.token && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-red-500/20 p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-white mb-4">Reset Link Expired</h1>

            <p className="text-gray-400 text-center mb-6">{errors.token}</p>

            <Link href="/forgot-password">
              <button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 active:scale-95">
                Request New Link
              </button>
            </Link>

            <Link href="/login" className="block mt-4">
              <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 px-4 rounded-xl transition-all duration-200">
                Back to Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-emerald-500/20 p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-white mb-4">Password Reset!</h1>

            <p className="text-gray-400 text-center mb-6">
              Your password has been successfully reset. Redirecting to login...
            </p>

            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Login
        </Link>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-indigo-500/20 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 flex items-center justify-center">
                <Lock size={24} className="text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
            <p className="text-gray-400">Enter a new password for your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                  disabled={isLoading}
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border bg-gray-950 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 ${
                    errors.password && isTouched.password
                      ? 'border-red-500/50 focus:ring-red-500/50'
                      : 'border-gray-700 focus:border-indigo-500/50 focus:ring-indigo-500/50 hover:border-gray-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.score === 1
                          ? 'w-1/4 bg-red-500'
                          : passwordStrength.score === 2
                            ? 'w-1/2 bg-yellow-500'
                            : passwordStrength.score === 3
                              ? 'w-3/4 bg-blue-500'
                              : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              {errors.password && isTouched.password && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  onBlur={handleConfirmPasswordBlur}
                  disabled={isLoading}
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border bg-gray-950 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 ${
                    errors.confirmPassword && isTouched.confirmPassword
                      ? 'border-red-500/50 focus:ring-red-500/50'
                      : 'border-gray-700 focus:border-indigo-500/50 focus:ring-indigo-500/50 hover:border-gray-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-400 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.confirmPassword && isTouched.confirmPassword && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-900/50 border border-indigo-500/20 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-300">Password must include:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  8+ characters
                </div>
                <div className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  Uppercase
                </div>
                <div className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  Lowercase
                </div>
                <div className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  Number
                </div>
                <div className={`flex items-center gap-2 col-span-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  Special character
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isFormValid
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white active:scale-95'
                  : 'bg-indigo-600/50 text-indigo-300/50 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Reset Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
