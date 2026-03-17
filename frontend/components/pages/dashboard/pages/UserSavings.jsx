'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, PiggyBank, Plus, Target, Trash2 } from 'lucide-react';
import { useAppData } from '../../../../src/context/AppDataContext';
import { formatCurrency, formatShortDate, getDaysLeft, isValidAmount } from '../../../../src/utils/dashboard';

const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '💍', '🎓', '🛍️', '🏖️'];

const initialGoalForm = { name: '', target_amount: '', deadline: '', icon: GOAL_ICONS[0] };

function GoalModal({ title, submitLabel, form, setForm, onClose, onSubmit, submitting, error, allowIcon = true }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(2, 6, 23, 0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 520 }}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="heading-lg">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        {error && <div className="badge badge-danger mb-4" style={{ display: 'inline-flex' }}>{error}</div>}
        <div className="form-group mb-4">
          <label className="form-label">Goal Name</label>
          <input className="form-input" value={form.name} maxLength={50} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Dream Vacation" />
        </div>
        <div className="grid-dashboard cols-2 mb-4" style={{ gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Target Amount</label>
            <input className="form-input" value={form.target_amount} onChange={(event) => setForm((current) => ({ ...current, target_amount: event.target.value }))} placeholder="2500" />
          </div>
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <input className="form-input" type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
          </div>
        </div>
        {allowIcon && (
          <div className="form-group mb-5">
            <label className="form-label">Goal Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {GOAL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setForm((current) => ({ ...current, icon }))}
                  style={{
                    minWidth: 48,
                    background: form.icon === icon ? 'var(--primary-dim)' : 'transparent',
                    border: form.icon === icon ? '1px solid var(--border-active)' : '1px solid var(--border-glass)',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={onSubmit} disabled={submitting}>{submitting ? 'Saving...' : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ContributeModal({ goal, wallet, amount, setAmount, onClose, onSubmit, submitting, error }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(2, 6, 23, 0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 460 }}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="heading-lg">Contribute to {goal.name}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Available wallet balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800 }}>{formatCurrency(wallet?.availableBalance || 0, wallet?.currency)}</div>
        </div>
        {error && <div className="badge badge-danger mb-4" style={{ display: 'inline-flex' }}>{error}</div>}
        <div className="form-group mb-5">
          <label className="form-label">Contribution Amount</label>
          <input className="form-input" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="250" />
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={onSubmit} disabled={submitting}>{submitting ? 'Processing...' : 'Add Funds'}</button>
        </div>
      </div>
    </div>
  );
}

export default function UserSavings() {
  const {
    wallet,
    savingsGoals,
    savingsSummary,
    loading,
    pushToast,
    createSavingsGoal,
    updateSavingsGoal,
    contributeToSavingsGoal,
    deleteSavingsGoal,
  } = useAppData();
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [goalForm, setGoalForm] = useState(initialGoalForm);
  const [editForm, setEditForm] = useState(initialGoalForm);
  const [contributionAmount, setContributionAmount] = useState('');
  const [modal, setModal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedGoal = useMemo(
    () => savingsGoals.find((goal) => goal.id === selectedGoalId) || null,
    [savingsGoals, selectedGoalId]
  );

  const openCreate = () => {
    setGoalForm(initialGoalForm);
    setError('');
    setModal('create');
  };

  const openEdit = () => {
    if (!selectedGoal) {
      return;
    }
    setEditForm({
      name: selectedGoal.name,
      target_amount: String(selectedGoal.targetAmount),
      deadline: selectedGoal.deadline,
      icon: selectedGoal.icon,
    });
    setError('');
    setModal('edit');
  };

  const openContribute = () => {
    setContributionAmount('');
    setError('');
    setModal('contribute');
  };

  const closeModal = () => {
    setModal('');
    setError('');
    setSubmitting(false);
  };

  const validateGoalForm = (form) => {
    if (String(form.name || '').trim().length < 3) {
      return 'Goal name must be at least 3 characters.';
    }
    if (!isValidAmount(form.target_amount)) {
      return 'Target amount must be greater than 0.';
    }
    if (!form.deadline) {
      return 'Deadline is required.';
    }
    if (new Date(form.deadline) <= new Date()) {
      return 'Deadline must be in the future.';
    }
    return '';
  };

  const handleCreate = async () => {
    const validationError = validateGoalForm(goalForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createSavingsGoal({
        ...goalForm,
        target_amount: Number(goalForm.target_amount),
      });
      pushToast({ tone: 'success', message: 'Savings goal created.' });
      closeModal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    const validationError = validateGoalForm(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await updateSavingsGoal(selectedGoal.id, {
        name: editForm.name,
        target_amount: Number(editForm.target_amount),
        deadline: editForm.deadline,
      });
      pushToast({ tone: 'success', message: 'Savings goal updated.' });
      closeModal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal) {
      return;
    }
    if (!isValidAmount(contributionAmount)) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (Number(contributionAmount) > Number(wallet?.availableBalance || 0)) {
      setError('Insufficient wallet balance.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await contributeToSavingsGoal(selectedGoal.id, { amount: Number(contributionAmount) });
      pushToast({ tone: 'success', message: result.message || 'Contribution added.' });
      closeModal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) {
      return;
    }
    const confirmed = window.confirm(`Are you sure? ${formatCurrency(selectedGoal.currentAmount, wallet?.currency)} will return to your wallet.`);
    if (!confirmed) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await deleteSavingsGoal(selectedGoal.id);
      pushToast({ tone: 'success', message: `${formatCurrency(result.returned_amount || 0, wallet?.currency)} returned to your wallet.` });
      setSelectedGoalId(null);
    } catch (requestError) {
      pushToast({ tone: 'error', message: requestError.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">Create real goals, contribute from your wallet, and track progress live.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={14} /> Create Goal
        </button>
      </div>

      <div className="grid-dashboard cols-3 mb-5">
        <div className="card stat-card">
          <div className="stat-label">Total Saved</div>
          <div className="stat-value grad-text-primary">{formatCurrency(savingsSummary.total_saved || 0, wallet?.currency)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Target</div>
          <div className="stat-value">{formatCurrency(savingsSummary.total_target || 0, wallet?.currency)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Active Goals</div>
          <div className="stat-value">{savingsSummary.active_goals || 0}</div>
        </div>
      </div>

      {loading.savings ? (
        <div className="card" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading savings goals...
        </div>
      ) : savingsGoals.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(42,255,196,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PiggyBank size={28} color="var(--primary)" />
          </div>
          <h2 className="heading-md mb-2">Start saving for your dreams</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 20px' }}>
            No goals yet. Create your first goal and move funds from your wallet whenever you are ready.
          </p>
          <button className="btn btn-primary" onClick={openCreate}>Create Your First Goal</button>
        </div>
      ) : (
        <div className="grid-dashboard" style={{ gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }}>
          <div className="grid-dashboard cols-2">
            {savingsGoals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                className="card card-hover"
                onClick={() => setSelectedGoalId(goal.id)}
                style={{
                  textAlign: 'left',
                  border: selectedGoalId === goal.id ? '1px solid var(--border-active)' : '1px solid var(--border-glass)',
                  background: 'linear-gradient(180deg, rgba(42,255,196,0.08), rgba(12,17,27,0.92))',
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div style={{ fontSize: '1.8rem' }}>{goal.icon}</div>
                  <span className={`badge ${goal.progress >= 100 ? 'badge-success' : goal.progress >= 50 ? 'badge-primary' : 'badge-muted'}`}>
                    {Math.round(goal.progress)}%
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>{goal.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>
                  {formatCurrency(goal.currentAmount, wallet?.currency)} of {formatCurrency(goal.targetAmount, wallet?.currency)}
                </div>
                <div className="progress-bar-wrap mb-3">
                  <div className="progress-bar-fill" style={{ width: `${Math.min(goal.progress, 100)}%`, background: goal.progress >= 100 ? 'var(--success)' : goal.progress >= 50 ? 'var(--grad-primary)' : 'var(--text-dim)' }} />
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span><Calendar size={12} style={{ display: 'inline', marginRight: 6 }} />{formatShortDate(goal.deadline)}</span>
                  <span>{getDaysLeft(goal.deadline)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="card">
            {selectedGoal ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{selectedGoal.icon}</div>
                    <h2 className="heading-lg" style={{ marginBottom: 6 }}>{selectedGoal.name}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{getDaysLeft(selectedGoal.deadline)}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={openEdit}>Edit Goal</button>
                </div>

                <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 18 }}>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ color: 'var(--text-muted)' }}>Current Progress</span>
                    <span style={{ fontWeight: 700 }}>{Math.round(selectedGoal.progress)}%</span>
                  </div>
                  <div className="progress-bar-wrap mb-3" style={{ height: 10 }}>
                    <div className="progress-bar-fill" style={{ width: `${Math.min(selectedGoal.progress, 100)}%`, background: 'var(--grad-primary)' }} />
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <span>{formatCurrency(selectedGoal.currentAmount, wallet?.currency)}</span>
                    <span>{formatCurrency(selectedGoal.targetAmount, wallet?.currency)}</span>
                  </div>
                </div>

                <div className="grid-dashboard cols-2 mb-4">
                  <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>Deadline</div>
                    <div style={{ fontWeight: 700 }}>{formatShortDate(selectedGoal.deadline)}</div>
                  </div>
                  <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>Remaining</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(Math.max(selectedGoal.targetAmount - selectedGoal.currentAmount, 0), wallet?.currency)}</div>
                  </div>
                </div>

                <div className="flex gap-3 mb-5">
                  <button className="btn btn-primary flex-1" onClick={openContribute}>Contribute</button>
                  <button className="btn btn-outline" onClick={openEdit}>Edit</button>
                  <button className="btn btn-ghost" onClick={handleDelete} disabled={submitting}>
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} color="var(--primary)" />
                  <h3 className="heading-md">Contribution History</h3>
                </div>
                {selectedGoal.contributions.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No contributions yet.</div>
                ) : (
                  selectedGoal.contributions.map((item) => (
                    <div key={item.id} className="tx-row">
                      <div className="tx-icon-wrap tx-icon-debit"><Target size={14} /></div>
                      <div className="tx-meta">
                        <div className="tx-name">Goal contribution</div>
                        <div className="tx-date">{formatShortDate(item.date)}</div>
                      </div>
                      <div className="tx-amount-col">
                        <div className="tx-amount amount-debit">-{formatCurrency(item.amount, wallet?.currency)}</div>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a goal to view details and contribution history.
              </div>
            )}
          </div>
        </div>
      )}

      {modal === 'create' && (
        <GoalModal
          title="Create Savings Goal"
          submitLabel="Create Goal"
          form={goalForm}
          setForm={setGoalForm}
          onClose={closeModal}
          onSubmit={handleCreate}
          submitting={submitting}
          error={error}
        />
      )}

      {modal === 'edit' && selectedGoal && (
        <GoalModal
          title="Edit Savings Goal"
          submitLabel="Save Changes"
          form={editForm}
          setForm={setEditForm}
          onClose={closeModal}
          onSubmit={handleEdit}
          submitting={submitting}
          error={error}
          allowIcon={false}
        />
      )}

      {modal === 'contribute' && selectedGoal && (
        <ContributeModal
          goal={selectedGoal}
          wallet={wallet}
          amount={contributionAmount}
          setAmount={setContributionAmount}
          onClose={closeModal}
          onSubmit={handleContribute}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  );
}
