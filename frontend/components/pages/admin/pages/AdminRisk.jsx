'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminRiskService } from '../../../../src/services/adminRiskService';
import { adminComplianceService } from '../../../../src/services/adminComplianceService';
import { formatDateTime } from '../../../../src/utils/dashboard';

const flagFilters = {
  status: ['all', 'open', 'under_review', 'cleared', 'reported'],
  severity: ['all', 'low', 'medium', 'high', 'critical'],
  flag_type: ['all', 'structuring', 'rapid_movement', 'unusual_pattern', 'high_risk_country', 'large_cash'],
};

export default function AdminRisk() {
  const [flagFiltersState, setFlagFiltersState] = useState({ status: 'all', severity: 'all', flag_type: 'all' });
  const [fraudFilters, setFraudFilters] = useState({ risk_level: 'all', from_date: '', to_date: '' });
  const [flags, setFlags] = useState([]);
  const [fraudScores, setFraudScores] = useState([]);
  const [limits, setLimits] = useState([]);
  const [kycQueueCount, setKycQueueCount] = useState(0);
  const [velocityViolations, setVelocityViolations] = useState(0);
  const [editingLimitId, setEditingLimitId] = useState(null);
  const [limitDraft, setLimitDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingLimit, setSavingLimit] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [flagsResponse, fraudResponse, limitResponse, velocityResponse, queueResponse] = await Promise.all([
        adminRiskService.getFlags({ ...flagFiltersState, limit: 50, offset: 0 }),
        adminRiskService.getFraudScores({ ...fraudFilters, limit: 50, offset: 0 }),
        adminRiskService.getTransactionLimits(),
        adminRiskService.getVelocityViolations(),
        adminComplianceService.getKycQueue({ status: 'submitted', limit: 100, offset: 0 }),
      ]);
      setFlags(flagsResponse.items || []);
      setFraudScores(fraudResponse.items || []);
      setLimits(limitResponse.items || []);
      setVelocityViolations(velocityResponse.count || 0);
      setKycQueueCount(queueResponse.pagination?.total || (queueResponse.items || []).length || 0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [flagFiltersState.status, flagFiltersState.severity, flagFiltersState.flag_type, fraudFilters.risk_level, fraudFilters.from_date, fraudFilters.to_date]);

  const summary = useMemo(() => ({
    openFlags: flags.filter((item) => item.status === 'open').length,
    criticalFraudScores: fraudScores.filter((item) => item.risk_level === 'critical').length,
    pendingKyc: kycQueueCount,
    velocityViolations,
  }), [flags, fraudScores, kycQueueCount, velocityViolations]);

  const updateFlagStatus = async (flagId, action) => {
    setError('');
    try {
      if (action === 'review') {
        await adminRiskService.reviewFlag(flagId);
      } else {
        await adminRiskService.clearFlag(flagId);
      }
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const startEditingLimit = (limit) => {
    setEditingLimitId(limit.id);
    setLimitDraft({ ...limit });
  };

  const saveLimit = async () => {
    setSavingLimit(true);
    setError('');
    try {
      await adminRiskService.updateTransactionLimits({
        kyc_level: limitDraft.kyc_level,
        transaction_type: limitDraft.transaction_type,
        daily_limit: Number(limitDraft.daily_limit || 0),
        monthly_limit: Number(limitDraft.monthly_limit || 0),
        per_transaction_limit: Number(limitDraft.per_transaction_limit || 0),
      });
      setEditingLimitId(null);
      setLimitDraft(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingLimit(false);
    }
  };

  const cancelEditingLimit = () => {
    setEditingLimitId(null);
    setLimitDraft(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Risk Intelligence</h1>
          <p className="page-subtitle">Review AML triggers, fraud scoring, KYC pressure, and transaction limit controls.</p>
        </div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card stat-card"><div className="stat-label">Open AML Flags</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.openFlags}</div></div>
        <div className="card stat-card"><div className="stat-label">Critical Fraud Scores</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.criticalFraudScores}</div></div>
        <div className="card stat-card"><div className="stat-label">Pending KYC Reviews</div><div className="stat-value" style={{ color: 'var(--blue)' }}>{summary.pendingKyc}</div></div>
        <div className="card stat-card"><div className="stat-label">Velocity Violations Today</div><div className="stat-value">{summary.velocityViolations}</div></div>
      </div>

      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">AML Flags</h2>
          <div className="flex gap-3 flex-wrap items-center">
            <select className="form-input" style={{ width: 'auto' }} value={flagFiltersState.status} onChange={(event) => setFlagFiltersState((current) => ({ ...current, status: event.target.value }))}>
              {flagFilters.status.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select className="form-input" style={{ width: 'auto' }} value={flagFiltersState.severity} onChange={(event) => setFlagFiltersState((current) => ({ ...current, severity: event.target.value }))}>
              {flagFilters.severity.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select className="form-input" style={{ width: 'auto' }} value={flagFiltersState.flag_type} onChange={(event) => setFlagFiltersState((current) => ({ ...current, flag_type: event.target.value }))}>
              {flagFilters.flag_type.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Flag Type</th><th>Severity</th><th>Status</th><th>Created At</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>Loading AML flags...</td></tr>
              ) : flags.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>No AML flags found.</td></tr>
              ) : flags.map((flag) => (
                <tr key={flag.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{flag.user_name || flag.user_id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{flag.user_email || flag.user_id}</div>
                  </td>
                  <td>{flag.flag_type}</td>
                  <td><span className={`badge ${flag.severity === 'critical' ? 'badge-danger' : flag.severity === 'high' ? 'badge-warning' : flag.severity === 'medium' ? 'badge-blue' : 'badge-muted'}`}>{flag.severity}</span></td>
                  <td><span className={`badge ${flag.status === 'cleared' ? 'badge-success' : flag.status === 'under_review' ? 'badge-warning' : 'badge-danger'}`}>{flag.status}</span></td>
                  <td>{formatDateTime(flag.created_at)}</td>
                  <td>
                    <div className="flex gap-2 flex-wrap">
                      {flag.status !== 'under_review' && flag.status !== 'cleared' && (
                        <button className="btn btn-outline btn-sm" onClick={() => updateFlagStatus(flag.id, 'review')}>Review</button>
                      )}
                      {flag.status !== 'cleared' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => updateFlagStatus(flag.id, 'clear')}>Clear</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Fraud Scores</h2>
          <div className="flex gap-3 flex-wrap items-center">
            <select className="form-input" style={{ width: 'auto' }} value={fraudFilters.risk_level} onChange={(event) => setFraudFilters((current) => ({ ...current, risk_level: event.target.value }))}>
              {['all', 'low', 'medium', 'high', 'critical'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <input className="form-input" style={{ width: 'auto' }} type="date" value={fraudFilters.from_date} onChange={(event) => setFraudFilters((current) => ({ ...current, from_date: event.target.value }))} />
            <input className="form-input" style={{ width: 'auto' }} type="date" value={fraudFilters.to_date} onChange={(event) => setFraudFilters((current) => ({ ...current, to_date: event.target.value }))} />
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Score</th><th>Risk Level</th><th>Factors</th><th>Created At</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>Loading fraud scores...</td></tr>
              ) : fraudScores.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>No fraud scores found.</td></tr>
              ) : fraudScores.map((score) => (
                <tr key={score.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{score.user_name || score.user_id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{score.user_email || score.user_id}</div>
                  </td>
                  <td>{score.score}</td>
                  <td><span className={`badge ${score.risk_level === 'critical' ? 'badge-danger' : score.risk_level === 'high' ? 'badge-warning' : score.risk_level === 'medium' ? 'badge-blue' : 'badge-success'}`}>{score.risk_level}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{Object.keys(score.factors || {}).join(', ') || 'No factors'}</td>
                  <td>{formatDateTime(score.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Transaction Limits</h2>
          <span className="badge badge-muted">{limits.length} rules</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>KYC Level</th><th>Transaction Type</th><th>Daily Limit</th><th>Monthly Limit</th><th>Per Transaction</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>Loading limits...</td></tr>
              ) : limits.map((limit) => {
                const isEditing = editingLimitId === limit.id;
                const current = isEditing ? limitDraft : limit;
                return (
                  <tr key={limit.id}>
                    <td>{limit.kyc_level}</td>
                    <td>{limit.transaction_type}</td>
                    <td>{isEditing ? <input className="form-input" value={current.daily_limit} onChange={(event) => setLimitDraft((draft) => ({ ...draft, daily_limit: event.target.value }))} /> : Number(limit.daily_limit).toLocaleString()}</td>
                    <td>{isEditing ? <input className="form-input" value={current.monthly_limit} onChange={(event) => setLimitDraft((draft) => ({ ...draft, monthly_limit: event.target.value }))} /> : Number(limit.monthly_limit).toLocaleString()}</td>
                    <td>{isEditing ? <input className="form-input" value={current.per_transaction_limit} onChange={(event) => setLimitDraft((draft) => ({ ...draft, per_transaction_limit: event.target.value }))} /> : Number(limit.per_transaction_limit).toLocaleString()}</td>
                    <td>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm" onClick={saveLimit} disabled={savingLimit}>{savingLimit ? 'Saving...' : 'Save'}</button>
                          <button className="btn btn-outline btn-sm" onClick={cancelEditingLimit}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => startEditingLimit(limit)}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
