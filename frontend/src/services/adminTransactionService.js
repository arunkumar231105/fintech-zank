import { apiClient, normalizeApiError } from './apiClient';

export const adminTransactionService = {
  async getTransactions(params) {
    try {
      const { data } = await apiClient.get('/admin/transactions', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async reverseTransaction(transactionId, payload) {
    try {
      const { data } = await apiClient.post(`/admin/transactions/${transactionId}/reverse`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async flagTransaction(transactionId, payload) {
    try {
      const { data } = await apiClient.post(`/admin/transactions/${transactionId}/flag`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
