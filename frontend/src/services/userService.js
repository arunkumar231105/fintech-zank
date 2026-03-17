import { apiClient, normalizeApiError } from './apiClient';

function normalizeProfile(payload = {}) {
  return {
    id: payload.id || '',
    firstName: payload.first_name || payload.firstName || '',
    lastName: payload.last_name || payload.lastName || '',
    email: payload.email || '',
    phone: payload.phone || '',
    role: payload.role || 'user',
    country: payload.country || '',
    timezone: payload.timezone || '',
    avatarUrl: payload.avatar_url || payload.avatarUrl || '',
    loyaltyTier: payload.loyalty_tier || payload.loyaltyTier || 'Bronze',
    kycStatus: payload.kyc_status || payload.kycStatus || 'pending',
    isVerified: Boolean(payload.is_verified ?? payload.isVerified ?? false),
    isActive: Boolean(payload.is_active ?? payload.isActive ?? true),
  };
}

function normalizeLinkedAccount(account = {}) {
  return {
    id: account.id,
    provider: account.provider || 'Plaid',
    bankName: account.bankName || account.bank_name || 'Bank Account',
    type: account.type || 'Checking',
    last4: account.last4 || '',
    linked: account.linked ?? true,
  };
}

export const userService = {
  async getProfile() {
    try {
      const { data } = await apiClient.get('/user/profile');
      return normalizeProfile(data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateProfile(payload) {
    try {
      await apiClient.put('/user/profile', payload);
      return payload;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post('/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.avatarUrl || data.avatar_url || '';
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getNotificationPreferences() {
    try {
      const { data } = await apiClient.get('/user/notifications/preferences');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateNotificationPreferences(payload) {
    try {
      const { data } = await apiClient.put('/user/notifications/preferences', payload);
      return data.preferences || payload;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getLinkedAccounts() {
    try {
      const { data } = await apiClient.get('/user/linked-accounts');
      return Array.isArray(data.accounts) ? data.accounts.map(normalizeLinkedAccount) : [];
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async addLinkedAccount(payload) {
    try {
      const { data } = await apiClient.post('/user/linked-accounts', payload);
      return normalizeLinkedAccount(data.account || payload);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async removeLinkedAccount(accountId) {
    try {
      await apiClient.delete(`/user/linked-accounts/${accountId}`);
      return accountId;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
