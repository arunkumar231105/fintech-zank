'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Edit3, Plus } from 'lucide-react';
import { budgetService } from '../../../../src/services/budgetService';
import { useAppData } from '../../../../src/context/AppDataContext';
import { formatCurrency } from '../../../../src/utils/dashboard';

const DEFAULT_CATEGORIES = ['groceries', 'fuel', 'entertainment', 'dining', 'shopping', 'bills', 'travel'];

function BudgetEditorModal({ draft, setDraft, onClose, onSave, saving, error }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(2, 6, 23, 0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 560 }}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="heading-lg">Edit Budgets</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        {error && <div className="badge badge-danger mb-4" style={{ display: 'inline-flex' }}>{error}</div>}
        <div style={{ display: 'grid', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
          {draft.map((item, index) => (
            <div key={`${item.category}-${index}`} className="grid-dashboard cols-2" style={{ gap: 12 }}>
              <input
                className="form-input"
                value={item.category}
                onChange={(event) => setDraft((current) => current.map((entry, entryIndex) => (
                  entryIndex === index ? { ...entry, category: event.target.value } : entry
                )))}
                placeholder="Category"
              />
              <input
                className="form-input"
                value={item.limit}
                onChange={(event) => setDraft((current) => current.map((entry, entryIndex) => (
                  entryIndex === index ? { ...entry, limit: event.target.value } : entry
                )))}
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <button className="btn btn-outline btn-sm mt-4" onClick={() => setDraft((current) => [...current, { category: '', limit: '0' }])}>
          <Plus size={14} /> Add Category
        </button>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Budgets'}</button>
        </div>
      </div>
    </div>
  );
}

export default function UserBudgets() {
  const { pushToast } = useAppData();
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgetState, setBudgetState] = useState({ budgets: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    budgetService.getBudgets(month, year)
      .then((data) => {
        if (!active) {
          return;
        }
        setBudgetState(data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [month, year]);

  const openEditor = () => {
    const source = budgetState.budgets.length > 0
      ? budgetState.budgets
      : DEFAULT_CATEGORIES.map((category) => ({ category, limit: 0 }));
    setDraft(source.map((item) => ({ category: item.category, limit: String(item.limit ?? 0) })));
    setShowEditor(true);
  };

  const handleSave = async () => {
    const sanitized = draft
      .map((item) => ({ category: item.category.trim(), limit: Number(item.limit || 0) }))
      .filter((item) => item.category);

    if (sanitized.some((item) => Number.isNaN(item.limit) || item.limit < 0)) {
      setError('Budget limits must be 0 or greater.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await budgetService.updateBudgets({ month, year, categories: sanitized });
      setBudgetState(updated);
      setShowEditor(false);
      pushToast({ tone: 'success', message: 'Budgets updated.' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const budgets = useMemo(() => (
    [...(budgetState.budgets || [])].sort((left, right) => right.spent - left.spent)
  ), [budgetState.budgets]);

  const summary = budgetState.summary || { total_budget: 0, total_spent: 0, remaining: 0, adherence: 100 };

  const insights = budgets
    .filter((item) => item.limit > 0)
    .slice(0, 4)
    .map((item) => {
      if (item.spent > item.limit) {
        return { type: 'warn', text: `${item.category} is over budget by ${formatCurrency(item.spent - item.limit)}.` };
      }
      if (item.progress >= 80) {
        return { type: 'warn', text: `${item.category} is at ${Math.round(item.progress)}% of its limit.` };
      }
      return { type: 'good', text: `${item.category} is on track at ${Math.round(item.progress)}% of budget.` };
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">Set category limits and compare them with your live monthly spending.</p>
        </div>
        <div className="flex gap-3">
          <select className="form-input" value={month} onChange={(event) => setMonth(Number(event.target.value))} style={{ width: 120 }}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{new Date(2000, value - 1, 1).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select className="form-input" value={year} onChange={(event) => setYear(Number(event.target.value))} style={{ width: 120 }}>
            {Array.from({ length: 5 }, (_, index) => now.getFullYear() - 2 + index).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={openEditor}><Edit3 size={14} /> Edit Budgets</button>
        </div>
      </div>

      {error && !showEditor && (
        <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>
      )}

      <div className="grid-dashboard cols-3 mb-5">
        <div className="card card-gradient-primary" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total Budget</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }} className="grad-text-primary">{formatCurrency(summary.total_budget)}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total Spent</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: summary.total_spent > summary.total_budget && summary.total_budget > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
            {formatCurrency(summary.total_spent)}
          </div>
          {summary.total_spent > summary.total_budget && summary.total_budget > 0 && <div className="badge badge-danger mt-2"><AlertTriangle size={11} /> Over budget</div>}
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Budget Adherence</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: summary.adherence < 70 ? 'var(--danger)' : summary.adherence < 90 ? 'var(--warning)' : 'var(--success)' }}>
            {Math.round(summary.adherence)}%
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading monthly budgets...
        </div>
      ) : budgets.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <h2 className="heading-md mb-2">Set budgets to track your spending</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No budgets found for this month yet.</p>
          <button className="btn btn-primary" onClick={openEditor}>Set Budgets</button>
        </div>
      ) : (
        <>
          <div className="card mb-5">
            <h2 className="heading-md mb-4">Budget Overview</h2>
            <div style={{ height: 8, background: 'var(--bg-surface)', borderRadius: 'var(--r-pill)', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ height: '100%', width: `${Math.min(summary.total_budget > 0 ? (summary.total_spent / summary.total_budget) * 100 : 0, 100)}%`, background: summary.total_spent > summary.total_budget && summary.total_budget > 0 ? 'var(--grad-warm)' : 'var(--grad-primary)' }} />
            </div>
            {budgets.map((item) => {
              const tone = item.status === 'over' ? 'var(--danger)' : item.status === 'warning' ? 'var(--warning)' : 'var(--primary)';
              return (
                <div key={item.category} className="budget-row">
                  <div className="budget-icon">{item.category.slice(0, 1).toUpperCase()}</div>
                  <div className="budget-info">
                    <div className="budget-name">{item.category}</div>
                    <div className="budget-numbers">
                      <span>{item.limit === 0 ? 'Unlimited budget' : `${formatCurrency(Math.max(item.limit - item.spent, 0))} remaining`}</span>
                      <span>{formatCurrency(item.spent)} / {item.limit === 0 ? 'No limit' : formatCurrency(item.limit)}</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(item.progress, 100)}%`, background: tone }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontWeight: 700, color: tone }}>{Math.round(item.progress)}%</div>
                    <span className={`badge ${item.status === 'over' ? 'badge-danger' : item.status === 'warning' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.625rem', marginTop: 4 }}>
                      {item.status === 'over' ? 'over' : item.status === 'warning' ? 'near limit' : 'safe'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid-dashboard cols-2">
            <div className="card">
              <h2 className="heading-md mb-4">Budget Insights</h2>
              {insights.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No budget insights yet. Add budgets or transactions to see trends.</div>
              ) : insights.map((item, index) => (
                <div key={`${item.text}-${index}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 0', borderBottom: index < insights.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.type === 'good' ? 'var(--success)' : 'var(--warning)', marginTop: 6, flexShrink: 0 }} />
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.text}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2 className="heading-md mb-4">Top Categories by Spend</h2>
              {budgets.map((item, index) => (
                <div key={item.category} className="flex items-center gap-3" style={{ padding: '12px 0', borderBottom: index < budgets.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
                  <div style={{ width: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>#{index + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.category}</div>
                  </div>
                  <div style={{ fontWeight: 700, textAlign: 'right' }}>
                    <div>{formatCurrency(item.spent)}</div>
                    <div style={{ fontSize: '0.75rem', color: item.status === 'over' ? 'var(--danger)' : 'var(--text-muted)' }}>{Math.round(item.progress)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showEditor && (
        <BudgetEditorModal
          draft={draft}
          setDraft={setDraft}
          onClose={() => {
            setShowEditor(false);
            setError('');
          }}
          onSave={handleSave}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}
