'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { adminComplianceService } from '../../../../src/services/adminComplianceService';
import { formatDateTime, formatShortDate } from '../../../../src/utils/dashboard';

function downloadCsv(rows) {
  const headers = ['user_id', 'user_name', 'user_email', 'document_type', 'submitted_date', 'status', 'level', 'rejected_reason'];
  const lines = rows.map((row) => [
    row.user_id,
    row.user_name || '',
    row.user_email || '',
    row.document_type || '',
    row.created_at || '',
    row.status || '',
    row.level || '',
    row.rejected_reason || '',
  ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `kyc_records_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function KycTable({ title, rows, actionRenderer, showReason = false }) {
  return (
    <div className="card mb-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="heading-md">{title}</h2>
        <span className="badge badge-muted">{rows.length}</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Full Name</th>
              <th>Document Type</th>
              <th>Submitted</th>
              <th>Status</th>
              {showReason && <th>Rejection Reason</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showReason ? 7 : 6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No records found.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{row.user_name || row.user_id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.user_email || row.user_id}</div>
                </td>
                <td>{row.full_name || '-'}</td>
                <td>{row.document_type || '-'}</td>
                <td>{formatShortDate(row.created_at)}</td>
                <td>
                  <span className={`badge ${row.status === 'approved' ? 'badge-success' : row.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                    {row.status}
                  </span>
                </td>
                {showReason && <td>{row.rejected_reason || '-'}</td>}
                <td>{actionRenderer(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminCompliance() {
  const [filters, setFilters] = useState({ status: 'all', level: 'all' });
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const statuses = ['submitted', 'approved', 'rejected'];
      const responses = await Promise.all(
        statuses.map((status) => adminComplianceService.getKycQueue({ status, level: filters.level, limit: 100, offset: 0 }))
      );
      const merged = responses.flatMap((response) => response.items || []);
      setRecords(merged);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [filters.level]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => filters.status === 'all' || record.status === filters.status);
  }, [filters.status, records]);

  const submitted = filteredRecords.filter((item) => item.status === 'submitted');
  const approved = filteredRecords.filter((item) => item.status === 'approved');
  const rejected = filteredRecords.filter((item) => item.status === 'rejected');

  const openDetail = async (row) => {
    setError('');
    try {
      const detail = await adminComplianceService.getKyc(row.user_id);
      setSelected(detail);
      setRejectionReason(detail.rejected_reason || '');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleApprove = async (userId) => {
    setSubmitting(true);
    setError('');
    try {
      await adminComplianceService.approveKyc(userId);
      setSelected(null);
      await loadRecords();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (userId) => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await adminComplianceService.rejectKyc(userId, rejectionReason.trim());
      setSelected(null);
      setRejectionReason('');
      await loadRecords();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const summary = {
    submitted: submitted.length,
    approved: approved.length,
    rejected: rejected.length,
    total: filteredRecords.length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance & KYC</h1>
          <p className="page-subtitle">Review submitted KYC records, approve trusted users, and document rejections clearly.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(filteredRecords)}>
          <Download size={14} /> Export List
        </button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card stat-card"><div className="stat-label">Submitted</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.submitted}</div></div>
        <div className="card stat-card"><div className="stat-label">Approved</div><div className="stat-value" style={{ color: 'var(--success)' }}>{summary.approved}</div></div>
        <div className="card stat-card"><div className="stat-label">Rejected</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.rejected}</div></div>
        <div className="card stat-card"><div className="stat-label">Total In View</div><div className="stat-value">{summary.total}</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select className="form-input" style={{ width: 'auto' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            {['all', 'submitted', 'approved', 'rejected'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.level} onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))}>
            {['all', 'basic', 'standard', 'enhanced'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading KYC records...
        </div>
      ) : (
        <>
          <KycTable
            title="KYC Queue"
            rows={submitted}
            actionRenderer={(row) => (
              <button className="btn btn-ghost btn-sm" onClick={() => openDetail(row)}>
                <Eye size={14} />
              </button>
            )}
          />

          <KycTable
            title="Approved KYC"
            rows={approved}
            actionRenderer={(row) => (
              <button className="btn btn-ghost btn-sm" onClick={() => openDetail(row)}>
                <Eye size={14} />
              </button>
            )}
          />

          <KycTable
            title="Rejected KYC"
            rows={rejected}
            showReason
            actionRenderer={(row) => (
              <button className="btn btn-ghost btn-sm" onClick={() => openDetail(row)}>
                <Eye size={14} />
              </button>
            )}
          />
        </>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 }}>
          <div className="card" style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-lg">KYC Review</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>

            <div className="grid-dashboard cols-2 mb-4">
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{selected.user_name || selected.user_id}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: 4 }}>{selected.user_email || selected.user_id}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Submitted {formatDateTime(selected.created_at)}</div>
              </div>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                <div className="heading-sm mb-2">Document Details</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Type: {selected.document_type || '-'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Number: {selected.document_number || '-'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Expiry: {formatShortDate(selected.document_expiry)}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Level: {selected.level || 'basic'}</div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="grid-dashboard cols-2 mb-3">
                <div>
                  <div className="stat-label">Full Name</div>
                  <div>{selected.full_name || '-'}</div>
                </div>
                <div>
                  <div className="stat-label">Nationality</div>
                  <div>{selected.nationality || '-'}</div>
                </div>
                <div>
                  <div className="stat-label">Date of Birth</div>
                  <div>{formatShortDate(selected.date_of_birth)}</div>
                </div>
                <div>
                  <div className="stat-label">Status</div>
                  <div><span className={`badge ${selected.status === 'approved' ? 'badge-success' : selected.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{selected.status}</span></div>
                </div>
              </div>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Reason if rejecting"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </div>

            {selected.status === 'submitted' ? (
              <div className="flex gap-3">
                <button className="btn btn-primary btn-sm" onClick={() => handleApprove(selected.user_id)} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Approve KYC'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleReject(selected.user_id)} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Reject KYC'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
