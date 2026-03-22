import { ledgerService } from './ledgerService';
import { normalizeApiError } from './apiClient';

export const adminAuditService = {
  async getLogs(params) {
    try {
      return await ledgerService.getAuditLogs(params);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async exportLogs(params) {
    try {
      return await ledgerService.exportAuditLogs(params);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
