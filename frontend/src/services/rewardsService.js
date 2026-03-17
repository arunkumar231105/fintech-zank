import { apiClient, normalizeApiError } from './apiClient';

function normalizeOffer(item = {}) {
  return {
    id: item.id || '',
    merchant: item.merchant || '',
    title: item.title || '',
    cashbackPercent: Number(item.cashback_percent || 0),
    expiryDate: item.expiry_date || '',
    active: Boolean(item.active),
    expired: Boolean(item.expired),
    icon: item.icon || '🎁',
  };
}

function normalizeHistory(item = {}) {
  return {
    id: item.id || '',
    date: item.date || '',
    description: item.description || '',
    points: Number(item.points || 0),
    source: item.source || 'bonus',
    cashbackAmount: Number(item.cashback_amount || 0),
  };
}

export const rewardsService = {
  async getRewards() {
    try {
      const { data } = await apiClient.get('/rewards');
      return {
        tier: data.tier || 'Bronze',
        totalPoints: Number(data.total_points || 0),
        nextTierPoints: Number(data.next_tier_points || 0),
        cashbackEarned: Number(data.cashback_earned || 0),
        streakDays: Number(data.streak_days || 0),
        conversionRate: data.conversion_rate || { points: 100, wallet_amount: 1 },
        nextUnlock: Number(data.next_unlock || 0),
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getOffers() {
    try {
      const { data } = await apiClient.get('/rewards/offers');
      return Array.isArray(data.offers) ? data.offers.map(normalizeOffer) : [];
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async activateOffer(offerId) {
    try {
      const { data } = await apiClient.post(`/rewards/offers/${offerId}/activate`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getHistory(params) {
    try {
      const { data } = await apiClient.get('/rewards/history', { params });
      return {
        history: Array.isArray(data.history) ? data.history.map(normalizeHistory) : [],
        pagination: data.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
        trend: data.trend || { this_month_points: 0, last_month_points: 0 },
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async redeemPoints(pointsToRedeem) {
    try {
      const { data } = await apiClient.post('/rewards/redeem', { points_to_redeem: pointsToRedeem });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
