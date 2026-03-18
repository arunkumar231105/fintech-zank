import { apiClient, normalizeApiError } from './apiClient';

export const adminAuditService = {
  async getLogs(params) {
    try {
      const { data } = await apiClient.get('/admin/audit-logs', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async exportLogs(params) {
    try {
      const response = await apiClient.get('/admin/audit-logs/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
