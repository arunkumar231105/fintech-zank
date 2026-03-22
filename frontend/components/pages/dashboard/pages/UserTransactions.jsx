'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Search, X, ArrowDownLeft, ArrowUpRight, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { transactionService } from '../../../../src/services/transactionService';
import { useAppData } from '../../../../src/context/AppDataContext';
import { formatCurrency, formatDateTime } from '../../../../src/utils/dashboard';

const typeOptions = ['all', 'deposit', 'withdraw', 'send', 'receive'];
const statusOptions = ['all', 'completed', 'pending', 'failed'];
const periodOptions = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

function typeIcon(type) {
  switch (type) {
    case 'deposit':
    case 'receive':
      return <ArrowDownLeft size={16} />;
    case 'withdraw':
      return <ArrowUpRight size={16} />;
    default:
      return <ArrowRight size={16} />;
  }
}

function statusBadge(status) {
  if (status === 'completed') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
  return 'badge-danger';
}

function directionColor(direction) {
  return direction === 'credit' ? 'var(--success)' : 'var(--danger)';
}

function ExportModal({ open, onClose, onDownload, loading }) {
  const [format, setFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!open) {
      setFormat('csv');
      setStartDate('');
      setEndDate('');
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 220 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="card"
            style={{ width: '100%', maxWidth: 460, borderRadius: 'var(--r-xl)', padding: 28 }}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="heading-lg">Export Transactions</h3>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Format</label>
              <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                {['csv', 'pdf', 'xlsx'].map((entry) => (
                  <label key={entry} className="seg-tab" style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="export-format"
                      value={entry}
                      checked={format === entry}
                      onChange={(event) => setFormat(event.target.value)}
                      style={{ marginRight: 8 }}
                    />
                    {entry.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid-dashboard cols-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="form-input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => onDownload({ format, startDate, endDate })}
                disabled={loading}
              >
                {loading ? 'Preparing...' : 'Download'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function UserTransactions() {
  const { wallet, pushToast } = useAppData();
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState({ list: true, detail: false, stats: true, export: false });
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState('month');
  const [stats, setStats] = useState({ income: 0, expenses: 0, net: 0, chart: [] });
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading((current) => ({ ...current, list: true }));
      try {
        const result = await transactionService.getTransactions({
          page,
          limit: 20,
          type: filters.type,
          status: filters.status,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          search: filters.search || undefined,
          account_id: wallet?.accountId || undefined,
        });
        setTransactions(result.items);
        setPagination(result.pagination);
      } catch (error) {
        pushToast({ tone: 'error', message: error.message || 'Failed to load transactions, retry.' });
      } finally {
        setLoading((current) => ({ ...current, list: false }));
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [filters, page, pushToast]);

  useEffect(() => {
    async function loadStats() {
      setLoading((current) => ({ ...current, stats: true }));
      try {
        const result = await transactionService.getStats(statsPeriod);
        setStats(result);
      } catch (error) {
        pushToast({ tone: 'error', message: error.message || 'Failed to load transaction stats.' });
      } finally {
        setLoading((current) => ({ ...current, stats: false }));
      }
    }

    loadStats();
  }, [statsPeriod, pushToast]);

  const handleOpenDetail = async (transactionId) => {
    setDetailOpen(true);
    setLoading((current) => ({ ...current, detail: true }));
    try {
      const result = await transactionService.getTransaction(transactionId);
      setDetail(result);
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Failed to load transaction details.' });
      setDetailOpen(false);
    } finally {
      setLoading((current) => ({ ...current, detail: false }));
    }
  };

  const handleExport = async ({ format, startDate, endDate }) => {
    if (startDate && endDate && startDate > endDate) {
      pushToast({ tone: 'error', message: 'Start date must be before end date.' });
      return;
    }

    setLoading((current) => ({ ...current, export: true }));
    try {
      // Download as a blob from the backend and trigger a browser save.
      const response = await transactionService.exportTransactions({
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportOpen(false);
      pushToast({ tone: 'success', message: `Transactions exported as ${format.toUpperCase()}.` });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Export failed, try again.' });
    } finally {
      setLoading((current) => ({ ...current, export: false }));
    }
  };

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0) {
      return 'Showing 0 transactions';
    }
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `Showing ${start}-${end} of ${pagination.total} transactions`;
  }, [pagination]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Review, filter, and export your real transaction history.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setExportOpen(true)}>
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Transaction Stats</h2>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  className={`seg-tab ${statsPeriod === option.value ? 'active' : ''}`}
                  onClick={() => setStatsPeriod(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-dashboard cols-3 mb-4">
            <div className="card stat-card">
              <div className="stat-label">Income</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(stats.income, wallet?.currency)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Expenses</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(stats.expenses, wallet?.currency)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Net</div>
              <div className="stat-value">{formatCurrency(stats.net, wallet?.currency)}</div>
            </div>
          </div>

          <div style={{ height: 260 }}>
            {loading.stats ? (
              <div className="card" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="heading-md mb-4">Filters</h2>
          <div className="form-group mb-4">
            <label className="form-label">Search</label>
            <div className="header-search-wrap" style={{ maxWidth: '100%' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                className="header-search-input"
                placeholder="Description or reference..."
                value={filters.search}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({ ...current, search: event.target.value }));
                }}
              />
              {filters.search && (
                <button onClick={() => setFilters((current) => ({ ...current, search: '' }))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Type</label>
            <select className="form-input" value={filters.type} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, type: event.target.value })); }}>
              {typeOptions.map((entry) => <option key={entry} value={entry}>{entry.charAt(0).toUpperCase() + entry.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Status</label>
            <select className="form-input" value={filters.status} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, status: event.target.value })); }}>
              {statusOptions.map((entry) => <option key={entry} value={entry}>{entry.charAt(0).toUpperCase() + entry.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid-dashboard cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={filters.startDate} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, startDate: event.target.value })); }} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={filters.endDate} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, endDate: event.target.value })); }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0">
        <div className="flex justify-between items-center" style={{ padding: '20px 20px 0' }}>
          <h2 className="heading-md">Transaction History</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{rangeLabel}</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading.list && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 42, color: 'var(--text-muted)' }}>Loading transactions...</td>
                </tr>
              )}
              {!loading.list && transactions.map((transaction) => (
                <tr key={transaction.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(transaction.id)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`tx-icon-wrap ${transaction.direction === 'credit' ? 'tx-icon-credit' : 'tx-icon-debit'}`}>
                        {typeIcon(transaction.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{transaction.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{transaction.referenceId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: directionColor(transaction.direction) }}>
                    {transaction.direction === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td>{transaction.fee ? formatCurrency(transaction.fee, transaction.currency) : '-'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDateTime(transaction.timestamp)}</td>
                  <td><span className={`badge ${statusBadge(transaction.status)}`}>{transaction.status}</span></td>
                </tr>
              ))}
              {!loading.list && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center" style={{ padding: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
            <ArrowLeft size={14} /> Prev
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Page {pagination.page} of {Math.max(1, pagination.pages || 1)}
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setPage((current) => current + 1)} disabled={page >= (pagination.pages || 1)}>
            Next <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {detailOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 220 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="card"
              style={{ width: '100%', maxWidth: 520, borderRadius: 'var(--r-xl)', padding: 28 }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="heading-lg">Transaction Details</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => { setDetailOpen(false); setDetail(null); }}>Close</button>
              </div>

              {loading.detail || !detail ? (
                <div style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Loading details...</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {[
                    ['ID', detail.id],
                    ['Type', detail.type],
                    ['Amount', `${detail.direction === 'credit' ? '+' : '-'}${formatCurrency(detail.amount, detail.currency)}`],
                    ['Description', detail.description],
                    ['Reference', detail.reference],
                    ['Fee', detail.fee ? formatCurrency(detail.fee, detail.currency) : '-'],
                    ['From', detail.fromUser || '-'],
                    ['To', detail.toUser || '-'],
                    ['Timestamp', formatDateTime(detail.timestamp)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-glass)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: label === 'Type' ? 'capitalize' : 'none' }}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between" style={{ padding: '10px 0' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</span>
                    <span className={`badge ${statusBadge(detail.status)}`}>{detail.status}</span>
                  </div>
                  {detail.status === 'failed' && (
                    <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.18)' }}>
                      Failure reason: {detail.failureReason || 'Transaction failed.'}
                    </div>
                  )}
                  {detail.status === 'pending' && (
                    <div className="card" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.18)' }}>
                      Processing...
                    </div>
                  )}
                  {detail.entries?.length > 0 && (
                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="heading-sm mb-3">Ledger Entries</div>
                      {detail.entries.map((entry) => (
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
                    </div>
                  )}
                  {detail.events?.length > 0 && (
                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="heading-sm mb-3">State Events</div>
                      {detail.events.map((event) => (
                        <div key={event.id} className="tx-row">
                          <div className="tx-meta">
                            <div className="tx-name">{event.from_status || 'start'} → {event.to_status}</div>
                            <div className="tx-date">{event.created_at ? formatDateTime(event.created_at) : '-'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} onDownload={handleExport} loading={loading.export} />
    </div>
  );
}
