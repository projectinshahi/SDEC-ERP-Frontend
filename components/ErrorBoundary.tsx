'use client';

import Link from 'next/link';
import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and display errors gracefully
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.reset) || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Something went wrong</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                We could not complete this request. Please try again or return to the dashboard.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 break-words">{this.state.error.message}</p>
              <div className="flex gap-3 flex-col sm:flex-row">
                <button
                  onClick={this.reset}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  Try again
                </button>
                <Link
                  href="/dashboard"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Return to dashboard
                </Link>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
