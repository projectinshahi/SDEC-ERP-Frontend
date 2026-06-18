'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        if (user.roleName === 'SuperAdmin' || user.role === 'SuperAdmin') {
          router.push('/master-dashboard');
        } else {
          router.push('/modules');
        }
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router, user]);

  return null;
}
