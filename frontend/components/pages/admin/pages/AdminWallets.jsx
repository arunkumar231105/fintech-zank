'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { adminService } from '../../../../src/services/adminService';
import { ledgerService } from '../../../../src/services/ledgerService';
import { walletService } from '../../../../src/services/walletService';
import { formatCurrency } from '../../../../src/utils/dashboard';

function downloadCsv(rows) {
  const headers = ['user', 'wallet_id', 'balance', 'held_amount', 'status', 'currency', 'created_at'];
  const csv = [headers.join(',')]
    .concat(rows.map((row) => [row.userName, row.walletId, row.balanceCached, row.heldAmount, row.status, row.currency, row.createdAt].join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `platform_wallets_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function AdminWallets() {
  const [wallets, setWallets] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHolds, setSelectedHolds] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState(null);

  const loadWallets = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const usersResponse = await adminService.getUsers({ page: nextPage, limit: 20 });
      const users = usersResponse.items || [];
      const walletResults = await Promise.all(users.map(async (user) => {
        try {
          const wallet = await walletService.getWalletForUser(user.id);
          return {
            userId: user.id,
            userName: `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim() || user.email,
            email: user.email,
            walletId: wallet.walletId,
            internalId: wallet.id,
            ledgerAccountId: wallet.ledgerAccountId || wallet.accountId,
            balanceCached: wallet.cachedBalance || wallet.totalBalance,
            heldAmount: wallet.heldBalance || 0,
            status: wallet.status,
            currency: wallet.currency,
            createdAt: wallet.createdAt,
          };
        } catch (_error) {
          return null;
        }
      }));
      setWallets(walletResults.filter(Boolean));
      setPagination(usersResponse.pagination || { page: nextPage, limit: 20, total: 0, pages: 1 });
      setPage(nextPage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets(1);
  }, []);

  const overview = useMemo(() => {
    const balances = wallets.map((wallet) => Number(wallet.balanceCached || 0));
    return {
      totalAum: balances.reduce((sum, value) => sum + value, 0),
      averageBalance: balances.length ? balances.reduce((sum, value) => sum + value, 0) / balances.length : 0,
      highestBalance: balances.length ? Math.max(...balances) : 0,
      lowestBalance: balances.length ? Math.min(...balances) : 0,
    };
  }, [wallets]);

  const toggleWalletStatus = async (wallet) => {
    try {
      await walletService.updateWalletStatus(wallet.internalId, wallet.status === 'active' ? 'frozen' : 'active');
      await loadWallets(page);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const viewHolds = async (wallet) => {
    try {
      const result = await walletService.getWalletHolds(wallet.internalId);
      setSelectedHolds({ wallet, items: result.items || [], heldAmount: result.held_amount || 0 });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const viewTransactions = async (wallet) => {
    try {
      const result = await ledgerService.queryTransactions({ account_id: wallet.ledgerAccountId, limit: 10, offset: 0 });
      setSelectedTransactions({ wallet, items: result.items || [] });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Wallets</h1>
          <p className="page-subtitle">Review wallet balances, holds, status, and related transaction activity.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => downloadCsv(wallets)}><Download size={14} /> Export CSV</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card card-gradient-blue" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total AUM</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{formatCurrency(overview.totalAum)}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Average Balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(overview.averageBalance)}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Highest Balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(overview.highestBalance)}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Lowest Balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(overview.lowestBalance)}</div>
        </div>
      </div>

      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Wallet ID</th><th>Balance</th><th>Held Amount</th><th>Status</th><th>Currency</th><th>Created At</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading wallets...</td></tr>
              ) : wallets.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No wallets found.</td></tr>
              ) : wallets.map((wallet) => (
                <tr key={wallet.walletId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{wallet.userName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{wallet.email}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{wallet.walletId}</td>
                  <td>{formatCurrency(wallet.balanceCached, wallet.currency)}</td>
                  <td>{formatCurrency(wallet.heldAmount, wallet.currency)}</td>
                  <td><span className={`badge ${wallet.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{wallet.status}</span></td>
                  <td>{wallet.currency}</td>
                  <td>{wallet.createdAt ? new Date(wallet.createdAt).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => toggleWalletStatus(wallet)}>{wallet.status === 'active' ? 'Freeze' : 'Activate'}</button>
                      <button className="btn btn-outline btn-sm" onClick={() => viewHolds(wallet)}>View Holds</button>
                      <button className="btn btn-outline btn-sm" onClick={() => viewTransactions(wallet)}>View Transactions</button>
                    </div>
                  </td>
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

      {selectedHolds && (
        <div className="card mt-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Wallet Holds · {selectedHolds.wallet.userName}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedHolds(null)}>Close</button>
          </div>
          <div style={{ marginBottom: 16, color: 'var(--text-muted)' }}>Held amount: {formatCurrency(selectedHolds.heldAmount, selectedHolds.wallet.currency)}</div>
          {(selectedHolds.items || []).length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No holds found.</div>
          ) : (
            selectedHolds.items.map((hold) => (
              <div key={hold.id} className="tx-row">
                <div className="tx-meta">
                  <div className="tx-name">{hold.reason || 'Hold'}</div>
                  <div className="tx-date">{hold.expires_at ? new Date(hold.expires_at).toLocaleString() : '-'}</div>
                </div>
                <div className="tx-amount-col">
                  <div className="tx-amount">{formatCurrency(hold.amount, selectedHolds.wallet.currency)}</div>
                  <span className="badge badge-muted">{hold.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedTransactions && (
        <div className="card mt-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Wallet Transactions · {selectedTransactions.wallet.userName}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTransactions(null)}>Close</button>
          </div>
          {(selectedTransactions.items || []).length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No transactions found.</div>
          ) : (
            selectedTransactions.items.map((transaction) => (
              <div key={transaction.id} className="tx-row">
                <div className="tx-meta">
                  <div className="tx-name">{transaction.reference_id || transaction.id}</div>
                  <div className="tx-date">{transaction.type} · {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : '-'}</div>
                </div>
                <div className="tx-amount-col">
                  <div className="tx-amount">{formatCurrency(transaction.amount, transaction.currency)}</div>
                  <span className={`badge ${transaction.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{transaction.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
