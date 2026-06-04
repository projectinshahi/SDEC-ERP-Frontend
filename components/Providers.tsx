'use client';

import { ThemeProvider } from '@/lib/hooks/useTheme';
import { AuthProvider } from '@/lib/context/AuthContext';
import { ProjectProvider } from '@/lib/context/ProjectContext';
import { ToastProvider } from '@/components/ToastProvider';
import { ConfirmProvider } from '@/components/ConfirmDialogProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper
 * Wraps the app with all necessary context providers.
 * AuthProvider must be outermost so every component in the tree
 * shares the same authentication state.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ProjectProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <ToastProvider>
              <ConfirmProvider>
                {children}
              </ConfirmProvider>
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}
