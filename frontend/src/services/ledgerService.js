import { apiClient, normalizeApiError } from './apiClient';

export const ledgerService = {
  async getUserBalance(accountId) {
    try {
      const { data } = await apiClient.get(`/ledger/balance/${accountId}`);
      return {
        accountId: data.account_id || accountId,
        cachedBalance: Number(data.cached_balance || 0),
        realtimeBalance: Number(data.realtime_balance || 0),
        currency: data.currency || 'USD',
        isReconciled: Number(data.cached_balance || 0) === Number(data.realtime_balance || 0),
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async queryTransactions(payload) {
    try {
      const { data } = await apiClient.post('/ledger/transactions', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getBalance(accountId) {
    try {
      const { data } = await apiClient.get(`/ledger/accounts/${accountId}/balance`);
      return {
        accountId: data.account_id || accountId,
        cachedBalance: Number(data.cached_balance || 0),
        realtimeBalance: Number(data.realtime_balance || 0),
        currency: data.currency || 'USD',
        isReconciled: Boolean(data.is_reconciled ?? Number(data.cached_balance || 0) === Number(data.realtime_balance || 0)),
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getEntries(accountId, params = {}) {
    try {
      const { data } = await apiClient.get(`/ledger/accounts/${accountId}/entries`, { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getTransaction(transactionId) {
    try {
      const { data } = await apiClient.get(`/ledger/transactions/${transactionId}`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async reverseTransaction(transactionId) {
    try {
      const { data } = await apiClient.post(`/ledger/reverse/${transactionId}`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getAuditLogs(params) {
    try {
      const { data } = await apiClient.get('/ledger/audit-logs', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async exportAuditLogs(params) {
    try {
      const response = await apiClient.get('/ledger/audit-logs/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
