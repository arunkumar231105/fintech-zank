import { apiClient, normalizeApiError } from './apiClient';

function normalizeTransaction(item = {}) {
  return {
    id: item.id || item.reference_id || '',
    referenceId: item.reference_id || item.id || '',
    type: item.type || 'send',
    direction: item.direction || (Number(item.signed_amount || 0) >= 0 ? 'credit' : 'debit'),
    description: item.description || '',
    merchant: item.merchant || '',
    amount: Number(item.amount || 0),
    signedAmount: Number(item.signed_amount || 0),
    currency: item.currency || 'USD',
    status: item.status || 'completed',
    fromUser: item.from_user || '',
    toUser: item.to_user || '',
    failureReason: item.failure_reason || '',
    reference: item.reference || item.reference_id || '',
    timestamp: item.timestamp || '',
    category: item.category || 'General',
    note: item.note || '',
    fee: Number(item.fee || 0),
    entries: Array.isArray(item.entries) ? item.entries : [],
    events: Array.isArray(item.events) ? item.events : [],
    createdAt: item.created_at || item.timestamp || '',
    postedAt: item.posted_at || '',
  };
}

export const transactionService = {
  async getTransactions(params) {
    try {
      const { data } = await apiClient.get('/transactions', { params });
      return {
        items: Array.isArray(data.items) ? data.items.map(normalizeTransaction) : [],
        pagination: data.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getTransaction(transactionId) {
    try {
      const { data } = await apiClient.get(`/transactions/${transactionId}`);
      return normalizeTransaction(data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getStats(period = 'month') {
    try {
      const { data } = await apiClient.get('/transactions/stats', { params: { period } });
      return {
        period: data.period || period,
        income: Number(data.income || 0),
        expenses: Number(data.expenses || 0),
        net: Number(data.net || 0),
        chart: Array.isArray(data.chart) ? data.chart : [],
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async exportTransactions(params) {
    try {
      const response = await apiClient.get('/transactions/export', {
        params,
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
