import { apiClient, normalizeApiError } from './apiClient';

function normalizeBudget(item = {}) {
  return {
    category: item.category || '',
    limit: Number(item.limit || 0),
    spent: Number(item.spent || 0),
    progress: Number(item.progress || 0),
    status: item.status || 'on_track',
  };
}

export const budgetService = {
  async getBudgets(month, year) {
    try {
      const { data } = await apiClient.get('/budgets', { params: { month, year } });
      return {
        month: Number(data.month || month),
        year: Number(data.year || year),
        budgets: Array.isArray(data.budgets) ? data.budgets.map(normalizeBudget) : [],
        summary: data.summary || { total_budget: 0, total_spent: 0, remaining: 0, adherence: 100 },
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateBudgets(payload) {
    try {
      const { data } = await apiClient.put('/budgets', payload);
      return {
        month: Number(data.month || payload.month),
        year: Number(data.year || payload.year),
        budgets: Array.isArray(data.budgets) ? data.budgets.map(normalizeBudget) : [],
        summary: data.summary || { total_budget: 0, total_spent: 0, remaining: 0, adherence: 100 },
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
