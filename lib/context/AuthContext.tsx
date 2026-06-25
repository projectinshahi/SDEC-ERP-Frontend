'use client';

/**
 * AuthContext — single shared authentication state for the entire app.
 *
 * Login flow:
 *  1. Call backend POST /api/auth/login
 *  2. On success → store token + user in localStorage, update state
 *  3. On 401/403 → surface the backend's exact error message to the UI
 *  4. If backend is unreachable AND credentials match the hardcoded Super Admin
 *     → fall back to local auth so the app still works offline
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { apiClient } from '@/lib/api/api-client';
import { ApiError } from '@/lib/api-errors';
import { SUPER_ADMIN_ROLE_NAME } from '@/lib/permissions/permissions.constants';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleName: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Hardcoded Super Admin fallback (matches backend) ─────────────────────────
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,   // true until localStorage is checked
  });

  // Rehydrate session from localStorage on first render
  useEffect(() => {
    try {
      const token = localStorage.getItem('authToken');
      const raw = localStorage.getItem('user');
      if (token && raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          user: {
            ...parsed,
            // Fail CLOSED: a missing roleName must NOT default to Super Admin
            // (that would silently grant full access). No roleName ⇒ no module
            // access until a fresh login repopulates it.
            roleName: parsed.roleName ?? '',
            permissions: parsed.permissions ?? [],
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch {
      // Corrupted storage — clear it
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  // Re-fetch the user's CURRENT role + permissions from the backend so RBAC stays
  // in sync WITHOUT a re-login (a role-permission change takes effect on the next
  // mount / tab focus). Fail-safe: on ANY error keep the cached permissions — the
  // backend independently enforces permissions on every request regardless.
  const refreshUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('authToken');
    // Skip the offline Super Admin fallback token (not a real backend session).
    if (!token || !token.startsWith('user-token-')) return;
    try {
      const res = await apiClient.get<{ user: AuthUser }>('/auth/me');
      // If logout cleared the session while this request was in flight, discard
      // the response so we never re-establish an authenticated state post-logout.
      if (!localStorage.getItem('authToken')) return;
      const fresh = res.data?.user;
      if (!fresh) return;
      const merged: AuthUser = {
        id: fresh.id,
        name: fresh.name,
        email: fresh.email,
        role: fresh.role,
        roleName: fresh.roleName ?? '',
        permissions: fresh.permissions ?? [],
        mustChangePassword: fresh.mustChangePassword ?? false,
      };
      localStorage.setItem('user', JSON.stringify(merged));
      setState({ user: merged, isAuthenticated: true, isLoading: false });
    } catch (err) {
      // Fail CLOSED on a revoked/forbidden session: a 401/403 from /auth/me means
      // the token is no longer valid for the current user, so clear the cached
      // session instead of keeping stale (possibly elevated) tabs. (401 is also
      // force-redirected by the api-client interceptor.) For transient network
      // errors we fail OPEN — keep cached permissions; the backend still enforces
      // every request independently.
      //
      // EXCEPTION: a forced-password-change user gets a 403 {mustChangePassword:true}
      // from EVERY authenticated route (incl. /auth/me) until they reset. That is a
      // valid session mid-reset — failing closed here would wipe it and trap them in
      // a /change-password ⇄ /login loop. So keep that session (fail open).
      const body = (err instanceof ApiError ? err.details : undefined) as { mustChangePassword?: boolean } | undefined;
      const mustChange = body?.mustChangePassword === true;
      if (err instanceof ApiError && (err.statusCode === 401 || (err.statusCode === 403 && !mustChange))) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  }, []);

  // Sync permissions on mount and whenever the tab regains focus.
  useEffect(() => {
    // refreshUser only setStates after an awaited fetch (not synchronous).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
    if (typeof window === 'undefined') return;
    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    // DO NOT set isLoading: true here. 
    // It causes login/page.tsx to unmount the LoginForm and erases all error states!
    // The LoginForm component handles its own local isLoading state.

    try {
      console.log(`[Auth] Logging in user: ${email}`);
      // ── Primary path: ask the backend ──────────────────────────────────────
      const response = await apiClient.post<{
        message: string;
        token: string;
        user: AuthUser;
      }>('/auth/login', { email, password });

      const { token, user } = response.data;

      console.log(`[Auth] Login successful. User: ${user.name} (ID: ${user.id}), Role: ${user.roleName}`);

      const authUser: AuthUser = {
        ...user,
        // Fail CLOSED on a missing roleName (see note above) — never default to
        // Super Admin. The backend always returns roleName for a real login.
        roleName: user.roleName ?? '',
        permissions: user.permissions ?? [],
        mustChangePassword: user.mustChangePassword ?? false,
      };

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(authUser));
      setState({ user: authUser, isAuthenticated: true, isLoading: false });

    } catch (err: unknown) {
      console.error('[Auth] Login failed:', err);
      
      // ── Fallback: backend unreachable + Super Admin credentials ────────────
      const isNetworkError =
        err instanceof Error && err.message === 'Network error. Please check your connection.';

      if (isNetworkError && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        console.warn('[Auth] Backend unreachable — using local Super Admin fallback.');
        const adminUser: AuthUser = {
          id: 'admin-1',
          name: 'ERP Admin',
          email,
          role: 'admin',
          roleName: SUPER_ADMIN_ROLE_NAME,
          permissions: [],
        };
        localStorage.setItem('authToken', 'dummy-jwt-token');
        localStorage.setItem('user', JSON.stringify(adminUser));
        setState({ user: adminUser, isAuthenticated: true, isLoading: false });
        return;
      }

      // ── Surface the real error message to the UI ───────────────────────────
      // We do not need to setState isLoading: false here because we didn't set it to true.
      if (err instanceof Error) {
        console.error(`[Auth] Error message: ${err.message}`);
        throw err;
      } else {
        console.error(`[Auth] Unknown error type:`, err);
        throw new Error('Invalid email or password');
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateUser = useCallback((updatedUser: AuthUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setState(prev => ({ ...prev, user: updatedUser }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
