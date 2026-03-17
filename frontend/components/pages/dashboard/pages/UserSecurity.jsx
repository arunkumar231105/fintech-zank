'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Fingerprint, Shield, Smartphone, UploadCloud } from 'lucide-react';
import { securityService } from '../../../../src/services/securityService';

const KYC_TYPES = ['ID Card', 'Passport', "Driver's License", 'Utility Bill'];
const allowedKycTypes = ['image/jpeg', 'image/png', 'application/pdf'];

export default function UserSecurity() {
  const [kyc, setKyc] = useState(null);
  const [settings, setSettings] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentType, setDocumentType] = useState(KYC_TYPES[0]);
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updating, setUpdating] = useState(false);

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
    if (kyc?.status === 'verified') return 'badge-success';
    if (kyc?.status === 'pending') return 'badge-warning';
    if (kyc?.status === 'rejected') return 'badge-danger';
    return 'badge-muted';
  }, [kyc]);

  const handleUpload = async () => {
    if (!documentFile) {
      setError('Select a document before uploading.');
      return;
    }
    if (!allowedKycTypes.includes(documentFile.type) || documentFile.size > 5 * 1024 * 1024) {
      setError('Upload failed, try again');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const result = await securityService.uploadKyc(
        { documentType, documentFile },
        (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        }
      );
      setKyc(result.kyc);
      setDocumentFile(null);
      setUploadProgress(0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdating(false);
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
          <p className="page-subtitle">Live verification status, security settings, sessions, and login activity.</p>
        </div>
        <div className={`badge ${kycTone} badge-lg`}><Shield size={14} /> KYC: {kyc?.status || 'unknown'}</div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">KYC Verification</h2>
            <span className={`badge ${kycTone}`}>{kyc?.status || 'not_started'}</span>
          </div>
          <div className="progress-bar-wrap mb-3" style={{ height: 8 }}>
            <div className="progress-bar-fill progress-primary" style={{ width: `${((kyc?.completed_steps || 0) / Math.max(kyc?.total_steps || 1, 1)) * 100}%` }} />
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 24 }}>{kyc?.completed_steps || 0} of {kyc?.total_steps || 0} steps completed</div>

          {(kyc?.steps || []).map((step, index) => (
            <div key={step.label} className="flex items-center gap-3" style={{ padding: '12px 0', borderBottom: index < (kyc.steps || []).length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
              {step.completed ? <CheckCircle2 size={18} color="var(--success)" /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-glass)', flexShrink: 0 }} />}
              <span style={{ fontSize: '0.9375rem', color: step.completed ? 'var(--text-main)' : 'var(--text-muted)' }}>{step.label}</span>
            </div>
          ))}

          {kyc?.status !== 'verified' && (
            <div className="card mt-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 18 }}>
              <div className="heading-sm mb-3">Upload Documents</div>
              <div className="grid-dashboard cols-2 mb-3" style={{ gap: 12 }}>
                <select className="form-input" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                  {KYC_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <input className="form-input" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} />
              </div>
              {documentFile && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>{documentFile.name}</div>}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="progress-bar-wrap mb-3"><div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, background: 'var(--grad-primary)' }} /></div>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={updating}><UploadCloud size={14} /> {updating ? 'Uploading...' : 'Submit Documents'}</button>
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
            {settings?.two_factor_enabled && (
              <div className="card mt-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>
                <div className="heading-sm mb-2">Authenticator setup</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Scan this QR placeholder in your authenticator app to complete 2FA setup.</div>
                <div style={{ width: 100, height: 100, marginTop: 12, background: 'linear-gradient(135deg, #fff, #d4d4d8)', borderRadius: 14 }} />
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="heading-md mb-3">Password</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Last changed: {settings?.last_password_change ? new Date(settings.last_password_change).toLocaleDateString() : 'Not available'}
            </div>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{session.location} · {session.browser} · {session.ip_address}</div>
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
              {loginHistory.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.device_name} ({entry.browser})</td>
                  <td>{entry.location}</td>
                  <td>{entry.ip_address}</td>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
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
