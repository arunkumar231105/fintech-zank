'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, Eye, Search } from 'lucide-react';
import { adminTransactionService } from '../../../../src/services/adminTransactionService';
import { formatCurrency } from '../../../../src/utils/dashboard';

function downloadCsv(rows) {
  const headers = ['transaction_id', 'user_id', 'type', 'amount', 'status', 'date', 'flagged'];
  const csv = [headers.join(',')].concat(rows.map((row) => [row.id, row.user_id, row.type, row.amount, row.status, row.date, row.flagged].join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `admin_transactions_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function AdminTransactions() {
  const [filters, setFilters] = useState({ page: 1, limit: 100, type: 'all', status: 'all', user_id: '', date_range: '', min_amount: '', max_amount: '' });
  const [searchInput, setSearchInput] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 100 });
  const [selected, setSelected] = useState(null);
  const [reverseForm, setReverseForm] = useState({ reason: 'Customer Request', notify_user: true, notes: '' });
  const [flagForm, setFlagForm] = useState({ flag_type: 'Suspicious Activity', severity: 'medium', notes: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({ ...current, page: 1, user_id: searchInput.trim() }));
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadTransactions = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const result = await adminTransactionService.getTransactions({
        ...nextFilters,
        min_amount: nextFilters.min_amount || undefined,
        max_amount: nextFilters.max_amount || undefined,
      });
      setTransactions(result.items || []);
      setPagination(result.pagination || { page: 1, pages: 1, total: 0, limit: 100 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(filters);
  }, [filters]);

  const handleReverse = async () => {
    if (reverseForm.notes.trim().length < 5) {
      setError('Reason is required for reversal.');
      return;
    }
    setSubmitting(true);
    try {
      await adminTransactionService.reverseTransaction(selected.id, {
        reason: `${reverseForm.reason}: ${reverseForm.notes}`,
        notify_user: reverseForm.notify_user,
      });
      setSelected(null);
      loadTransactions(filters);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async () => {
    if (flagForm.notes.trim().length < 20) {
      setError('Notes must be at least 20 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await adminTransactionService.flagTransaction(selected.id, flagForm);
      setSelected(null);
      loadTransactions(filters);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const flaggedCount = transactions.filter((item) => item.flagged).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Transactions</h1>
          <p className="page-subtitle">Review platform transactions, reverse completed entries, and flag suspicious activity.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(transactions)}><Download size={14} /> Export CSV</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-4">
        <div className="card stat-card"><div className="stat-label">Total Transactions</div><div className="stat-value">{pagination.total}</div></div>
        <div className="card stat-card"><div className="stat-label">Flagged</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{flaggedCount}</div></div>
        <div className="card stat-card"><div className="stat-label">Completed</div><div className="stat-value" style={{ color: 'var(--success)' }}>{transactions.filter((item) => item.status === 'completed').length}</div></div>
        <div className="card stat-card"><div className="stat-label">Reversed</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{transactions.filter((item) => item.status === 'reversed').length}</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="header-search-wrap" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={15} color="var(--text-muted)" />
            <input className="header-search-input" placeholder="Search user, email, or ID..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          </div>
          <select className="form-input" style={{ width: 'auto' }} value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value, page: 1 }))}>
            {['all', 'admin_deposit', 'admin_adjustment', 'reversal', 'Withdrawal', 'Transfer'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            {['all', 'completed', 'pending', 'failed', 'reversed'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="form-input" style={{ width: 140 }} type="date" onChange={(event) => setFilters((current) => ({ ...current, date_range: event.target.value ? `${event.target.value},${event.target.value}` : '', page: 1 }))} />
          <input className="form-input" style={{ width: 120 }} placeholder="Min" value={filters.min_amount} onChange={(event) => setFilters((current) => ({ ...current, min_amount: event.target.value, page: 1 }))} />
          <input className="form-input" style={{ width: 120 }} placeholder="Max" value={filters.max_amount} onChange={(event) => setFilters((current) => ({ ...current, max_amount: event.target.value, page: 1 }))} />
        </div>
      </div>

      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Transaction ID</th><th>User</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th><th>Flagged</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} style={{ borderLeft: tx.flagged ? '3px solid var(--danger)' : undefined }}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{tx.id}</td>
                  <td><div style={{ fontWeight: 600 }}>{tx.user_name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.user_email}</div></td>
                  <td><span className="badge badge-muted">{tx.type}</span></td>
                  <td style={{ fontWeight: 700, color: Math.abs(tx.amount) >= 100000 ? 'var(--danger)' : 'var(--text-main)' }}>{formatCurrency(tx.amount)}</td>
                  <td><span className={`badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'reversed' ? 'badge-warning' : tx.status === 'failed' ? 'badge-danger' : 'badge-blue'}`}>{tx.status}</span></td>
                  <td>{tx.date ? new Date(tx.date).toLocaleString() : '-'}</td>
                  <td>{tx.flagged ? <span className="badge badge-danger"><AlertTriangle size={10} /> Flagged</span> : <span className="badge badge-muted">No</span>}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setSelected(tx)}><Eye size={14} /></button></td>
                </tr>
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

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="heading-lg">Transaction Detail</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="grid-dashboard cols-2 mb-5">
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                <div>ID: {selected.id}</div>
                <div>User: {selected.user_name}</div>
                <div>Amount: {formatCurrency(selected.amount)}</div>
                <div>Status: {selected.status}</div>
                <div>Date: {selected.date ? new Date(selected.date).toLocaleString() : '-'}</div>
              </div>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                <div>Reference: {selected.reference_id}</div>
                <div>Description: {selected.description}</div>
                <div>IP: {selected.metadata?.ip || '-'}</div>
                <div>Device: {selected.metadata?.device || '-'}</div>
                <div>Location: {selected.metadata?.location || '-'}</div>
              </div>
            </div>

            <div className="grid-dashboard cols-2">
              <div className="card">
                <h3 className="heading-md mb-3">Reverse Transaction</h3>
                <select className="form-input mb-3" value={reverseForm.reason} onChange={(event) => setReverseForm((current) => ({ ...current, reason: event.target.value }))}>
                  {['Customer Request', 'Fraud Detection', 'Error', 'Chargeback', 'Other'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <textarea className="form-input mb-3" rows={4} value={reverseForm.notes} onChange={(event) => setReverseForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Additional notes" />
                <label className="flex items-center gap-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={reverseForm.notify_user} onChange={(event) => setReverseForm((current) => ({ ...current, notify_user: event.target.checked }))} />
                  Notify user
                </label>
                <div className="card mb-3" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>
                  This action cannot be undone. {formatCurrency(selected.amount)} will be reversed.
                </div>
                <button className="btn btn-danger btn-full" onClick={handleReverse} disabled={submitting}>{submitting ? 'Reversing...' : 'Reverse Transaction'}</button>
              </div>

              <div className="card">
                <h3 className="heading-md mb-3">Flag for Review</h3>
                <select className="form-input mb-3" value={flagForm.flag_type} onChange={(event) => setFlagForm((current) => ({ ...current, flag_type: event.target.value }))}>
                  {['Suspicious Activity', 'Large Amount', 'Unusual Pattern', 'Fraud Suspected', 'AML Concern'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select className="form-input mb-3" value={flagForm.severity} onChange={(event) => setFlagForm((current) => ({ ...current, severity: event.target.value }))}>
                  {['low', 'medium', 'high', 'critical'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <textarea className="form-input mb-3" rows={4} value={flagForm.notes} onChange={(event) => setFlagForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Compliance notes" />
                <button className="btn btn-outline btn-full" onClick={handleFlag} disabled={submitting}>{submitting ? 'Flagging...' : 'Flag Transaction'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
