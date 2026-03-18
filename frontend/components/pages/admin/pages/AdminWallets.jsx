'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { adminService } from '../../../../src/services/adminService';
import { adminDepositService } from '../../../../src/services/adminDepositService';
import { formatCurrency } from '../../../../src/utils/dashboard';

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function AdminWallets() {
  const [overview, setOverview] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [sortBy, setSortBy] = useState('balance_desc');
  const [status, setStatus] = useState('all');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [depositTarget, setDepositTarget] = useState(null);
  const [depositForm, setDepositForm] = useState({ amount: '', payment_method: 'Bank Transfer', email_receipt: true, admin_note: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadWallets = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, walletData] = await Promise.all([
        adminService.getWalletsOverview(),
        adminService.getWallets({
          page: nextPage,
          limit: 50,
          sort_by: sortBy,
          min_balance: Number(minBalance || 0),
          max_balance: maxBalance ? Number(maxBalance) : undefined,
          status,
        }),
      ]);
      setOverview(overviewData);
      setWallets(walletData.items || []);
      setPagination(walletData.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
      setPage(nextPage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets(1);
  }, [sortBy, status, minBalance, maxBalance]);

  const exportWallets = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/admin/export/wallets`, {
      headers: { Authorization: `Bearer ${window.localStorage.getItem('accessToken')}` },
      credentials: 'include',
    });
    const text = await response.text();
    downloadCsv(text, `admin_wallets_${Date.now()}.csv`);
  };

  const handleDeposit = async () => {
    if (!depositTarget || Number(depositForm.amount) <= 0) {
      setError('Deposit amount must be greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      await adminDepositService.deposit({
        user_id: depositTarget.user_id,
        amount: Number(depositForm.amount),
        payment_method: depositForm.payment_method,
        email_receipt: depositForm.email_receipt,
        admin_note: depositForm.admin_note,
      });
      setDepositTarget(null);
      setDepositForm({ amount: '', payment_method: 'Bank Transfer', email_receipt: true, admin_note: '' });
      loadWallets(page);
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
          <h1 className="page-title">Platform Wallets</h1>
          <p className="page-subtitle">Platform-wide wallet balances, AUM visibility, and admin deposit operations.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportWallets}><Download size={14} /> Export CSV</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card card-gradient-blue" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total AUM</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{formatCurrency(overview?.total_aum || 0)}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Average Balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(overview?.average_balance || 0)}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Highest Balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(overview?.highest_balance || 0)}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Lowest Balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(overview?.lowest_balance || 0)}</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select className="form-input" style={{ width: 'auto' }} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="balance_desc">Balance High-Low</option>
            <option value="balance_asc">Balance Low-High</option>
            <option value="name">User Name</option>
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={status} onChange={(event) => setStatus(event.target.value)}>
            {['all', 'active', 'deactivated'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="form-input" style={{ width: 140 }} value={minBalance} onChange={(event) => setMinBalance(event.target.value)} placeholder="Min balance" />
          <input className="form-input" style={{ width: 140 }} value={maxBalance} onChange={(event) => setMaxBalance(event.target.value)} placeholder="Max balance" />
        </div>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '0.9fr 1.1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h2 className="heading-md mb-4">AUM Summary</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>Active Wallets AUM: <strong>{formatCurrency(overview?.active_wallets_aum || 0)}</strong></div>
            <div>Frozen Wallets AUM: <strong>{formatCurrency(overview?.frozen_wallets_aum || 0)}</strong></div>
            <div>Savings Goals Total: <strong>{formatCurrency(overview?.savings_goals_total || 0)}</strong></div>
          </div>
          <h3 className="heading-md mt-5 mb-3">Top 10 Users by Balance</h3>
          {(overview?.top_users || []).map((wallet) => (
            <div key={wallet.user_id} className="tx-row">
              <div className="tx-meta">
                <div className="tx-name">{wallet.user_name}</div>
                <div className="tx-date">{wallet.email}</div>
              </div>
              <div className="tx-amount-col">
                <div className="tx-amount">{formatCurrency(wallet.balance)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-0">
          <div style={{ padding: '20px 20px 0' }}>
            <h2 className="heading-md">Wallets Table</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>User Name</th><th>Email</th><th>Wallet Balance</th><th>Currency</th><th>Status</th><th>Daily Limit</th><th>Monthly Limit</th><th>Last Transaction</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading wallets...</td></tr>
                ) : wallets.map((wallet) => (
                  <tr key={wallet.user_id}>
                    <td style={{ fontWeight: 600 }}>{wallet.user_name}</td>
                    <td>{wallet.email}</td>
                    <td>{formatCurrency(wallet.balance, wallet.currency)}</td>
                    <td>{wallet.currency}</td>
                    <td><span className={`badge ${wallet.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{wallet.status}</span></td>
                    <td>{formatCurrency(wallet.daily_limit)}</td>
                    <td>{formatCurrency(wallet.monthly_limit)}</td>
                    <td>{wallet.last_transaction_date ? new Date(wallet.last_transaction_date).toLocaleDateString() : 'No activity'}</td>
                    <td><button className="btn btn-blue btn-sm" onClick={() => setDepositTarget(wallet)}>Deposit Funds</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center" style={{ padding: 16 }}>
            <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1} onClick={() => loadWallets(page - 1)}>Previous</button>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Page {pagination.page} of {pagination.pages || 1}</div>
            <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => loadWallets(page + 1)}>Next</button>
          </div>
        </div>
      </div>

      {depositTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520 }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="heading-lg">Admin Deposit Funds</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDepositTarget(null)}>Close</button>
            </div>
            <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ fontWeight: 700 }}>{depositTarget.user_name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{depositTarget.email}</div>
              <div style={{ marginTop: 8 }}>Current balance: <strong>{formatCurrency(depositTarget.balance)}</strong></div>
            </div>
            <div className="grid-dashboard cols-2 mb-3">
              <input className="form-input" value={depositForm.amount} onChange={(event) => setDepositForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" />
              <select className="form-input" value={depositForm.payment_method} onChange={(event) => setDepositForm((current) => ({ ...current, payment_method: event.target.value }))}>
                {['Bank Transfer', 'Cash', 'Cheque', 'Card', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </div>
            <input className="form-input mb-3" value={depositForm.admin_note} onChange={(event) => setDepositForm((current) => ({ ...current, admin_note: event.target.value }))} placeholder="Admin reference / note" />
            <label className="flex items-center gap-2 mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={depositForm.email_receipt} onChange={(event) => setDepositForm((current) => ({ ...current, email_receipt: event.target.checked }))} />
              Send email receipt
            </label>
            <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>
              {formatCurrency(Number(depositForm.amount || 0))} will be added to {depositTarget.user_name}'s wallet.
            </div>
            <button className="btn btn-blue btn-full" onClick={handleDeposit} disabled={submitting}>{submitting ? 'Processing payment...' : 'Confirm Deposit'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
