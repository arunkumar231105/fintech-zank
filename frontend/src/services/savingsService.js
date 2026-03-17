import { apiClient, normalizeApiError } from './apiClient';

function normalizeContribution(item = {}) {
  return {
    id: item.id || '',
    amount: Number(item.amount || 0),
    date: item.date || '',
  };
}

function normalizeGoal(goal = {}) {
  return {
    id: goal.id || '',
    name: goal.name || '',
    targetAmount: Number(goal.target_amount || goal.targetAmount || 0),
    currentAmount: Number(goal.current_amount || goal.currentAmount || 0),
    deadline: goal.deadline || '',
    icon: goal.icon || '🎯',
    progress: Number(goal.progress || 0),
    contributions: Array.isArray(goal.contributions) ? goal.contributions.map(normalizeContribution) : [],
    createdAt: goal.created_at || '',
  };
}

export const savingsService = {
  async getGoals() {
    try {
      const { data } = await apiClient.get('/savings');
      return {
        goals: Array.isArray(data.goals) ? data.goals.map(normalizeGoal) : [],
        summary: data.summary || { total_saved: 0, total_target: 0, active_goals: 0 },
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createGoal(payload) {
    try {
      const { data } = await apiClient.post('/savings', payload);
      return normalizeGoal(data.goal || {});
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async contribute(goalId, payload) {
    try {
      const { data } = await apiClient.post(`/savings/${goalId}/contribute`, payload);
      return {
        ...data,
        goal: normalizeGoal(data.goal || {}),
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateGoal(goalId, payload) {
    try {
      const { data } = await apiClient.put(`/savings/${goalId}`, payload);
      return normalizeGoal(data.goal || {});
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteGoal(goalId) {
    try {
      const { data } = await apiClient.delete(`/savings/${goalId}`);
      return data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
