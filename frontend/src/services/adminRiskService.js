import { apiClient, normalizeApiError } from './apiClient';

export const adminRiskService = {
  async getFlags(params) {
    try {
      const { data } = await apiClient.get('/admin/risk/flags', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateFlag(flagId, payload) {
    try {
      const { data } = await apiClient.put(`/admin/risk/flags/${flagId}`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getRules() {
    try {
      const { data } = await apiClient.get('/admin/risk/rules');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateRule(ruleId, payload) {
    try {
      const { data } = await apiClient.put(`/admin/risk/rules/${ruleId}`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
