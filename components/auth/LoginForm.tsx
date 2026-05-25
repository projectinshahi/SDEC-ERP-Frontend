'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

// Demo credentials — must match the backend hardcoded values
const DEMO_EMAIL = 'admin@gmail.com';
const DEMO_PASSWORD = 'admin123';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Validations & Touched States
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isEmailTouched, setIsEmailTouched] = useState(false);
  const [isPasswordTouched, setIsPasswordTouched] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  /** One-click fill with demo credentials */
  const fillDemoCredentials = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setIsEmailTouched(true);
    setIsPasswordTouched(true);
    setEmailError(null);
    setPasswordError(null);
    setAuthError(null);
  };

  // Focus on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Real-time validations
  useEffect(() => {
    if (!isEmailTouched) return;

    if (!email) {
      setEmailError('Email address is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  }, [email, isEmailTouched]);

  useEffect(() => {
    if (!isPasswordTouched) return;

    if (!password) {
      setPasswordError('Password is required');
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else {
      setPasswordError(null);
    }
  }, [password, isPasswordTouched]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    setIsEmailTouched(true);
    setIsPasswordTouched(true);

    // Double check errors before submit
    const isEmailValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = password && password.length >= 6;

    if (!isEmailValid || !isPasswordValid) {
      if (!email) setEmailError('Email address is required');
      if (!password) setPasswordError('Password is required');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      // ✓ Trim email and password before sending
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Direct call to useAuth login action
      await login(trimmedEmail, trimmedPassword);
      // Successful auth - redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed. Please verify your credentials.');
      setIsLoading(false);
    }
  };

  // Submit button is disabled if form is invalid or currently loading
  const isFormValid =
    email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password &&
    password.length >= 6;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Demo credentials hint banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3.5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Zap size={15} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-indigo-800 mb-1">Demo Credentials</p>
          <p className="text-xs text-indigo-600 font-mono leading-relaxed">
            <span className="block">Email: <strong>{DEMO_EMAIL}</strong></span>
            <span className="block">Password: <strong>{DEMO_PASSWORD}</strong></span>
          </p>
        </div>
        <button
          type="button"
          onClick={fillDemoCredentials}
          className="flex-shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:border-indigo-400 px-2.5 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap"
        >
          Auto-fill
        </button>
      </div>

      {/* Global Error Banner */}
      {authError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-r-lg transition-all animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
              Login Failed
            </h3>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              {authError}
            </p>
          </div>
        </div>
      )}

      {/* Email Input Field */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Email Address
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 h-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            ref={emailInputRef}
            type="email"
            name="email"
            id="email"
            autoComplete="email"
            required
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'email-error' : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setIsEmailTouched(true)}
            placeholder="Enter your email"
            disabled={isLoading}
            className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-gray-900 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
              emailError
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 dark:border-gray-700'
            }`}
          />
        </div>
        {emailError && (
          <p
            id="email-error"
            role="alert"
            className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 animate-slideDown"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {emailError}
          </p>
        )}
      </div>

      {/* Password Input Field */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 h-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="password"
            autoComplete="current-password"
            required
            aria-invalid={passwordError ? 'true' : 'false'}
            aria-describedby={passwordError ? 'password-error' : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setIsPasswordTouched(true)}
            placeholder="••••••••"
            disabled={isLoading}
            className={`block w-full pl-10 pr-10 py-3 border rounded-xl text-gray-900 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
              passwordError
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 dark:border-gray-700'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none transition-colors"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-5 h-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
        {passwordError && (
          <p
            id="password-error"
            role="alert"
            className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 animate-slideDown"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {passwordError}
          </p>
        )}
      </div>

      {/* Remember Me Option */}
      <div className="flex items-center">
        <input
          id="remember-me"
          name="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={isLoading}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        />
        <label
          htmlFor="remember-me"
          className="ml-2.5 block text-sm text-gray-600 dark:text-gray-400 select-none"
        >
          Remember my session
        </label>
      </div>

      {/* Action Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className={`relative w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
          !isFormValid || isLoading
            ? 'bg-indigo-400/75 dark:bg-indigo-600/50 cursor-not-allowed shadow-none'
            : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 active:scale-[0.98]'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign In</span>
        )}
      </button>
    </form>
  );
}
