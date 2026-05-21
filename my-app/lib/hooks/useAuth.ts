'use client';

import { useState, useCallback, useEffect } from 'react';

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
 * Ready to integrate with your backend auth system
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
        // TODO: Call your backend to verify token/session
        // For now, check localStorage for demo purposes
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setState({
            user: JSON.parse(storedUser),
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // Initialize with demo user for immediate functionality
          const demoUser: User = {
            id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'Admin',
          };
          localStorage.setItem('user', JSON.stringify(demoUser));
          setState({
            user: demoUser,
            isAuthenticated: true,
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
      // TODO: Replace with actual API call
      const mockUser: User = {
        id: '1',
        name: 'John Doe',
        email,
        role: 'admin',
      };
      localStorage.setItem('user', JSON.stringify(mockUser));
      setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
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
