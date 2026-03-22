'use client';

import React, { useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { ledgerService } from '../../../../src/services/ledgerService';
import { formatCurrency } from '../../../../src/utils/dashboard';

function downloadCsv(rows) {
  const headers = ['id', 'type', 'status', 'amount', 'currency', 'created_at', 'posted_at'];
  const csv = [headers.join(',')]
    .concat(rows.map((row) => [row.id, row.type, row.status, row.amount, row.currency, row.created_at, row.posted_at].join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ledger_transactions_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function AdminTransactions() {
  const [filters, setFilters] = useState({ page: 1, limit: 100, transaction_type: 'all', status: 'all', from_date: '', to_date: '', user_search: '' });
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 100 });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const offset = (nextFilters.page - 1) * nextFilters.limit;
      const result = await ledgerService.queryTransactions({
        user_search: nextFilters.user_search || null,
        status: nextFilters.status === 'all' ? null : nextFilters.status,
        transaction_type: nextFilters.transaction_type === 'all' ? null : nextFilters.transaction_type,
        from_date: nextFilters.from_date || null,
        to_date: nextFilters.to_date || null,
        limit: nextFilters.limit,
        offset,
      });
      const total = result.pagination?.total || 0;
      const pages = Math.max(1, Math.ceil(total / nextFilters.limit));
      setTransactions(result.items || []);
      setPagination({ page: nextFilters.page, pages, total, limit: nextFilters.limit });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(filters);
  }, [filters]);

  const openDetail = async (transactionId) => {
    try {
      const result = await ledgerService.getTransaction(transactionId);
      setSelected(result);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Transactions</h1>
          <p className="page-subtitle">Inspect posted ledger transactions with date, status, and type filters.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(transactions)}><Download size={14} /> Export CSV</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select className="form-input" style={{ width: 'auto' }} value={filters.transaction_type} onChange={(event) => setFilters((current) => ({ ...current, transaction_type: event.target.value, page: 1 }))}>
            {['all', 'transfer', 'deposit', 'withdrawal', 'payment', 'fee', 'refund', 'reversal'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            {['all', 'pending', 'processing', 'posted', 'failed', 'reversed'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="form-input" style={{ width: 160 }} type="date" value={filters.from_date} onChange={(event) => setFilters((current) => ({ ...current, from_date: event.target.value, page: 1 }))} />
          <input className="form-input" style={{ width: 160 }} type="date" value={filters.to_date} onChange={(event) => setFilters((current) => ({ ...current, to_date: event.target.value, page: 1 }))} />
          <input className="form-input" style={{ width: 180 }} value={filters.user_search} onChange={(event) => setFilters((current) => ({ ...current, user_search: event.target.value, page: 1 }))} placeholder="User / ref search" />
        </div>
      </div>

      <div className="card p-0">
        <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Type</th><th>From User</th><th>To User</th><th>Fee</th><th>Status</th><th>Amount</th><th>Currency</th><th>Created At</th><th>Actions</th></tr>
              </thead>
              <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No ledger transactions found.</td></tr>
              ) : transactions.map((tx) => (
                <React.Fragment key={tx.id}>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{tx.id}</td>
                    <td><span className="badge badge-muted">{tx.type}</span></td>
                    <td>{tx.from_user || '-'}</td>
                    <td>{tx.to_user || '-'}</td>
                    <td>{tx.fee ? formatCurrency(tx.fee, tx.currency) : '-'}</td>
                    <td><span className={`badge ${tx.status === 'posted' ? 'badge-success' : tx.status === 'reversed' ? 'badge-warning' : tx.status === 'failed' ? 'badge-danger' : 'badge-blue'}`}>{tx.status}</span></td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(tx.amount, tx.currency)}</td>
                    <td>{tx.currency}</td>
                    <td>{tx.created_at ? new Date(tx.created_at).toLocaleString() : '-'}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openDetail(tx.id)}><Eye size={14} /></button></td>
                  </tr>
                  {selected?.id === tx.id && (
                    <tr>
                      <td colSpan={10} style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr', gap: 12, padding: 16 }}>
                          {(selected.entries || []).map((entry) => (
                            <div key={entry.id} className="tx-row">
                              <div className="tx-meta">
                                <div className="tx-name">{entry.account_id}</div>
                                <div className="tx-date">{entry.entry_type} · Balance After {formatCurrency(entry.balance_after, entry.currency)}</div>
                              </div>
                              <div className="tx-amount-col" style={{ color: entry.entry_type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                                {formatCurrency(entry.amount, entry.currency)}
                              </div>
                            </div>
                          ))}
                          {(selected.events || []).map((event) => (
                            <div key={event.id} className="tx-row">
                              <div className="tx-meta">
                                <div className="tx-name">{event.from_status || 'start'} → {event.to_status}</div>
                                <div className="tx-date">{event.created_at ? new Date(event.created_at).toLocaleString() : '-'}</div>
                              </div>
                            </div>
                          ))}
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
