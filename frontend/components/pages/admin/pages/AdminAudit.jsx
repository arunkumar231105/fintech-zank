'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { adminAuditService } from '../../../../src/services/adminAuditService';
import { formatDateTime } from '../../../../src/utils/dashboard';

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function AdminAudit() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 100,
    action: 'all',
    actor: '',
    resource_type: 'all',
    from_date: '',
    to_date: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 100 });
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({ ...current, page: 1, actor: searchInput.trim() }));
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminAuditService.getLogs(filters);
      setLogs(result.items || []);
      setPagination(result.pagination || { page: 1, pages: 1, total: 0, limit: 100 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const stats = useMemo(() => ({
    total: pagination.total || 0,
    security: logs.filter((log) => String(log.action).includes('login') || String(log.action).includes('password') || String(log.action).includes('ledger')).length,
    settings: logs.filter((log) => log.resource_type === 'settings').length,
  }), [logs, pagination.total]);

  const handleExport = async () => {
    try {
      const blob = await adminAuditService.exportLogs({
        action: filters.action,
        actor: filters.actor,
        resource_type: filters.resource_type,
        from_date: filters.from_date,
        to_date: filters.to_date,
      });
      downloadBlob(blob, `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Immutable admin activity trail with filtering, detail inspection, and CSV export.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExport}><Download size={14} /> Export CSV</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-3 mb-5">
        <div className="card stat-card"><div className="stat-label">Events</div><div className="stat-value">{stats.total}</div></div>
        <div className="card stat-card"><div className="stat-label">Security Actions</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.security}</div></div>
        <div className="card stat-card"><div className="stat-label">Settings Changes</div><div className="stat-value" style={{ color: 'var(--blue)' }}>{stats.settings}</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="header-search-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={15} color="var(--text-muted)" />
            <input className="header-search-input" placeholder="Search actor..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          </div>
          <select className="form-input" style={{ width: 'auto' }} value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value, page: 1 }))}>
            {['all', 'ledger_post', 'ledger_reversal', 'user_login', 'user_logout', 'user_register', 'password_reset_request', 'password_reset_complete'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.resource_type} onChange={(event) => setFilters((current) => ({ ...current, resource_type: event.target.value, page: 1 }))}>
            {['all', 'pending_registration', 'user', 'session', 'transaction'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="form-input" style={{ width: 'auto' }} type="date" value={filters.from_date} onChange={(event) => setFilters((current) => ({ ...current, from_date: event.target.value, page: 1 }))} />
          <input className="form-input" style={{ width: 'auto' }} type="date" value={filters.to_date} onChange={(event) => setFilters((current) => ({ ...current, to_date: event.target.value, page: 1 }))} />
        </div>
      </div>

      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Resource</th><th>Resource ID</th><th>IP Address</th><th>Details</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs found.</td></tr>
              ) : logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr onClick={() => setExpanded((current) => current === log.id ? null : log.id)} style={{ cursor: 'pointer' }}>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>{log.actor || log.actor_email || 'System'}</td>
                    <td><span className={`badge ${String(log.action).includes('reversal') ? 'badge-danger' : String(log.action).includes('password') ? 'badge-warning' : 'badge-success'}`}>{log.action}</span></td>
                    <td>{log.resource_type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.resource_id}</td>
                    <td>{log.ip_address}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{Object.keys(log.metadata || {}).slice(0, 2).join(', ') || 'View'}</td>
                  </tr>
                  {expanded === log.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
                          <div>
                            <div className="stat-label">Request Metadata</div>
                            <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
{JSON.stringify({ ip_address: log.ip_address, user_agent: log.user_agent, device: log.device, timestamp: log.timestamp }, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="stat-label">Details JSON</div>
                            <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
{JSON.stringify(log.metadata || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center" style={{ padding: 16 }}>
          <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Page {pagination.page} of {pagination.pages || 1}</div>
          <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
        </div>
      </div>
    </div>
  );
}
