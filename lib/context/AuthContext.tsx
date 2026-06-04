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
        setState({
          user: {
            ...parsed,
            roleName: parsed.roleName ?? SUPER_ADMIN_ROLE_NAME,
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
        roleName: user.roleName ?? SUPER_ADMIN_ROLE_NAME,
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

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
