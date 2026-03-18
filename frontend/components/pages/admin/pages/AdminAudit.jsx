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
    action_type: 'all',
    admin_user: '',
    date_range: '',
    entity_type: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 100 });
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() }));
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
    security: logs.filter((log) => String(log.action_type).includes('risk') || String(log.action_type).includes('kyc')).length,
    settings: logs.filter((log) => log.entity_type === 'settings').length,
  }), [logs, pagination.total]);

  const handleExport = async () => {
    try {
      const blob = await adminAuditService.exportLogs({
        format: 'csv',
        date_range: filters.date_range,
        action_type: filters.action_type,
        admin_user: filters.admin_user,
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
            <input className="header-search-input" placeholder="Search entity ID or admin username..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          </div>
          <select className="form-input" style={{ width: 'auto' }} value={filters.action_type} onChange={(event) => setFilters((current) => ({ ...current, action_type: event.target.value, page: 1 }))}>
            {['all', 'admin_deposit', 'status_change', 'balance_adjustment', 'kyc_review', 'settings_updated', 'support_ticket_updated', 'transaction_reversal', 'transaction_flagged', 'risk_rule_updated', 'risk_flag_updated', 'reconciliation_run'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.entity_type} onChange={(event) => setFilters((current) => ({ ...current, entity_type: event.target.value, page: 1 }))}>
            {['all', 'user', 'wallet', 'transaction', 'settings', 'support_ticket', 'risk_flag', 'risk_rule', 'reconciliation'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="form-input" style={{ width: 'auto' }} placeholder="Admin email" value={filters.admin_user} onChange={(event) => setFilters((current) => ({ ...current, admin_user: event.target.value, page: 1 }))} />
          <input className="form-input" style={{ width: 'auto' }} type="date" onChange={(event) => setFilters((current) => ({ ...current, date_range: event.target.value ? `${event.target.value},${event.target.value}` : '', page: 1 }))} />
        </div>
      </div>

      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Timestamp</th><th>Admin User</th><th>Action Type</th><th>Entity</th><th>Entity ID</th><th>IP Address</th><th>Details</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit logs...</td></tr>
              ) : logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr onClick={() => setExpanded((current) => current === log.id ? null : log.id)} style={{ cursor: 'pointer' }}>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>{log.admin_user}</td>
                    <td><span className={`badge ${String(log.action_type).includes('updated') ? 'badge-blue' : String(log.action_type).includes('reversal') ? 'badge-danger' : 'badge-success'}`}>{log.action_type}</span></td>
                    <td>{log.entity_type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.entity_id}</td>
                    <td>{log.ip_address}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{Object.keys(log.details || {}).slice(0, 2).join(', ') || 'View'}</td>
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
{JSON.stringify(log.details || {}, null, 2)}
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
