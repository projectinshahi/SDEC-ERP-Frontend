import { useState, useCallback } from 'react';
import { apiClient } from './api-client';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: number;
  is_read: boolean;
  created_at: string;
}

export const useNotificationsApi = () => {
  const fetchNotifications = useCallback(async (page = 1, limit = 20, filter = 'all') => {
    try {
      const response = await apiClient.get<any>(`/notifications?page=${page}&limit=${limit}&filter=${filter}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      const response = await apiClient.patch<any>(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await apiClient.patch<any>(`/notifications/read-all`);
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  return { fetchNotifications, markAsRead, markAllAsRead };
};
