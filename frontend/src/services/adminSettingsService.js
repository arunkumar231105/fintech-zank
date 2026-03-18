import { apiClient, normalizeApiError } from './apiClient';

export const adminSettingsService = {
  async getSettings() {
    try {
      const { data } = await apiClient.get('/admin/settings');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateSettings(payload) {
    try {
      const { data } = await apiClient.put('/admin/settings', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getIntegrations() {
    try {
      const { data } = await apiClient.get('/admin/settings/integrations');
      return Array.isArray(data.items) ? data.items : [];
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
