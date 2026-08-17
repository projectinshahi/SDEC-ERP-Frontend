'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Circle, AlertCircle, MessageSquare, Paperclip, UserPlus, FileText } from 'lucide-react';
import { useNotificationsApi, type Notification as AppNotification } from '@/lib/api/notifications';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getModuleAccess, resolveModule, withModuleContext } from '@/lib/permissions/moduleAccess';
import { formatDistanceToNow } from 'date-fns';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');

  const { fetchNotifications, markAsRead, markAllAsRead } = useNotificationsApi();
  const { user } = useAuth();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (user && token) {
      loadNotifications();

      // Setup socket connection
      if (!socketRef.current) {
        console.log('[NotificationBell] Connecting to Socket:', SOCKET_URL);
        socketRef.current = io(SOCKET_URL, {
          auth: { token }
        });

        socketRef.current.on('connect', () => {
          console.log('[NotificationBell] Connected to socket server');
        });

        socketRef.current.on('connect_error', (err) => {
          console.error('[NotificationBell] Socket connection error:', err.message);
        });

        socketRef.current.on('new_notification', (newNotif: AppNotification) => {
          console.log('[NotificationBell] Received new notification:', newNotif);
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        });
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (user && token) {
      loadNotifications();
    }
  }, [filter, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    const data = await fetchNotifications(1, 20, filter);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);

    if (notif.entity_type === 'blocker') {
      router.push(`/dashboard/blockers?blockerId=${notif.entity_id}`);
    } else if (notif.entity_type === 'bug') {
      router.push(`/dashboard/bugs?bugId=${notif.entity_id}`);
    } else if (notif.entity_type === 'my_task') {
      // Keep the shared My Tasks page in the module the user is currently viewing.
      // Read the location in the handler (client-only) so this component needs no
      // useSearchParams — which would otherwise force a Suspense boundary at build.
      const mod = resolveModule(window.location.pathname, new URLSearchParams(window.location.search).get('module'), getModuleAccess(user));
      router.push(withModuleContext(`/dashboard/my-tasks?taskId=${notif.entity_id}`, mod));
    } else if (notif.entity_type === 'lead' && notif.entity_id) {
      // Reminder / lead notifications open the Opportunity they belong to.
      router.push(`/dashboard/sales/pipeline/${notif.entity_id}`);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'reassignment':
        return <UserPlus size={16} className="text-blue-500" />;
      case 'status_change':
        return <Circle size={16} className="text-emerald-500" />;
      case 'escalation':
        return <AlertCircle size={16} className="text-rose-500" />;
      case 'discussion':
      case 'mention':
        return <MessageSquare size={16} className="text-amber-500" />;
      case 'attachment':
        return <Paperclip size={16} className="text-gray-500" />;
      default:
        return <FileText size={16} className="text-indigo-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 relative hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                <Check size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex px-4 py-2 gap-2 border-b border-gray-100 dark:border-gray-700/60 overflow-x-auto scrollbar-hide">
            {['all', 'unread', 'assignments', 'status updates'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${filter === f
                  ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 bg-white dark:bg-gray-800">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                <Bell size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No notifications found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex gap-3 relative ${!notif.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                      }`}
                  >
                    {!notif.is_read && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                    <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1.5 uppercase tracking-wider">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
