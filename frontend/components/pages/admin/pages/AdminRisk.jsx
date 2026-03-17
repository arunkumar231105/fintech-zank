import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Eye, UserX } from 'lucide-react';
import { riskFlags } from '../../../data/mockData';

export default function AdminRisk() {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Risk Intelligence</h1>
          <p className="page-subtitle">Real-time fraud detection, AML screening, and velocity alerts.</p>
        </div>
        <button className="btn btn-outline btn-sm">Download Risk Report</button>
      </div>

      {/* Risk Stats */}
      <div className="grid-dashboard cols-4 mb-5">
        {[
          { label: 'Critical Flags', val: riskFlags.filter(r => r.severity === 'critical').length, color: 'var(--danger)' },
          { label: 'High Risk Accounts', val: riskFlags.filter(r => r.severity === 'high').length, color: 'var(--warning)' },
          { label: 'Under Review', val: riskFlags.filter(r => r.status === 'review').length, color: 'var(--blue)' },
          { label: 'Cleared Today', val: riskFlags.filter(r => r.status === 'cleared').length, color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color: s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Risk Score Bar */}
      <div className="card mb-5">
        <h2 className="heading-md mb-4">Risk Distribution</h2>
        <div style={{height: 100, display: 'flex', alignItems: 'flex-end', gap: 10}}>
          {[12, 28, 42, 38, 25, 18, 14].map((v, i) => (
            <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
              <div style={{width: '100%', background: v > 35 ? 'var(--grad-warm)' : v > 20 ? 'var(--warning)' : 'var(--success)', borderRadius: '4px 4px 0 0', height: `${(v/45)*90}px`, opacity: 0.8}} />
              <div style={{fontSize: '0.6875rem', color: 'var(--text-muted)'}}>{['0–15','15–30','30–45','45–60','60–75','75–90','90+'][i]}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)'}}>Risk score distribution across platform users</div>
      </div>

      {/* Flags Table */}
      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Active Risk Flags</h2>
          <span className="badge badge-danger">{riskFlags.filter(r => r.status !== 'cleared').length} Open</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Flag ID</th><th>User</th><th>Type</th><th>Risk Score</th><th>Severity</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {riskFlags.map(r => (
                <tr key={r.id} style={{cursor: 'pointer'}} onClick={() => setSelected(r)}>
                  <td style={{fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{r.id}</td>
                  <td>
                    <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{r.name}</div>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{r.userId}</div>
                  </td>
                  <td><span className="badge badge-warning">{r.type}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar-wrap" style={{width: 60, height: 5}}>
                        <div className="progress-bar-fill" style={{width: `${r.score}%`, background: r.score > 70 ? 'var(--danger)' : r.score > 40 ? 'var(--warning)' : 'var(--success)'}} />
                      </div>
                      <span style={{fontSize: '0.8125rem', fontWeight: 700}}>{r.score}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.severity === 'critical' ? 'badge-danger' : r.severity === 'high' ? 'badge-warning' : 'badge-blue'}`}>
                      {r.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'cleared' ? 'badge-success' : r.status === 'review' ? 'badge-blue' : 'badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(r); }}><Eye size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AML & Velocity Section */}
      <div className="grid-dashboard cols-2">
        <div className="card">
          <h2 className="heading-md mb-4">AML Monitoring Rules</h2>
          {[
            { rule: 'Velocity Limit (>10 txn/hr)', status: 'active', triggers: 3 },
            { rule: 'Large Cash Equivalent (>$10K)', status: 'active', triggers: 1 },
            { rule: 'PEP Screening', status: 'active', triggers: 0 },
            { rule: 'Sanctioned Countries Block', status: 'active', triggers: 2 },
          ].map((r, i) => (
            <div key={i} className="flex justify-between items-center" style={{padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border-glass)' : 'none'}}>
              <div>
                <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{r.rule}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--success)', marginTop: 2}}>● {r.status}</div>
              </div>
              <span className={`badge ${r.triggers > 0 ? 'badge-warning' : 'badge-muted'}`}>{r.triggers} triggers</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="heading-md mb-4">Fraud Alert Feed</h2>
          {[
            { time: '10:45 AM', msg: 'UID-84302 exceeded $50K withdrawal velocity limit', level: 'critical' },
            { time: '10:15 AM', msg: 'UID-44021 triggered rate limiter (12 txns/30min)', level: 'high' },
            { time: '09:30 AM', msg: 'System blocked login from sanctioned IP 45.227.x.x', level: 'high' },
            { time: '08:00 AM', msg: 'UID-22199 matched PEP watchlist — low confidence', level: 'medium' },
          ].map((a, i) => (
            <div key={i} className="flex gap-3 items-start" style={{padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border-glass)' : 'none'}}>
              <AlertTriangle size={14} color={a.level === 'critical' ? 'var(--danger)' : a.level === 'high' ? 'var(--warning)' : 'var(--blue)'} style={{marginTop: 2, flexShrink: 0}} />
              <div>
                <div style={{fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--text-secondary)'}}>{a.msg}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3}}>{a.time} today</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Detail Modal */}
      {selected && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200}}>
          <div className="card" style={{width: '100%', maxWidth: 440, borderRadius: 'var(--r-xl)', padding: 32}}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="heading-lg">Risk Flag Review</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="avatar avatar-md">{selected.name[0]}</div>
              <div>
                <div style={{fontWeight: 700}}>{selected.name}</div>
                <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{selected.userId}</div>
              </div>
              <span className={`badge ${selected.severity === 'critical' ? 'badge-danger' : 'badge-warning'} ml-auto`}>{selected.severity}</span>
            </div>
            <div style={{background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 20, color: 'var(--danger)', fontSize: '0.875rem', lineHeight: 1.6}}>
              ⚠️ {selected.desc}
            </div>
            <div className="flex gap-3">
              <button className="btn btn-outline flex-1">Dismiss Flag</button>
              <button className="btn btn-danger flex-1"><UserX size={14}/> Freeze Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
