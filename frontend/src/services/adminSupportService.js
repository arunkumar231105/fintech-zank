import { apiClient, normalizeApiError } from './apiClient';

export const adminSupportService = {
  async getTickets(params) {
    try {
      const { data } = await apiClient.get('/admin/support/tickets', { params });
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateTicket(ticketId, payload) {
    try {
      const { data } = await apiClient.put(`/admin/support/tickets/${ticketId}`, payload);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
