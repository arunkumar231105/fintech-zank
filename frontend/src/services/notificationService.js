import { apiClient, normalizeApiError } from './apiClient';

export const notificationService = {
  async getNotifications(params) {
    try {
      const { data } = await apiClient.get('/notifications', { params });
      return {
        items: Array.isArray(data.items) ? data.items : [],
        pagination: data.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
        unreadCount: Number(data.unread_count || 0),
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async markRead(notificationId) {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      return notificationId;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async markAllRead() {
    try {
      await apiClient.put('/notifications/read-all');
      return true;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
