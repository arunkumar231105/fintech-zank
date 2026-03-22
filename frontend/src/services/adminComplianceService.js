import { apiClient, normalizeApiError } from './apiClient';

export const adminComplianceService = {
  async getKycQueue(params) {
    try {
      const { data } = await apiClient.get('/risk/kyc-queue', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getKyc(userId) {
    try {
      const { data } = await apiClient.get(`/risk/kyc/${userId}`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async approveKyc(userId) {
    try {
      const { data } = await apiClient.post(`/risk/kyc/${userId}/approve`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async rejectKyc(userId, reason) {
    try {
      const { data } = await apiClient.post(`/risk/kyc/${userId}/reject`, { reason });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
