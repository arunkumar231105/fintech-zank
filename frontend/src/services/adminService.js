import { apiClient, normalizeApiError } from './apiClient';

export const adminService = {
  async getOverview() {
    try {
      const { data } = await apiClient.get('/admin/overview');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getUsers(params) {
    try {
      const { data } = await apiClient.get('/admin/users', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getUserDetail(userId) {
    try {
      const { data } = await apiClient.get(`/admin/users/${userId}`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateUserStatus(userId, payload) {
    try {
      const { data } = await apiClient.put(`/admin/users/${userId}/status`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async adjustBalance(userId, payload) {
    try {
      const { data } = await apiClient.post(`/admin/users/${userId}/balance-adjust`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getWalletsOverview() {
    try {
      const { data } = await apiClient.get('/admin/wallets/overview');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getWallets(params) {
    try {
      const { data } = await apiClient.get('/admin/wallets', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getActions(params) {
    try {
      const { data } = await apiClient.get('/admin/actions', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
