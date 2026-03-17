import React, { useState } from 'react';
import { Shield, Key, Bell, Globe, Zap } from 'lucide-react';

const tabs = ['General', 'Security', 'Fees & Limits', 'Notifications', 'Integrations'];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('General');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Settings</h1>
          <p className="page-subtitle">Configure global platform behavior and policies.</p>
        </div>
        <button className="btn btn-blue btn-sm">Save All Changes</button>
      </div>

      {/* Tabs */}
      <div className="tabs mb-5">
        {tabs.map(t => <div key={t} className={`tab-item ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</div>)}
      </div>

      {activeTab === 'General' && (
        <div className="grid-dashboard" style={{gridTemplateColumns: '1fr 1fr', gap: 20}}>
          <div className="card">
            <h2 className="heading-md mb-4">Platform Controls</h2>
            {[
              { label: 'Maintenance Mode', sub: 'Block all user activity', state: maintenanceMode, set: setMaintenanceMode, danger: true },
              { label: 'New User Signups', sub: 'Allow new registrations', state: signupEnabled, set: setSignupEnabled },
            ].map((ctrl, i) => (
              <div key={i} className="flex items-center justify-between" style={{padding: '16px 0', borderBottom: i < 1 ? '1px solid var(--border-glass)' : 'none'}}>
                <div>
                  <div style={{fontWeight: 600, color: ctrl.danger && ctrl.state ? 'var(--danger)' : 'var(--text-main)'}}>{ctrl.label}</div>
                  <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{ctrl.sub}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={ctrl.state} onChange={e => ctrl.set(e.target.checked)} />
                  <div className="toggle-track"><div className="toggle-thumb" /></div>
                </label>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 className="heading-md mb-4">Platform Info</h2>
            <div className="form-group mb-4">
              <label className="form-label">Platform Name</label>
              <input className="form-input" defaultValue="Zank AI" />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Support Email</label>
              <input className="form-input" defaultValue="support@zankmail.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Compliance Officer Email</label>
              <input className="form-input" defaultValue="compliance@zankops.com" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Security' && (
        <div className="card" style={{maxWidth: 600}}>
          <h2 className="heading-md mb-4">Security Policies</h2>
          {[
            { label: 'Force 2FA for All Users', sub: 'Require two-factor on login', checked: true },
            { label: 'Session Timeout (15 min)', sub: 'Auto-logout inactive sessions', checked: true },
            { label: 'IP Allowlist for Admins', sub: 'Block admin access from unknown IPs', checked: false },
            { label: 'Fraud Auto-Block', sub: 'Automatically freeze flagged accounts', checked: true },
          ].map((s, i) => (
            <div key={i} className="flex justify-between items-center" style={{padding: '16px 0', borderBottom: i < 3 ? '1px solid var(--border-glass)' : 'none'}}>
              <div>
                <div style={{fontWeight: 600}}>{s.label}</div>
                <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{s.sub}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked={s.checked} />
                <div className="toggle-track"><div className="toggle-thumb" /></div>
              </label>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Fees & Limits' && (
        <div className="card" style={{maxWidth: 640}}>
          <h2 className="heading-md mb-4">Transaction Limits & Fees</h2>
          <div className="grid-dashboard cols-2" style={{gap: 16}}>
            {[
              ['Max Daily Transfer', '$10,000'],
              ['Wire Transfer Fee', '0.1%'],
              ['FX Spread (Basic)', '0.5%'],
              ['FX Spread (Premium)', '0%'],
              ['Max Withdrawal (Daily)', '$5,000'],
              ['Max Card Limit', '$2,000'],
            ].map(([label, val]) => (
              <div className="form-group" key={label}>
                <label className="form-label">{label}</label>
                <input className="form-input" defaultValue={val} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Notifications' && (
        <div className="card" style={{maxWidth: 600}}>
          <h2 className="heading-md mb-4">System Notifications</h2>
          {[
            { label: 'Critical Risk Alerts', sub: 'Email team on critical flags', checked: true },
            { label: 'Daily AUM Report', sub: 'Automated morning digest', checked: true },
            { label: 'Reconciliation Mismatch', sub: 'Notify on balance discrepancy', checked: true },
            { label: 'User Signup Spike', sub: 'Alert if signups exceed baseline', checked: false },
          ].map((n, i) => (
            <div key={i} className="flex justify-between items-center" style={{padding: '14px 0', borderBottom: i < 3 ? '1px solid var(--border-glass)' : 'none'}}>
              <div>
                <div style={{fontWeight: 600}}>{n.label}</div>
                <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{n.sub}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked={n.checked} />
                <div className="toggle-track"><div className="toggle-thumb" /></div>
              </label>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Integrations' && (
        <div className="card" style={{maxWidth: 640}}>
          <h2 className="heading-md mb-4">Connected Services</h2>
          {[
            ['Stripe', 'Payment processor', 'var(--primary)', 'Connected'],
            ['Plaid', 'Bank linking', 'var(--blue)', 'Connected'],
            ['Jumio', 'KYC provider', 'var(--lavender)', 'Connected'],
            ['SendGrid', 'Transactional email', 'var(--success)', 'Connected'],
            ['PagerDuty', 'Incident management', 'var(--warning)', 'Disconnected'],
          ].map(([name, desc, color, status]) => (
            <div key={name} className="flex items-center gap-3" style={{padding: '14px 0', borderBottom: '1px solid var(--border-glass)'}}>
              <div style={{width: 36, height: 36, borderRadius: 'var(--r-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 700, fontSize: '0.625rem'}}>
                {name[0]}
              </div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 600}}>{name}</div>
                <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{desc}</div>
              </div>
              <span className={`badge ${status === 'Connected' ? 'badge-success' : 'badge-muted'}`}>{status}</span>
              <button className="btn btn-outline btn-sm">{status === 'Connected' ? 'Configure' : 'Connect'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
