import { apiClient, normalizeApiError } from './apiClient';

export const adminRiskService = {
  async getFlags(params) {
    try {
      const { data } = await apiClient.get('/risk/aml-flags', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async reviewFlag(flagId) {
    try {
      const { data } = await apiClient.post(`/risk/aml-flags/${flagId}/review`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async clearFlag(flagId) {
    try {
      const { data } = await apiClient.post(`/risk/aml-flags/${flagId}/clear`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getFraudScores(params) {
    try {
      const { data } = await apiClient.get('/risk/fraud-scores', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getTransactionLimits() {
    try {
      const { data } = await apiClient.get('/risk/transaction-limits');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateTransactionLimits(payload) {
    try {
      const { data } = await apiClient.put('/risk/transaction-limits', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getVelocityViolations() {
    try {
      const { data } = await apiClient.get('/risk/velocity-violations');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
