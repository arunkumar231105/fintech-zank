import React, { useState } from 'react';
import { Shield, Smartphone, Fingerprint, Eye, Clock, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

const kycSteps = [
  { label: 'Email Verified', status: 'done' },
  { label: 'Phone Verified', status: 'done' },
  { label: 'Identity Document', status: 'done' },
  { label: 'Address Proof', status: 'pending' },
  { label: 'Selfie Verification', status: 'pending' },
];

const sessions = [
  { device: 'MacBook Pro 14"', location: 'New York, US', ip: '192.168.x.x', time: 'Active now', current: true },
  { device: 'iPhone 15 Pro', location: 'New York, US', ip: '10.0.0.x', time: '2h ago', current: false },
  { device: 'Chrome on Windows', location: 'New Jersey, US', ip: '172.16.x.x', time: '3 days ago', current: false },
];

export default function UserSecurity() {
  const [twoFA, setTwoFA] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security & KYC</h1>
          <p className="page-subtitle">Protect your account and manage your identity verification.</p>
        </div>
        <div className="badge badge-success badge-lg"><Shield size={14} /> Security Score: 78/100</div>
      </div>

      <div className="grid-dashboard" style={{gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20}}>
        {/* KYC Card */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">KYC Verification</h2>
            <span className="badge badge-warning">In Progress</span>
          </div>
          <div className="progress-bar-wrap mb-3" style={{height: 8}}>
            <div className="progress-bar-fill progress-primary" style={{width: '60%'}} />
          </div>
          <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 24}}>3 of 5 steps completed</div>

          {kycSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3" style={{padding: '12px 0', borderBottom: i < kycSteps.length - 1 ? '1px solid var(--border-glass)' : 'none'}}>
              {step.status === 'done' ? (
                <CheckCircle2 size={18} color="var(--success)" />
              ) : (
                <div style={{width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-glass)', flexShrink: 0}} />
              )}
              <span style={{fontSize: '0.9375rem', color: step.status === 'done' ? 'var(--text-main)' : 'var(--text-muted)'}}>{step.label}</span>
              {step.status === 'pending' && (
                <button className="btn btn-primary btn-sm ml-auto">Complete</button>
              )}
            </div>
          ))}
        </div>

        {/* Security Controls */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <h2 className="heading-md mb-4">Security Settings</h2>
            {[
              { icon: <Smartphone size={18}/>, label: 'Two-Factor Auth', sub: 'SMS + Auth App', state: twoFA, set: setTwoFA },
              { icon: <Fingerprint size={18}/>, label: 'Biometric Login', sub: 'Face ID / Fingerprint', state: biometric, set: setBiometric },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3" style={{padding: '14px 0', borderBottom: i < 1 ? '1px solid var(--border-glass)' : 'none'}}>
                <div style={{color: 'var(--text-muted)'}}>{s.icon}</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 600, fontSize: '0.9375rem'}}>{s.label}</div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{s.sub}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={s.state} onChange={e => s.set(e.target.checked)} />
                  <div className="toggle-track"><div className="toggle-thumb" /></div>
                </label>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="heading-md mb-4">Change Password</h2>
            <div className="form-group mb-3">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" placeholder="••••••••" />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="Min 8 characters" />
            </div>
            <button className="btn btn-outline btn-full">Update Password</button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Active Sessions</h2>
          <button className="btn btn-danger btn-sm">Sign Out All</button>
        </div>
        {sessions.map((s, i) => (
          <div key={i} className="flex items-center gap-3" style={{padding: '14px 0', borderBottom: i < sessions.length - 1 ? '1px solid var(--border-glass)' : 'none'}}>
            <div style={{width: 40, height: 40, borderRadius: 'var(--r-md)', background: s.current ? 'var(--primary-dim)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Eye size={18} color={s.current ? 'var(--primary)' : 'var(--text-muted)'} />
            </div>
            <div style={{flex: 1}}>
              <div className="flex items-center gap-2">
                <span style={{fontWeight: 600, fontSize: '0.9375rem'}}>{s.device}</span>
                {s.current && <span className="badge badge-success" style={{fontSize: '0.625rem'}}>This device</span>}
              </div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{s.location} · {s.ip} · {s.time}</div>
            </div>
            {!s.current && <button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}}>Sign out</button>}
          </div>
        ))}
      </div>

      {/* Login History */}
      <div className="card">
        <h2 className="heading-md mb-4">Recent Login History</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Device</th><th>Location</th><th>IP Address</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>MacBook Pro</td><td>New York, US</td><td>192.168.1.x</td><td>Mar 11, 2026</td><td><span className="badge badge-success">Success</span></td></tr>
              <tr><td>iPhone 15 Pro</td><td>New York, US</td><td>10.0.0.x</td><td>Mar 11, 2026</td><td><span className="badge badge-success">Success</span></td></tr>
              <tr><td>Unknown Device</td><td>Unknown, RU</td><td>45.227.x.x</td><td>Mar 10, 2026</td><td><span className="badge badge-danger">Blocked</span></td></tr>
              <tr><td>Chrome Browser</td><td>New Jersey, US</td><td>172.16.x.x</td><td>Mar 8, 2026</td><td><span className="badge badge-success">Success</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
