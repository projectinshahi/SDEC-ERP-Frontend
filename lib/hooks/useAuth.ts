'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Custom hook for authentication
 * Connected to Express backend API
 */
export function useAuth(): AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          setState({
            user: JSON.parse(storedUser),
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // If no stored session, initialize as unauthenticated
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await apiClient.post<{ message: string; token: string }>('/auth/login', {
        email,
        password,
      });

      const { token } = response.data;
      
      const adminUser: User = {
        id: 'admin-1',
        name: 'ERP Admin',
        email,
        role: 'admin',
      };

      // Persist authenticating token and user state to local storage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(adminUser));

      setState({
        user: adminUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      // Spec requirement: throw custom exception to match "Invalid email or password" error
      throw new Error('Invalid email or password');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
