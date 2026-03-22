import { apiClient, normalizeApiError } from './apiClient';

export const securityService = {
  async getKyc() {
    try {
      const { data } = await apiClient.get('/risk/kyc/me');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async uploadKyc(payload, onUploadProgress) {
    try {
      const { data } = await apiClient.post('/risk/kyc', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getSettings() {
    try {
      const { data } = await apiClient.get('/security/settings');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateSettings(payload) {
    try {
      const { data } = await apiClient.put('/security/settings', payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getSessions() {
    try {
      const { data } = await apiClient.get('/security/sessions');
      return Array.isArray(data.sessions) ? data.sessions : [];
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async revokeSession(sessionId) {
    try {
      await apiClient.delete(`/security/sessions/${sessionId}`);
      return sessionId;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async revokeAllSessions() {
    try {
      await apiClient.delete('/security/sessions');
      return true;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getLoginHistory() {
    try {
      const { data } = await apiClient.get('/security/login-history');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
