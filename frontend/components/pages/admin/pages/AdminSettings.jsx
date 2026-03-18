'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminSettingsService } from '../../../../src/services/adminSettingsService';
import { formatDateTime } from '../../../../src/utils/dashboard';

const tabs = ['Fees', 'Limits', 'Features', 'Maintenance', 'Integrations'];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('Fees');
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsData, integrationsData] = await Promise.all([
        adminSettingsService.getSettings(),
        adminSettingsService.getIntegrations(),
      ]);
      setSettings(settingsData);
      setDraft(JSON.parse(JSON.stringify(settingsData)));
      setIntegrations(integrationsData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const unsaved = useMemo(() => JSON.stringify(settings) !== JSON.stringify(draft), [settings, draft]);

  const updateSection = (section, key, value) => {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    if (Number(draft.transaction_fees.transaction_fee_percentage) < 0 || Number(draft.transaction_fees.transaction_fee_percentage) > 100) {
      setError('Transaction fee must be between 0 and 100%.');
      return;
    }
    if (draft.maintenance_mode.enabled && !String(draft.maintenance_mode.message || '').trim()) {
      setError('Maintenance message is required.');
      return;
    }
    setSaving(true);
    try {
      const updated = await adminSettingsService.updateSettings(draft);
      setSettings(updated);
      setDraft(JSON.parse(JSON.stringify(updated)));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading platform settings...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Settings</h1>
          <p className="page-subtitle">Configure live platform fees, limits, feature flags, maintenance controls, and integrations.</p>
        </div>
        <button className="btn btn-blue btn-sm" onClick={handleSave} disabled={saving || !unsaved}>{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}
      {unsaved && <div className="card mb-4" style={{ color: 'var(--warning)' }}>You have unsaved changes.</div>}

      <div className="tabs mb-5">
        {tabs.map((tab) => (
          <div key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </div>
        ))}
      </div>

      {activeTab === 'Fees' && (
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="grid-dashboard cols-2">
            {[
              ['transaction_fee_percentage', 'Transaction Fee %'],
              ['withdrawal_fee', 'Withdrawal Fee'],
              ['card_issuance_fee', 'Card Issuance Fee'],
              ['international_transfer_fee', 'International Transfer Fee'],
              ['minimum_fee', 'Minimum Fee'],
            ].map(([key, label]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" value={draft.transaction_fees[key]} onChange={(event) => updateSection('transaction_fees', key, Number(event.target.value))} />
              </div>
            ))}
          </div>
          <div className="card mt-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>
            Preview: $1,000 transaction = ${(1000 * (Number(draft.transaction_fees.transaction_fee_percentage || 0) / 100)).toFixed(2)} fee
          </div>
        </div>
      )}

      {activeTab === 'Limits' && (
        <div className="card" style={{ maxWidth: 860 }}>
          <div className="grid-dashboard cols-2">
            {[
              ['verified_daily', 'Verified Daily Withdrawal'],
              ['verified_monthly', 'Verified Monthly Withdrawal'],
              ['unverified_daily', 'Unverified Daily Withdrawal'],
              ['unverified_monthly', 'Unverified Monthly Withdrawal'],
              ['single_transaction_max', 'Single Transaction Max'],
              ['card_daily_limit', 'Card Daily Limit'],
              ['card_monthly_limit', 'Card Monthly Limit'],
              ['minimum_deposit_amount', 'Minimum Deposit'],
              ['maximum_deposit_amount', 'Maximum Deposit'],
            ].map(([key, label]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" value={draft.withdrawal_limits[key]} onChange={(event) => updateSection('withdrawal_limits', key, Number(event.target.value))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Features' && (
        <div className="card" style={{ maxWidth: 760 }}>
          {[
            ['virtual_cards_enabled', 'Virtual Cards Enabled'],
            ['savings_goals_enabled', 'Savings Goals Enabled'],
            ['rewards_program_active', 'Rewards Program Active'],
            ['referral_system_active', 'Referral System Active'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between" style={{ padding: '14px 0', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 600 }}>{label}</div>
              <label className="toggle">
                <input type="checkbox" checked={Boolean(draft.feature_flags[key])} onChange={(event) => updateSection('feature_flags', key, event.target.checked)} />
                <div className="toggle-track"><div className="toggle-thumb" /></div>
              </label>
            </div>
          ))}
          <div className="grid-dashboard cols-2 mt-4">
            <div className="form-group">
              <label className="form-label">Cashback Percentage</label>
              <input className="form-input" value={draft.feature_flags.cashback_percentage} onChange={(event) => updateSection('feature_flags', 'cashback_percentage', Number(event.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Points Conversion Rate</label>
              <input className="form-input" value={draft.feature_flags.points_conversion_rate} onChange={(event) => updateSection('feature_flags', 'points_conversion_rate', Number(event.target.value))} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Maintenance' && (
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ fontWeight: 700 }}>Maintenance Mode</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Enabling this will lock the platform for end users.</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={Boolean(draft.maintenance_mode.enabled)} onChange={(event) => updateSection('maintenance_mode', 'enabled', event.target.checked)} />
              <div className="toggle-track"><div className="toggle-thumb" /></div>
            </label>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Maintenance Message</label>
            <textarea className="form-input" rows={4} value={draft.maintenance_mode.message || ''} onChange={(event) => updateSection('maintenance_mode', 'message', event.target.value)} />
          </div>
          <div className="grid-dashboard cols-2">
            <div className="form-group">
              <label className="form-label">Scheduled For</label>
              <input className="form-input" type="datetime-local" value={draft.maintenance_mode.scheduled_for || ''} onChange={(event) => updateSection('maintenance_mode', 'scheduled_for', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Whitelisted IPs</label>
              <input className="form-input" value={(draft.maintenance_mode.whitelist_ips || []).join(', ')} onChange={(event) => updateSection('maintenance_mode', 'whitelist_ips', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} />
            </div>
          </div>
          <div className="card mt-4" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', padding: 14 }}>
            Enabling maintenance mode is a critical action and should only be saved after double-checking active operations.
          </div>
        </div>
      )}

      {activeTab === 'Integrations' && (
        <div className="card">
          <div className="heading-md mb-4">Connected Services</div>
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-center gap-3" style={{ padding: '16px 0', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {integration.service_name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{integration.service_name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{integration.category}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Last sync: {formatDateTime(integration.last_sync_at)} · Key: {integration.api_key_masked}</div>
                {integration.error && <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: 4 }}>{integration.error}</div>}
              </div>
              <span className={`badge ${integration.status === 'connected' ? 'badge-success' : integration.status === 'error' ? 'badge-warning' : 'badge-danger'}`}>{integration.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-5" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
        Last modified by <strong>{draft.last_modified_by}</strong> on {formatDateTime(draft.last_modified_at)}.
      </div>
    </div>
  );
}
