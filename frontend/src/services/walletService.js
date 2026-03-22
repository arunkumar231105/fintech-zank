import { apiClient, normalizeApiError } from './apiClient';

function buildIdempotencyKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
    id: payload.id || '',
    userId: payload.userId || payload.user_id || '',
    accountId: payload.accountId || payload.account_id || '',
    walletId: payload.walletId || payload.wallet_id || '',
    ledgerAccountId: payload.ledgerAccountId || payload.ledger_account_id || payload.accountId || payload.account_id || '',
    totalBalance: Number(payload.totalBalance || payload.total_balance || payload.balance_cached || 0),
    cachedBalance: Number(payload.cachedBalance || payload.cached_balance || payload.totalBalance || payload.total_balance || payload.balance_cached || 0),
    availableBalance: Number(payload.availableBalance || payload.available_balance || 0),
    heldBalance: Number(payload.heldBalance || payload.held_balance || payload.held_amount || 0),
    currency: payload.currency || 'USD',
    accountNumber: payload.accountNumber || payload.account_number || '',
    routingNumber: payload.routingNumber || payload.routing_number || '',
    bankName: payload.bankName || payload.bank_name || 'Zank Bank',
    iban: payload.iban || '',
    status: payload.status || 'active',
    createdAt: payload.createdAt || payload.created_at || '',
    dailyLimit: Number(payload.dailyLimit || payload.daily_limit || 0),
    monthlyLimit: Number(payload.monthlyLimit || payload.monthly_limit || 0),
    todaySpend: Number(payload.todaySpend || payload.today_spend || 0),
    monthSpend: Number(payload.monthSpend || payload.month_spend || 0),
    realtimeBalance: Number(payload.realtimeBalance || payload.realtime_balance || 0),
    recentTransactions: recentTransactionsRaw.map(normalizeTransaction),
  };
}

export const walletService = {
  async getWallet() {
    try {
      const [walletResponse, legacyResponse] = await Promise.all([
        apiClient.get('/wallets/me'),
        apiClient.get('/wallet').catch(() => ({ data: {} })),
      ]);
      const normalized = {
        ...normalizeWallet(legacyResponse.data || {}),
        ...normalizeWallet(walletResponse.data || {}),
      };
      if (normalized.ledgerAccountId || normalized.accountId) {
        try {
          const ledgerBalance = await apiClient.get(`/wallets/${normalized.id || normalized.walletId}/balance`);
          return {
            ...normalized,
            totalBalance: Number(ledgerBalance.data.cached_balance || 0),
            cachedBalance: Number(ledgerBalance.data.cached_balance || 0),
            availableBalance: Number(ledgerBalance.data.available_balance || 0),
            heldBalance: Number(ledgerBalance.data.held_amount || 0),
            realtimeBalance: Number(ledgerBalance.data.realtime_balance || 0),
            status: ledgerBalance.data.status || normalized.status,
          };
        } catch (_error) {
          return normalized;
        }
      }
      return normalized;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getWalletForUser(userId) {
    try {
      const { data } = await apiClient.get(`/wallets/${userId}`);
      return normalizeWallet(data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getWalletBalance(walletIdentifier) {
    try {
      const { data } = await apiClient.get(`/wallets/${walletIdentifier}/balance`);
      return {
        walletId: data.wallet_id || walletIdentifier,
        cachedBalance: Number(data.cached_balance || 0),
        realtimeBalance: Number(data.realtime_balance || 0),
        heldAmount: Number(data.held_amount || 0),
        availableBalance: Number(data.available_balance || 0),
        currency: data.currency || 'USD',
        status: data.status || 'active',
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getWalletHolds(walletIdentifier) {
    try {
      const { data } = await apiClient.get(`/wallets/${walletIdentifier}/holds`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateWalletStatus(walletIdentifier, status) {
    try {
      const { data } = await apiClient.put(`/wallets/${walletIdentifier}/status`, { status });
      return data;
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
      const { data } = await apiClient.post('/transactions/withdraw', {
        amount: payload.amount,
        currency: payload.currency || 'USD',
        reference_id: payload.referenceId,
      });
      return {
        ...data,
        wallet: null,
        transaction: data ? normalizeTransaction({
          id: data.transaction_id,
          reference_id: data.reference_id,
          type: 'withdraw',
          amount: Number(data.amount || 0),
          status: data.status,
        }) : null,
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async send(payload) {
    try {
      const { data } = await apiClient.post('/transactions/transfer', {
        to_user_id: payload.toUserId,
        recipient: payload.recipientEmail,
        amount: payload.amount,
        currency: payload.currency || 'USD',
      }, {
        headers: {
          'Idempotency-Key': buildIdempotencyKey('transfer'),
        },
      });
      return {
        ...data,
        wallet: null,
        transaction: data ? normalizeTransaction({
          id: data.transaction_id,
          reference_id: data.reference_id,
          type: 'send',
          amount: Number(data.amount || 0),
          status: data.status,
        }) : null,
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deposit(payload) {
    try {
      const { data } = await apiClient.post('/transactions/deposit', payload);
      return data;
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
