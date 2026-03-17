import React, { useState } from 'react';
import { Search, Download, AlertTriangle } from 'lucide-react';
import { auditLogs } from '../../../data/mockData';

export default function AdminAudit() {
  const [search, setSearch] = useState('');
  const [sev, setSev] = useState('All');

  const filtered = auditLogs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = log.actor.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.resource.toLowerCase().includes(q);
    const matchSev = sev === 'All' || log.severity === sev;
    return matchSearch && matchSev;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Immutable record of all admin and system actions.</p>
        </div>
        <button className="btn btn-outline btn-sm"><Download size={14} /> Export Logs</button>
      </div>

      {/* Stats */}
      <div className="grid-dashboard cols-3 mb-5">
        {[
          { label: 'Total Events (24h)', val: auditLogs.length, color: 'var(--blue)' },
          { label: 'High Severity', val: auditLogs.filter(l => l.severity === 'high').length, color: 'var(--danger)' },
          { label: 'System Events', val: auditLogs.filter(l => l.actor === 'System').length, color: 'var(--text-muted)' },
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color: s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="header-search-wrap" style={{flex: 1, maxWidth: 360}}>
            <Search size={15} color="var(--text-muted)" />
            <input className="header-search-input" placeholder="Search actor, action, resource..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['All', 'high', 'medium', 'info'].map(s => (
              <button key={s} className={`seg-tab ${sev === s ? 'active' : ''}`} onClick={() => setSev(s)} style={{textTransform: 'capitalize'}}>{s}</button>
            ))}
          </div>
          <input className="form-input" type="date" style={{width: 'auto', padding: '7px 14px', fontSize: '0.8125rem'}} defaultValue="2026-03-11" />
        </div>
      </div>

      {/* Audit Table */}
      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Log ID</th><th>Actor</th><th>Action</th><th>Resource</th><th>IP</th><th>Timestamp</th><th>Severity</th></tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id}>
                  <td style={{fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{log.id}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar avatar-sm" style={{width: 24, height: 24, fontSize: '0.625rem', border: log.actor === 'System' ? '1px solid rgba(56,189,248,0.3)' : undefined, color: log.actor === 'System' ? 'var(--blue)' : undefined}}>
                        {log.actor[0]}
                      </div>
                      <span style={{fontWeight: 600, fontSize: '0.875rem'}}>{log.actor}</span>
                    </div>
                  </td>
                  <td><code style={{background: 'var(--blue-dim)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8125rem'}}>{log.action}</code></td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'monospace'}}>{log.resource}</td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'monospace'}}>{log.ip}</td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{log.ts}</td>
                  <td>
                    <span className={`badge ${log.severity === 'high' ? 'badge-danger' : log.severity === 'medium' ? 'badge-warning' : 'badge-muted'}`}>
                      {log.severity === 'high' && <AlertTriangle size={10} />}
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{textAlign: 'center', padding: 40, color: 'var(--text-muted)'}}>No logs match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
