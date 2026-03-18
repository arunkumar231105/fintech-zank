import { apiClient, normalizeApiError } from './apiClient';

export const adminOverviewService = {
  async getOverview() {
    try {
      const { data } = await apiClient.get('/admin/overview');
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
