import { apiClient, normalizeApiError } from './apiClient';

export const adminDepositService = {
  async deposit(payload) {
    try {
      const { data } = await apiClient.post('/admin/deposit', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
