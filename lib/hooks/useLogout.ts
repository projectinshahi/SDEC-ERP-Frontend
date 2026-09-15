'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useConfirm } from '@/lib/hooks/useConfirm';

/**
 * The single logout entry point for the UI.
 *
 * Logout used to be wired straight to `onClick`, so one stray click on the
 * Navbar/Sidebar icon ended the session with no way back — and each of the four
 * call sites redirected differently (push, replace, or nothing at all). Routing
 * every one of them through here means the confirmation, the session clear and
 * the redirect can only happen in that order, exactly once.
 *
 * Nothing is cleared until the user confirms: `logout()` runs inside the
 * dialog's own action, which also supplies the loading state and the
 * double-click guard.
 */
export function useLogout() {
  const { logout } = useAuth();
  const { confirm } = useConfirm();
  const router = useRouter();

  return useCallback(async () => {
    await confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
      confirmLabel: 'Log Out',
      cancelLabel: 'Cancel',
      intent: 'danger',
      icon: LogOut,
      onConfirm: () => {
        logout();
        // `replace`, not `push` — Back must not return to an authenticated view.
        router.replace('/login');
      },
    });
  }, [confirm, logout, router]);
}
