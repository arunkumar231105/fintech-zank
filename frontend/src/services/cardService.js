import { apiClient, normalizeApiError } from './apiClient';

function normalizeCard(card = {}) {
  return {
    id: card.id,
    cardName: card.card_name || card.name || '',
    last4: card.last4 || '',
    maskedNumber: card.masked_number || `**** ${card.last4 || ''}`,
    holder: card.holder || '',
    expiry: card.expiry || '',
    status: card.status || 'active',
    dailyLimit: Number(card.daily_limit || card.dailyLimit || 0),
    monthlyLimit: Number(card.monthly_limit || card.monthlyLimit || 0),
    allowedCategories: Array.isArray(card.allowed_categories) ? card.allowed_categories : [],
    blockedMerchants: Array.isArray(card.blocked_merchants) ? card.blocked_merchants : [],
    brand: card.brand || 'Zank Virtual',
    type: card.type || 'virtual',
    color: card.color || 'aqua',
  };
}

function normalizeCardDetails(payload = {}) {
  return {
    ...normalizeCard(payload),
    cardNumber: payload.card_number || '',
    cvv: payload.cvv || '',
    recentTransactions: Array.isArray(payload.recent_transactions) ? payload.recent_transactions : [],
  };
}

export const cardService = {
  async getCards() {
    try {
      const { data } = await apiClient.get('/cards');
      return Array.isArray(data.cards) ? data.cards.map(normalizeCard) : [];
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createCard(payload) {
    try {
      const { data } = await apiClient.post('/cards', payload);
      return normalizeCard(data.card || {});
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async requestCardDetailsOtp(cardId) {
    try {
      const { data } = await apiClient.post(`/cards/${cardId}/details/otp`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getCardDetails(cardId, otp) {
    try {
      const { data } = await apiClient.get(`/cards/${cardId}/details`, { params: { otp } });
      return normalizeCardDetails(data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateStatus(cardId, status) {
    try {
      const { data } = await apiClient.put(`/cards/${cardId}/status`, { status });
      return normalizeCard(data.card || {});
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateLimits(cardId, payload) {
    try {
      const { data } = await apiClient.put(`/cards/${cardId}/limits`, payload);
      return normalizeCard(data.card || {});
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateControls(cardId, payload) {
    try {
      const { data } = await apiClient.put(`/cards/${cardId}/controls`, payload);
      return normalizeCard(data.card || {});
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteCard(cardId) {
    try {
      await apiClient.delete(`/cards/${cardId}`);
      return cardId;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
