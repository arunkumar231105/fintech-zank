'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Fingerprint, Shield, Smartphone } from 'lucide-react';
import { securityService } from '../../../../src/services/securityService';
import { formatDateTime, formatShortDate } from '../../../../src/utils/dashboard';

const DOCUMENT_TYPES = ['passport', 'national_id', 'drivers_license'];

const emptyKycForm = {
  full_name: '',
  date_of_birth: '',
  nationality: '',
  document_type: 'passport',
  document_number: '',
  document_expiry: '',
  level: 'basic',
};

export default function UserSecurity() {
  const [kyc, setKyc] = useState(null);
  const [settings, setSettings] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);
  const [form, setForm] = useState(emptyKycForm);
  const [loading, setLoading] = useState(true);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [kycData, securitySettings, activeSessions, history] = await Promise.all([
        securityService.getKyc(),
        securityService.getSettings(),
        securityService.getSessions(),
        securityService.getLoginHistory(),
      ]);
      setKyc(kycData);
      setForm({
        full_name: kycData?.full_name || '',
        date_of_birth: kycData?.date_of_birth || '',
        nationality: kycData?.nationality || '',
        document_type: kycData?.document_type || 'passport',
        document_number: kycData?.document_number || '',
        document_expiry: kycData?.document_expiry || '',
        level: kycData?.level || 'basic',
      });
      setSettings(securitySettings);
      setSessions(activeSessions);
      setLoginHistory(history.history || []);
      setSuspiciousActivity(Boolean(history.suspicious_activity));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kycTone = useMemo(() => {
    if (kyc?.status === 'approved') return 'badge-success';
    if (kyc?.status === 'submitted') return 'badge-warning';
    if (kyc?.status === 'rejected') return 'badge-danger';
    return 'badge-muted';
  }, [kyc]);

  const submitKyc = async () => {
    if (!form.full_name.trim() || !form.date_of_birth || !form.nationality.trim() || !form.document_type || !form.document_number.trim() || !form.document_expiry) {
      setError('Please complete all KYC fields before submitting.');
      return;
    }
    setSubmittingKyc(true);
    setError('');
    try {
      const result = await securityService.uploadKyc(form);
      setKyc(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmittingKyc(false);
    }
  };

  const updateSetting = async (nextPayload) => {
    setUpdating(true);
    setError('');
    try {
      const result = await securityService.updateSettings(nextPayload);
      setSettings(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    if (!window.confirm('Revoke this session?')) {
      return;
    }
    try {
      await securityService.revokeSession(sessionId);
      setSessions((current) => current.filter((item) => item.id !== sessionId));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm("You'll be logged out on other devices. Continue?")) {
      return;
    }
    try {
      await securityService.revokeAllSessions();
      setSessions((current) => current.filter((item) => item.is_current));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading security center...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security & KYC</h1>
          <p className="page-subtitle">Monitor verification, secure your account, and review active sessions in one place.</p>
        </div>
        <div className={`badge ${kycTone} badge-lg`}><Shield size={14} /> KYC: {kyc?.status || 'pending'}</div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">KYC Verification</h2>
            <span className={`badge ${kycTone}`}>{kyc?.status || 'pending'}</span>
          </div>

          {kyc?.status === 'approved' && (
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 18 }}>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 size={18} color="var(--success)" />
                <div style={{ fontWeight: 600 }}>Your identity is verified.</div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified on {formatDateTime(kyc.verified_at)}</div>
            </div>
          )}

          {kyc?.status === 'submitted' && (
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Under Review</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your KYC submission is in review. We will update your status once verification is complete.</div>
            </div>
          )}

          {(kyc?.status === 'pending' || kyc?.status === 'rejected') && (
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 18 }}>
              <div className="heading-sm mb-3">{kyc?.status === 'rejected' ? 'Resubmit KYC' : 'Submit KYC'}</div>
              {kyc?.status === 'rejected' && (
                <div style={{ color: 'var(--danger)', fontSize: '0.84rem', marginBottom: 12 }}>
                  Rejection reason: {kyc?.rejected_reason || 'Not provided'}
                </div>
              )}
              <div className="grid-dashboard cols-2 mb-3" style={{ gap: 12 }}>
                <input className="form-input" placeholder="Full name" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
                <input className="form-input" type="date" value={form.date_of_birth} onChange={(event) => setForm((current) => ({ ...current, date_of_birth: event.target.value }))} />
                <input className="form-input" placeholder="Nationality" value={form.nationality} onChange={(event) => setForm((current) => ({ ...current, nationality: event.target.value }))} />
                <select className="form-input" value={form.document_type} onChange={(event) => setForm((current) => ({ ...current, document_type: event.target.value }))}>
                  {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <input className="form-input" placeholder="Document number" value={form.document_number} onChange={(event) => setForm((current) => ({ ...current, document_number: event.target.value }))} />
                <input className="form-input" type="date" value={form.document_expiry} onChange={(event) => setForm((current) => ({ ...current, document_expiry: event.target.value }))} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={submitKyc} disabled={submittingKyc}>
                {submittingKyc ? 'Submitting...' : 'Submit KYC'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <h2 className="heading-md mb-4">Security Settings</h2>
            {[
              { icon: <Smartphone size={18} />, label: 'Two-Factor Auth', key: 'two_factor_enabled' },
              { icon: <Fingerprint size={18} />, label: 'Biometric Login', key: 'biometric_enabled' },
            ].map((item, index) => (
              <div key={item.key} className="flex items-center gap-3" style={{ padding: '14px 0', borderBottom: index < 1 ? '1px solid var(--border-glass)' : 'none' }}>
                <div style={{ color: 'var(--text-muted)' }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.label}</div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(settings?.[item.key])}
                    onChange={(event) => updateSetting({
                      two_factor_enabled: item.key === 'two_factor_enabled' ? event.target.checked : Boolean(settings?.two_factor_enabled),
                      biometric_enabled: item.key === 'biometric_enabled' ? event.target.checked : Boolean(settings?.biometric_enabled),
                    })}
                  />
                  <div className="toggle-track"><div className="toggle-thumb" /></div>
                </label>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="heading-md mb-3">Identity Snapshot</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>KYC Level: {kyc?.level || 'basic'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Document Type: {kyc?.document_type || 'Not submitted'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Document Expiry: {formatShortDate(kyc?.document_expiry)}</div>
          </div>
        </div>
      </div>

      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Active Sessions</h2>
          <button className="btn btn-danger btn-sm" onClick={handleRevokeAll}>Revoke All Other Sessions</button>
        </div>
        {sessions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No other active sessions.</div>
        ) : sessions.map((session, index) => (
          <div key={session.id} className="flex items-center gap-3" style={{ padding: '14px 0', borderBottom: index < sessions.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: session.is_current ? 'var(--primary-dim)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={18} color={session.is_current ? 'var(--primary)' : 'var(--text-muted)'} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{session.device_name}</span>
                {session.is_current && <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>This Device</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{session.location} | {session.browser} | {session.ip_address}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Fingerprint: {session.device_fingerprint}</div>
            </div>
            {!session.is_current && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRevoke(session.id)}>Revoke</button>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Recent Login History</h2>
          {suspiciousActivity && <span className="badge badge-danger">Suspicious activity detected</span>}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Device</th><th>Location</th><th>IP Address</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loginHistory.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>No login history found.</td></tr>
              ) : loginHistory.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.device_name} ({entry.browser})</td>
                  <td>{entry.location}</td>
                  <td>{entry.ip_address}</td>
                  <td>{formatDateTime(entry.timestamp)}</td>
                  <td><span className={`badge ${entry.status === 'success' ? 'badge-success' : 'badge-danger'}`}>{entry.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
