'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Route protection guard that checks for authenticated sessions.
 * Displays a premium centered loading orb during initialization,
 * and seamlessly redirects unauthenticated users to the login screen.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.mustChangePassword && pathname !== '/change-password') {
        router.replace('/change-password');
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  // Premium loading state displayed while the session status is resolving
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 dark:text-indigo-400" />
            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full scale-150 animate-pulse pointer-events-none" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 animate-pulse">
            Authorizing session...
          </p>
        </div>
      </div>
    );
  }

  // Prevent flashing content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
