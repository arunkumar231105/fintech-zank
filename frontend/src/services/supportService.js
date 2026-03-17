import { apiClient, normalizeApiError } from './apiClient';

export const supportService = {
  async getTickets() {
    try {
      const { data } = await apiClient.get('/support/tickets');
      return Array.isArray(data.tickets) ? data.tickets : [];
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createTicket(payload, onUploadProgress) {
    try {
      const formData = new FormData();
      formData.append('subject', payload.subject);
      formData.append('description', payload.description);
      formData.append('priority', payload.priority);
      if (payload.attachment) {
        formData.append('attachment', payload.attachment);
      }
      const { data } = await apiClient.post('/support/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      });
      return data.ticket;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async sendMessage(payload, onUploadProgress) {
    try {
      const formData = new FormData();
      formData.append('message', payload.message);
      formData.append('ticket_id', payload.ticketId);
      if (payload.attachment) {
        formData.append('attachment', payload.attachment);
      }
      const { data } = await apiClient.post('/support/chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      });
      return data.messages || [];
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
