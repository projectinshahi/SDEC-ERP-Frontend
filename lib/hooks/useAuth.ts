'use client';

/**
 * useAuth
 *
 * Thin re-export that delegates to the shared AuthContext.
 * All existing call sites (AuthGuard, Sidebar, LoginForm, etc.) continue
 * to work without modification — they just now share a single state instance.
 */

export { useAuthContext as useAuth } from '@/lib/context/AuthContext';
export type { AuthUser } from '@/lib/context/AuthContext';
