import { apiClient, normalizeApiError } from './apiClient';

export const adminComplianceService = {
  async getKycQueue(params) {
    try {
      const { data } = await apiClient.get('/admin/compliance/kyc-queue', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateKyc(userId, payload) {
    try {
      const { data } = await apiClient.put(`/admin/compliance/kyc/${userId}`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
