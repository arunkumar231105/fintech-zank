import { apiClient, normalizeApiError } from './apiClient';

function normalizeChartPoint(point = {}) {
  return {
    label: point.label || '',
    income: Number(point.income || 0),
    expenses: Number(point.expenses || 0),
  };
}

function normalizeCategory(item = {}) {
  return {
    name: item.name || '',
    value: Number(item.value || 0),
    percentage: Number(item.percentage || 0),
    color: item.color || '#2affc4',
  };
}

export const analyticsService = {
  async getSpending(period = 'month') {
    try {
      const { data } = await apiClient.get('/analytics/spending', { params: { period } });
      return {
        period: data.period || period,
        income: Number(data.income || 0),
        expenses: Number(data.expenses || 0),
        net: Number(data.net || 0),
        chart: Array.isArray(data.chart) ? data.chart.map(normalizeChartPoint) : [],
        categories: Array.isArray(data.categories) ? data.categories.map(normalizeCategory) : [],
        topCategories: Array.isArray(data.top_categories) ? data.top_categories.map(normalizeCategory) : [],
        budgetVsActual: Array.isArray(data.budget_vs_actual) ? data.budget_vs_actual.map((item) => ({
          category: item.category || '',
          budget: Number(item.budget || 0),
          actual: Number(item.actual || 0),
        })) : [],
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getHealthScore() {
    try {
      const { data } = await apiClient.get('/analytics/health-score');
      return {
        score: Number(data.score || 0),
        color: data.color || 'yellow',
        label: data.label || 'Stable',
        breakdown: data.breakdown || {},
        tips: Array.isArray(data.tips) ? data.tips : [],
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getOverview() {
    try {
      const { data } = await apiClient.get('/analytics/overview');
      return {
        totalIncome: Number(data.total_income || 0),
        totalExpenses: Number(data.total_expenses || 0),
        activeSavingsGoals: Number(data.active_savings_goals || 0),
        budgetAdherence: Number(data.budget_adherence || 0),
        miniChart: Array.isArray(data.mini_chart) ? data.mini_chart.map(normalizeChartPoint) : [],
        topCategory: data.top_category || null,
        healthScore: Number(data.health_score || 0),
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
