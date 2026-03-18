'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileCheck, XCircle } from 'lucide-react';
import { adminComplianceService } from '../../../../src/services/adminComplianceService';
import { formatDateTime, formatShortDate } from '../../../../src/utils/dashboard';

function downloadCsv(rows) {
  const headers = ['user_id', 'name', 'email', 'document_type', 'submitted_date', 'status'];
  const csv = [headers.join(',')]
    .concat(rows.map((row) => [row.user_id, row.name, row.email, row.document_type, row.submitted_date, row.status].join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `kyc_queue_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function AdminCompliance() {
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', submitted_after: '' });
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState({ action: 'approve', rejection_reason: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminComplianceService.getKycQueue(filters);
      setQueue(result.items || []);
      setSummary(result.summary || {});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filters]);

  const pendingRows = useMemo(() => queue.filter((item) => item.status === 'pending'), [queue]);

  const handleDecision = async () => {
    if (decision.action !== 'approve' && !decision.rejection_reason.trim()) {
      setError('Rejection reason required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminComplianceService.updateKyc(selected.user_id, decision);
      setSelected(null);
      setDecision({ action: 'approve', rejection_reason: '', notes: '' });
      await loadQueue();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance & KYC</h1>
          <p className="page-subtitle">Review KYC submissions, validate documents, and approve or reject with audit notes.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(queue)}><Download size={14} /> Export List</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card stat-card"><div className="stat-label">Pending Review</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{summary?.pending_review || 0}</div></div>
        <div className="card stat-card"><div className="stat-label">Approved Today</div><div className="stat-value" style={{ color: 'var(--success)' }}>{summary?.approved_today || 0}</div></div>
        <div className="card stat-card"><div className="stat-label">Rejected Today</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{summary?.rejected_today || 0}</div></div>
        <div className="card stat-card"><div className="stat-label">Avg Review Time</div><div className="stat-value">{Math.round(summary?.average_review_time_hours || 0)}h</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select className="form-input" style={{ width: 'auto' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            {['all', 'pending', 'verified', 'rejected'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
            {['all', 'high', 'normal'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="form-input" style={{ width: 'auto' }} type="date" value={filters.submitted_after} onChange={(event) => setFilters((current) => ({ ...current, submitted_after: event.target.value }))} />
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{pendingRows.length} pending in current view</div>
        </div>
      </div>

      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Submitted</th><th>Document Type</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading KYC queue...</td></tr>
              ) : queue.map((row) => (
                <tr key={row.user_id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>
                  </td>
                  <td>{formatShortDate(row.submitted_date)}</td>
                  <td>{row.document_type}</td>
                  <td><span className={`badge ${row.priority === 'high' ? 'badge-danger' : 'badge-blue'}`}>{row.priority}</span></td>
                  <td><span className={`badge ${row.status === 'verified' ? 'badge-success' : row.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{row.status}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => { setSelected(row); setDecision({ action: 'approve', rejection_reason: row.rejection_reason || '', notes: row.notes || '' }); }}><Eye size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 }}>
          <div className="card" style={{ width: '100%', maxWidth: 860, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-lg">KYC Review</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>

            <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{selected.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>{selected.email}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>{selected.phone || 'No phone'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Registered {formatDateTime(selected.registration_date)}</div>
              </div>

              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                <div className="heading-md mb-3">Document Checklist</div>
                {Object.entries(selected.checklist || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 mb-2" style={{ fontSize: '0.85rem' }}>
                    {value ? <FileCheck size={15} color="var(--success)" /> : <XCircle size={15} color="var(--danger)" />}
                    <span>{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Uploaded document type: {selected.document_type}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Preview unavailable in local seed data. Review metadata and uploaded status from backend.
                </div>
              </div>
            </div>

            <div className="card mt-4">
              <div className="grid-dashboard cols-2 mb-3">
                <select className="form-input" value={decision.action} onChange={(event) => setDecision((current) => ({ ...current, action: event.target.value }))}>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="request_reupload">Request Re-upload</option>
                </select>
                <input
                  className="form-input"
                  placeholder="Rejection reason"
                  value={decision.rejection_reason}
                  onChange={(event) => setDecision((current) => ({ ...current, rejection_reason: event.target.value }))}
                  disabled={decision.action === 'approve'}
                />
              </div>
              <textarea className="form-input mb-4" rows={4} placeholder="Additional notes" value={decision.notes} onChange={(event) => setDecision((current) => ({ ...current, notes: event.target.value }))} />
              <div className="flex gap-3">
                <button className="btn btn-primary btn-sm" onClick={handleDecision} disabled={submitting}>{submitting ? 'Saving...' : 'Approve / Save Decision'}</button>
                <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
