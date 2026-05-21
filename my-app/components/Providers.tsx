'use client';

import { ThemeProvider } from '@/lib/hooks/useTheme';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper
 * Wraps the app with all necessary context providers
 */
export function Providers({ children }: ProvidersProps) {
  console.log('Providers component rendering');
  
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
