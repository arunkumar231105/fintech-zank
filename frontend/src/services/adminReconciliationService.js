import { apiClient, normalizeApiError } from './apiClient';

export const adminReconciliationService = {
  async getReconciliation(params) {
    try {
      const { data } = await apiClient.get('/admin/reconciliation', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async runReconciliation(payload) {
    try {
      const { data } = await apiClient.post('/admin/reconciliation/run', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getReconciliationDetail(recordId) {
    try {
      const { data } = await apiClient.get(`/admin/reconciliation/${recordId}`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
