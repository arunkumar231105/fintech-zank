'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Brain, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsService } from '../../../../src/services/analyticsService';
import { formatCurrency } from '../../../../src/utils/dashboard';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

function buildInsights(data, health) {
  const items = [];
  const topCategory = data.topCategories?.[0];

  if (topCategory) {
    items.push({
      type: 'info',
      text: `${topCategory.name} is your top spending category at ${formatCurrency(topCategory.value)} (${Math.round(topCategory.percentage)}%).`,
    });
  }

  const overBudget = (data.budgetVsActual || []).filter((item) => item.budget > 0 && item.actual > item.budget);
  if (overBudget.length > 0) {
    items.push({
      type: 'warning',
      text: `${overBudget[0].category} is over budget by ${formatCurrency(overBudget[0].actual - overBudget[0].budget)}.`,
    });
  }

  if (data.income > 0) {
    const savingsRate = ((data.income - data.expenses) / data.income) * 100;
    items.push({
      type: savingsRate >= 20 ? 'positive' : 'warning',
      text: `Your savings rate is ${Math.round(savingsRate)}% for this period.`,
    });
  }

  if (health?.tips?.[0]) {
    items.push({ type: 'positive', text: health.tips[0] });
  }

  return items.slice(0, 4);
}

export default function UserAnalytics() {
  const [period, setPeriod] = useState('month');
  const [analytics, setAnalytics] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async (nextPeriod = period) => {
    setLoading(true);
    setError('');
    try {
      const [spending, healthScore] = await Promise.all([
        analyticsService.getSpending(nextPeriod),
        analyticsService.getHealthScore(),
      ]);
      setAnalytics(spending);
      setHealth(healthScore);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load analytics, retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const insights = useMemo(() => (
    analytics && health ? buildInsights(analytics, health) : []
  ), [analytics, health]);

  const healthColor = health?.color === 'green' ? 'var(--success)' : health?.color === 'red' ? 'var(--danger)' : 'var(--warning)';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Live spending trends, category breakdowns, and your financial health score.</p>
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button key={option.value} className={`seg-tab ${period === option.value ? 'active' : ''}`} onClick={() => setPeriod(option.value)}>
              {option.label}
            </button>
          ))}
          <button className="btn btn-outline btn-sm" onClick={() => fetchAnalytics(period)}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--danger)' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading || !analytics || !health ? (
        <div className="card" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid-dashboard cols-4 mb-5">
            <div className="card stat-card">
              <div className="stat-label">Total Income</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(analytics.income)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value">{formatCurrency(analytics.expenses)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Net Balance</div>
              <div className="stat-value grad-text-primary">{formatCurrency(analytics.net)}</div>
            </div>
            <div className="card stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Financial Health</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: healthColor }}>{health.score}</div>
              <div style={{ fontSize: '0.8125rem', color: healthColor, fontWeight: 600 }}>{health.label}</div>
            </div>
          </div>

          <div className="grid-dashboard" style={{ gridTemplateColumns: '1.4fr 0.8fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="heading-md">Income vs Expenses</h2>
                <span className="badge badge-muted">{PERIOD_OPTIONS.find((item) => item.value === period)?.label}</span>
              </div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={analytics.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="income" fill="#2affc4" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expenses" fill="#f87171" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="heading-md mb-4">Category Breakdown</h2>
              {analytics.categories.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Not enough spending data yet.</div>
              ) : (
                <>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={analytics.categories} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                          {analytics.categories.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-3">
                    {analytics.categories.slice(0, 4).map((category) => (
                      <div key={category.name}>
                        <div className="flex justify-between mb-1">
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{category.name}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{formatCurrency(category.value)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({Math.round(category.percentage)}%)</span></span>
                        </div>
                        <div className="progress-bar-wrap" style={{ height: 5 }}>
                          <div className="progress-bar-fill" style={{ width: `${category.percentage}%`, background: category.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <h2 className="heading-md mb-4">Budget vs Actual</h2>
              {analytics.budgetVsActual.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Set budgets to unlock category comparisons.</div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={analytics.budgetVsActual}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="category" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="budget" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="actual" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} color="var(--primary)" />
                <h2 className="heading-md">Insights</h2>
              </div>
              <div className="flex flex-col gap-3">
                {insights.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>Not enough data, start making transactions.</div>
                ) : insights.map((item, index) => (
                  <div key={`${item.text}-${index}`} style={{ background: item.type === 'positive' ? 'var(--success-dim)' : item.type === 'warning' ? 'var(--warning-dim)' : 'var(--blue-dim)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--r-md)', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.type === 'positive' ? 'var(--success)' : item.type === 'warning' ? 'var(--warning)' : 'var(--blue)', marginTop: 6 }} />
                    <span style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid-dashboard" style={{ gridTemplateColumns: '0.9fr 1.1fr', gap: 20 }}>
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="heading-md">Health Score Breakdown</h2>
                <span className="badge badge-primary">{health.score}/100</span>
              </div>
              {[
                ['Savings Rate', health.breakdown.savings_rate || 0, 30],
                ['Budget Adherence', health.breakdown.budget_adherence || 0, 25],
                ['Transaction Activity', health.breakdown.transaction_activity || 0, 20],
                ['Wallet Balance', health.breakdown.wallet_balance || 0, 25],
              ].map(([label, value, total]) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
                    <span style={{ fontWeight: 700 }}>{Number(value).toFixed(1)} / {total}</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${Math.min((Number(value) / Number(total)) * 100, 100)}%`, background: healthColor }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2 className="heading-md mb-4">Top Spending Categories</h2>
              {analytics.topCategories.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No spending categories available yet.</div>
              ) : analytics.topCategories.map((category, index) => (
                <div key={category.name} className="flex items-center gap-3" style={{ padding: '12px 0', borderBottom: index < analytics.topCategories.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: category.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{category.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{Math.round(category.percentage)}% of expenses</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(category.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
