import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, AlertTriangle, Users, Activity, ShieldAlert } from 'lucide-react';
import { adminStats, auditLogs, riskFlags, reconciliationAlerts } from '../../../data/mockData';

export default function AdminOverview() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{background: 'var(--grad-purple)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            Platform Overview
          </h1>
          <p className="page-subtitle">Real-time operational intelligence for Zank AI.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline btn-sm">Export Report</button>
          <button className="btn btn-blue btn-sm">Run Reconciliation</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-dashboard cols-4 mb-5">
        {[
          { label: 'Total Users', val: adminStats.totalUsers, change: '+12%', up: true, icon: <Users size={18}/>, color: 'var(--primary)' },
          { label: 'Total AUM', val: adminStats.totalAUM, change: '+8%', up: true, icon: <Activity size={18}/>, color: 'var(--blue)' },
          { label: 'Daily Volume', val: adminStats.dailyVolume, change: '-2%', up: false, icon: <TrendingUp size={18}/>, color: 'var(--lavender)' },
          { label: 'Risk Flags', val: String(adminStats.riskFlags), change: '+3 today', up: false, isRisk: true, icon: <ShieldAlert size={18}/>, color: 'var(--danger)' },
        ].map((k, i) => (
          <div key={i} className={`card stat-card ${k.isRisk ? 'card-gradient-danger' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="stat-label">{k.label}</div>
              <div style={{color: k.color, opacity: 0.8}}>{k.icon}</div>
            </div>
            <div className="stat-value" style={{color: k.isRisk ? 'var(--danger)' : 'var(--text-main)'}}>{k.val}</div>
            <div className={`stat-change ${k.up ? 'text-success' : 'text-danger'}`}>
              {k.up ? <TrendingUp size={13}/> : <TrendingDown size={13}/>} {k.change}
            </div>
          </div>
        ))}
      </div>

      {/* Second Row */}
      <div className="grid-dashboard cols-4 mb-5">
        {[
          { label: 'Pending KYC', val: adminStats.pendingKYC, color: 'var(--warning)', action: '/admin/compliance' },
          { label: 'Frozen Accounts', val: adminStats.frozenAccounts, color: 'var(--danger)', action: '/admin/users' },
          { label: '30d Revenue', val: adminStats.revenue30d, color: 'var(--success)', action: null },
          { label: 'Open Tickets', val: adminStats.openTickets, color: 'var(--blue)', action: '/admin/support' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div className="stat-label">{s.label}</div>
            <div style={{fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: s.color, marginBottom: 8}}>{s.val}</div>
            {s.action && <Link href={s.action} style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>View details →</Link>}
          </div>
        ))}
      </div>

      <div className="grid-dashboard" style={{gridTemplateColumns: '1.6fr 1fr', gap: 20}}>
        {/* Activity Chart */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Platform Volume (7 Days)</h2>
            <span className="badge badge-blue">$1.24M daily avg</span>
          </div>
          <div style={{height: 160, display: 'flex', alignItems: 'flex-end', gap: 10}}>
            {[82, 95, 71, 110, 88, 102, 124].map((v, i) => (
              <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
                <div style={{width: '100%', background: 'var(--grad-purple)', borderRadius: '4px 4px 0 0', height: `${(v/130)*140}px`, opacity: 0.75}} />
                <div style={{fontSize: '0.6875rem', color: 'var(--text-muted)'}}>
                  {['M','T','W','T','F','S','S'][i]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Ops */}
        <div className="card">
          <h2 className="heading-md mb-4">Quick Ops</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Review KYC Queue', count: 45, to: '/admin/compliance', badge: 'badge-warning' },
              { label: 'High Risk Accounts', count: 14, to: '/admin/risk', badge: 'badge-danger' },
              { label: 'Open Support Tickets', count: 78, to: '/admin/support', badge: 'badge-blue' },
              { label: 'Pending Reconciliation', count: 2, to: '/admin/reconciliation', badge: 'badge-warning' },
            ].map((op, i) => (
              <Link key={i} href={op.to} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: 'var(--r-md)', padding: '12px 14px', transition: 'var(--transition)'}}>
                <span style={{fontWeight: 500, fontSize: '0.875rem'}}>{op.label}</span>
                <span className={`badge ${op.badge}`}>{op.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Audit Activity */}
      <div className="card mt-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Recent System Activity</h2>
          <Link href="/admin/audit" className="btn btn-ghost btn-sm">View Full Log</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Log ID</th><th>Actor</th><th>Action</th><th>Resource</th><th>Time</th><th>Severity</th></tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 5).map(log => (
                <tr key={log.id}>
                  <td style={{fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{log.id}</td>
                  <td style={{fontWeight: 600, fontSize: '0.875rem'}}>{log.actor}</td>
                  <td><span style={{fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--blue)'}}>{log.action}</span></td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{log.resource}</td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{log.ts}</td>
                  <td>
                    <span className={`badge ${log.severity === 'high' ? 'badge-danger' : log.severity === 'medium' ? 'badge-warning' : 'badge-muted'}`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
