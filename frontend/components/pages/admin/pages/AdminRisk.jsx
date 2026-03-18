'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, ShieldAlert, UserX } from 'lucide-react';
import { adminRiskService } from '../../../../src/services/adminRiskService';

export default function AdminRisk() {
  const [flags, setFlags] = useState([]);
  const [rules, setRules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', severity: 'all', flag_type: 'all' });
  const [actionForm, setActionForm] = useState({ action: 'dismiss', notes: '', freeze_user: false });
  const [ruleModal, setRuleModal] = useState(null);
  const [ruleForm, setRuleForm] = useState({ enabled: true, threshold: '', parameters: '{}' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [flagData, ruleData] = await Promise.all([
        adminRiskService.getFlags(filters),
        adminRiskService.getRules(),
      ]);
      setFlags(flagData.items || []);
      setRules(ruleData.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFlagAction = async () => {
    if (!selected || !actionForm.notes.trim()) {
      setError('Notes are required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminRiskService.updateFlag(selected.id, actionForm);
      setSelected(null);
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openRule = (rule) => {
    setRuleModal(rule);
    setRuleForm({ enabled: rule.enabled, threshold: String(rule.threshold), parameters: JSON.stringify(rule.parameters || {}) });
  };

  const handleRuleSave = async () => {
    if (!ruleModal || Number(ruleForm.threshold) <= 0) {
      setError('Valid threshold required.');
      return;
    }
    setSubmitting(true);
    try {
      const parameters = JSON.parse(ruleForm.parameters);
      await adminRiskService.updateRule(ruleModal.id, { enabled: ruleForm.enabled, threshold: Number(ruleForm.threshold), parameters });
      setRuleModal(null);
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const critical = flags.filter((item) => item.severity === 'critical').length;
  const active = flags.filter((item) => item.status === 'active').length;
  const dismissed = flags.filter((item) => item.status === 'dismissed').length;
  const escalated = flags.filter((item) => item.status === 'escalated').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Risk Intelligence</h1>
          <p className="page-subtitle">Risk flags, escalation actions, and AML monitoring rules for compliance operations.</p>
        </div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card stat-card"><div className="stat-label">Active Flags</div><div className="stat-value">{active}</div></div>
        <div className="card stat-card"><div className="stat-label">Critical Flags</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{critical}</div></div>
        <div className="card stat-card"><div className="stat-label">Dismissed</div><div className="stat-value" style={{ color: 'var(--text-muted)' }}>{dismissed}</div></div>
        <div className="card stat-card"><div className="stat-label">Escalated</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{escalated}</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select className="form-input" style={{ width: 'auto' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            {['all', 'active', 'dismissed', 'escalated'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}>
            {['all', 'low', 'medium', 'high', 'critical'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.flag_type} onChange={(event) => setFilters((current) => ({ ...current, flag_type: event.target.value }))}>
            {['all', 'Large Amount', 'Unusual Pattern', 'Suspicious Activity', 'AML Concern'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </div>

      <div className="card mb-5">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Flag</th><th>User</th><th>Type</th><th>Severity</th><th>Amount</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading risk flags...</td></tr>
              ) : flags.map((flag) => (
                <tr key={flag.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{flag.id}</td>
                  <td><div style={{ fontWeight: 600 }}>{flag.user_name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{flag.user_id}</div></td>
                  <td><span className="badge badge-warning">{flag.type}</span></td>
                  <td><span className={`badge ${flag.severity === 'critical' ? 'badge-danger' : flag.severity === 'high' ? 'badge-warning' : flag.severity === 'medium' ? 'badge-blue' : 'badge-muted'}`}>{flag.severity}</span></td>
                  <td>{flag.amount}</td>
                  <td><span className={`badge ${flag.status === 'active' ? 'badge-blue' : flag.status === 'dismissed' ? 'badge-muted' : 'badge-danger'}`}>{flag.status}</span></td>
                  <td>{new Date(flag.created_at).toLocaleString()}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => { setSelected(flag); setActionForm({ action: 'dismiss', notes: '', freeze_user: false }); }}><Eye size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="heading-md mb-4">AML Rules Management</h2>
        <div className="grid-dashboard cols-2">
          {rules.map((rule) => (
            <div key={rule.id} className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 18 }}>
              <div className="flex justify-between items-center mb-2">
                <div style={{ fontWeight: 700 }}>{rule.name}</div>
                <span className={`badge ${rule.enabled ? 'badge-success' : 'badge-muted'}`}>{rule.enabled ? 'enabled' : 'disabled'}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 10 }}>{rule.description}</div>
              <div style={{ fontSize: '0.82rem', marginBottom: 10 }}>Threshold: <strong>{rule.threshold}</strong></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>Last triggered: {rule.last_triggered ? new Date(rule.last_triggered).toLocaleString() : 'Never'}</div>
              <button className="btn btn-outline btn-sm" onClick={() => openRule(rule)}>Edit Rule</button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560 }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-lg">Risk Flag Detail</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div><strong>{selected.type}</strong> · {selected.severity}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>{selected.notes}</div>
              <div style={{ marginTop: 8 }}>Risk score: {selected.risk_score}</div>
            </div>
            <select className="form-input mb-3" value={actionForm.action} onChange={(event) => setActionForm((current) => ({ ...current, action: event.target.value }))}>
              <option value="dismiss">Dismiss</option>
              <option value="escalate">Escalate</option>
            </select>
            <textarea className="form-input mb-3" rows={4} value={actionForm.notes} onChange={(event) => setActionForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Compliance notes" />
            <label className="flex items-center gap-2 mb-4" style={{ fontSize: '0.85rem' }}>
              <input type="checkbox" checked={actionForm.freeze_user} onChange={(event) => setActionForm((current) => ({ ...current, freeze_user: event.target.checked }))} />
              Freeze user account pending review
            </label>
            <button className={`btn btn-full ${actionForm.action === 'dismiss' ? 'btn-outline' : 'btn-danger'}`} onClick={handleFlagAction} disabled={submitting}>
              {submitting ? 'Saving...' : actionForm.action === 'dismiss' ? 'Dismiss Flag' : 'Escalate Flag'}
            </button>

            <div className="card mt-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <h3 className="heading-md mb-3">Activity Log</h3>
              {(selected.activity_log || []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No activity yet.</div>
              ) : selected.activity_log.map((entry, index) => (
                <div key={`${entry.timestamp}-${index}`} className="tx-row">
                  <div className="tx-meta">
                    <div className="tx-name">{entry.action}</div>
                    <div className="tx-date">{entry.actor} · {new Date(entry.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {ruleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560 }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-lg">Edit AML Rule</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setRuleModal(null)}>Close</button>
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Rule Name</label>
              <input className="form-input" value={ruleModal.name} readOnly />
            </div>
            <label className="flex items-center gap-2 mb-3" style={{ fontSize: '0.85rem' }}>
              <input type="checkbox" checked={ruleForm.enabled} onChange={(event) => setRuleForm((current) => ({ ...current, enabled: event.target.checked }))} />
              Enabled
            </label>
            <input className="form-input mb-3" value={ruleForm.threshold} onChange={(event) => setRuleForm((current) => ({ ...current, threshold: event.target.value }))} placeholder="Threshold" />
            <textarea className="form-input mb-4" rows={5} value={ruleForm.parameters} onChange={(event) => setRuleForm((current) => ({ ...current, parameters: event.target.value }))} />
            <button className="btn btn-primary btn-full" onClick={handleRuleSave} disabled={submitting}>{submitting ? 'Saving...' : 'Save Rule'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
