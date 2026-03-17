import { apiClient, normalizeApiError } from './apiClient';

function normalizeTransaction(transaction = {}) {
  return {
    id: transaction.id || transaction.txn_id || `txn-${Date.now()}`,
    merchant: transaction.merchant || 'Transfer',
    type: transaction.type || (Number(transaction.amount) >= 0 ? 'credit' : 'debit'),
    amount: Number(transaction.amount || 0),
    category: transaction.category || 'Transfer',
    status: transaction.status || 'completed',
    note: transaction.note || '',
    date: transaction.date || new Date().toISOString(),
  };
}

function normalizeWallet(payload = {}) {
  const recentTransactionsRaw = payload.recentTransactions || payload.recent_transactions || payload.transactions || [];
  return {
    walletId: payload.walletId || payload.wallet_id || '',
    totalBalance: Number(payload.totalBalance || payload.total_balance || 0),
    availableBalance: Number(payload.availableBalance || payload.available_balance || 0),
    heldBalance: Number(payload.heldBalance || payload.held_balance || 0),
    currency: payload.currency || 'USD',
    accountNumber: payload.accountNumber || payload.account_number || '',
    routingNumber: payload.routingNumber || payload.routing_number || '',
    bankName: payload.bankName || payload.bank_name || 'Zank Bank',
    iban: payload.iban || '',
    status: payload.status || 'active',
    dailyLimit: Number(payload.dailyLimit || payload.daily_limit || 0),
    monthlyLimit: Number(payload.monthlyLimit || payload.monthly_limit || 0),
    todaySpend: Number(payload.todaySpend || payload.today_spend || 0),
    monthSpend: Number(payload.monthSpend || payload.month_spend || 0),
    recentTransactions: recentTransactionsRaw.map(normalizeTransaction),
  };
}

export const walletService = {
  async getWallet() {
    try {
      const { data } = await apiClient.get('/wallet');
      return normalizeWallet(data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async sendWithdrawOtp(payload) {
    try {
      const { data } = await apiClient.post('/wallet/withdraw/send-otp', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async withdraw(payload) {
    try {
      const { data } = await apiClient.post('/wallet/withdraw', payload);
      return {
        ...data,
        wallet: data.wallet || null,
        transaction: data.transaction ? normalizeTransaction(data.transaction) : null,
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async send(payload) {
    try {
      const { data } = await apiClient.post('/wallet/send', payload);
      return {
        ...data,
        wallet: data.wallet || null,
        transaction: data.transaction ? normalizeTransaction(data.transaction) : null,
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async request(payload) {
    try {
      const { data } = await apiClient.post('/wallet/request', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  normalizeWallet,
  normalizeTransaction,
};
