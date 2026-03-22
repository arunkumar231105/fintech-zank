import { apiClient, normalizeApiError } from './apiClient';

export const adminReconciliationService = {
  async getReports(params) {
    try {
      const { data } = await apiClient.get('/reconciliation/reports', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async runReconciliation(payload) {
    try {
      const { data } = await apiClient.post('/reconciliation/run', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getReconciliationDetail(recordId) {
    try {
      const { data } = await apiClient.get(`/reconciliation/reports/${recordId}`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getAlerts(params) {
    try {
      const { data } = await apiClient.get('/reconciliation/alerts', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async resolveAlert(alertId) {
    try {
      const { data } = await apiClient.post(`/reconciliation/alerts/${alertId}/resolve`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
