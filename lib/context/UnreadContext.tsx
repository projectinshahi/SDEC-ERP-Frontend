'use client';

import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchMyTaskUnreadCount } from '@/lib/api/myTasks';
import { fetchNoticeUnreadCount } from '@/lib/api/notices';
import { UNREAD_REFRESH_EVENT } from '@/lib/unreadBus';

/**
 * Global unread indicators for the sidebar dots (My Tasks + Notice).
 *
 * Real-time WITHOUT polling — it reuses the EXISTING infrastructure end to end:
 *  • counts come from the existing per-user unread tracking (thin /unread-count endpoints
 *    that reuse the same `unread` rules as the workspace / notice dashboard);
 *  • APPEAR is driven by the existing Socket.IO events — `mytask_changed` (already emitted
 *    to each member's `user_<id>` room on new task / message / attachment / status / member
 *    changes) and `notice_changed` (broadcast on notice publish / edit / archive / delete);
 *  • DISAPPEAR-on-read is driven by the same-session `unread:refresh` bus that markMyTaskRead
 *    / markNoticeRead already dispatch, plus a window-focus re-check.
 * A single instance lives at the app root, so exactly one fetch-on-login + one socket, and
 * every re-check is debounced. No new tables, no notification-center changes.
 */

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL
  || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')
  || 'http://localhost:3001';

interface UnreadIndicators {
  myTasks: number;
  notice: number;
  hasUnreadMyTasks: boolean;
  hasUnreadNotice: boolean;
  refresh: () => void;
}

const UnreadContext = createContext<UnreadIndicators>({
  myTasks: 0, notice: 0, hasUnreadMyTasks: false, hasUnreadNotice: false, refresh: () => { },
});

export function useUnreadIndicators(): UnreadIndicators {
  return useContext(UnreadContext);
}

export function UnreadIndicatorsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [myTasks, setMyTasks] = useState(0);
  const [notice, setNotice] = useState(0);

  // Notice is permission-gated (My Tasks is global). Held in a ref so the loaders/socket
  // handlers stay stable (no reconnect churn) yet always read the current permission.
  const canSeeNotice = isSuperAdmin || hasPermission('notice.view');
  const canSeeNoticeRef = useRef(canSeeNotice);
  canSeeNoticeRef.current = canSeeNotice;

  const socketRef = useRef<Socket | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMyTasks = useCallback(async () => {
    try { setMyTasks(await fetchMyTaskUnreadCount()); } catch { /* keep last known value */ }
  }, []);
  const loadNotice = useCallback(async () => {
    if (!canSeeNoticeRef.current) { setNotice(0); return; }
    try { setNotice(await fetchNoticeUnreadCount()); } catch { /* keep last known value */ }
  }, []);

  // Coalesce bursts (e.g. reading several items, or a flurry of socket events) into one pair
  // of light requests.
  const refresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { loadMyTasks(); loadNotice(); }, 300);
  }, [loadMyTasks, loadNotice]);

  // Initial load + socket wiring. Re-runs only when the authenticated user changes.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!user || !token) {
      setMyTasks(0);
      setNotice(0);
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      return;
    }

    loadMyTasks();
    loadNotice();

    if (!socketRef.current) {
      const socket = io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;
      socket.on('mytask_changed', () => refresh());   // new/updated task activity for me
      socket.on('notice_changed', () => refresh());   // notice published/edited/archived/deleted
      socket.on('new_notification', () => refresh());  // defensive catch-all
    }

    return () => {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    };
    // Intentionally keyed on `user` only — loaders/refresh are stable; re-subscribing each
    // render would thrash the socket connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-check the Notice count when the user's notice permission resolves or changes.
  useEffect(() => {
    if (user) loadNotice();
  }, [canSeeNotice, user, loadNotice]);

  // Same-session "disappear on read" bus + a focus re-check (cheap; catches anything that
  // changed while the tab was backgrounded). Neither is polling.
  useEffect(() => {
    const onRefresh = () => refresh();
    window.addEventListener(UNREAD_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      window.removeEventListener(UNREAD_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [refresh]);

  return (
    <UnreadContext.Provider
      value={{
        myTasks,
        notice,
        hasUnreadMyTasks: myTasks > 0,
        hasUnreadNotice: notice > 0,
        refresh,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
}
