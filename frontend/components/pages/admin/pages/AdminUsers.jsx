'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Search, UserCheck, UserX, Wallet } from 'lucide-react';
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

export default function AdminUsers() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joined_date');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusForm, setStatusForm] = useState({ status: 'active', reason: '' });
  const [balanceForm, setBalanceForm] = useState({ amount: '', reason: '', adjustment_type: 'add' });
  const [depositForm, setDepositForm] = useState({ amount: '', payment_method: 'Bank Transfer', email_receipt: true, admin_note: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearch(searchInput.trim()), 500);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadUsers = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.getUsers({
        page: nextPage,
        limit: 50,
        search,
        status: statusFilter,
        kyc_status: kycFilter,
        sort_by: sortBy,
      });
      setUsers(result.items || []);
      setPagination(result.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
      setPage(nextPage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [search, statusFilter, kycFilter, sortBy]);

  const openUser = async (user) => {
    setSelectedUser(user);
    setDetail(null);
    setStatusForm({ status: user.status, reason: '' });
    setBalanceForm({ amount: '', reason: '', adjustment_type: 'add' });
    setDepositForm({ amount: '', payment_method: 'Bank Transfer', email_receipt: true, admin_note: '' });
    try {
      const result = await adminService.getUserDetail(user.id);
      setDetail(result);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleStatusUpdate = async () => {
    if (['frozen', 'deactivated'].includes(statusForm.status) && statusForm.reason.trim().length < 10) {
      setError('Reason required for freeze/deactivate.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminService.updateUserStatus(selectedUser.id, statusForm);
      setUsers((current) => current.map((user) => (user.id === selectedUser.id ? result.user : user)));
      setSelectedUser(result.user);
      setDetail((current) => current ? { ...current, user: result.user } : current);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (Number(balanceForm.amount) <= 0 || balanceForm.reason.trim().length < 10) {
      setError('Amount > 0 and reason min 10 chars required.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminService.adjustBalance(selectedUser.id, { ...balanceForm, amount: Number(balanceForm.amount) });
      setUsers((current) => current.map((user) => (user.id === selectedUser.id ? result.user : user)));
      setSelectedUser(result.user);
      const fullDetail = await adminService.getUserDetail(selectedUser.id);
      setDetail(fullDetail);
      setBalanceForm({ amount: '', reason: '', adjustment_type: 'add' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async () => {
    if (Number(depositForm.amount) <= 0) {
      setError('Deposit amount must be greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminDepositService.deposit({
        user_id: selectedUser.id,
        amount: Number(depositForm.amount),
        payment_method: depositForm.payment_method,
        email_receipt: depositForm.email_receipt,
        admin_note: depositForm.admin_note,
      });
      setUsers((current) => current.map((user) => (user.id === selectedUser.id ? result.user : user)));
      setSelectedUser(result.user);
      const fullDetail = await adminService.getUserDetail(selectedUser.id);
      setDetail(fullDetail);
      setDepositForm({ amount: '', payment_method: 'Bank Transfer', email_receipt: true, admin_note: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const exportUsers = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/admin/export/users`, {
      headers: { Authorization: `Bearer ${window.localStorage.getItem('accessToken')}` },
      credentials: 'include',
    });
    const text = await response.text();
    downloadCsv(text, `admin_users_${Date.now()}.csv`);
  };

  const summaryText = useMemo(() => {
    if (!pagination.total) {
      return 'Showing 0 users';
    }
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `Showing ${start}-${end} of ${pagination.total} users`;
  }, [pagination]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">Admin-only user search, filtering, status control, balance adjustment, and deposits.</p>
        </div>
        <div className="flex gap-3">
          <span className="badge badge-blue badge-lg">{pagination.total} users</span>
          <button className="btn btn-outline btn-sm" onClick={exportUsers}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="header-search-wrap" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={15} color="var(--text-muted)" />
            <input className="header-search-input" placeholder="Search name, email, phone, user ID..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          </div>
          <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {['all', 'active', 'frozen', 'deactivated'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={kycFilter} onChange={(event) => setKycFilter(event.target.value)}>
            {['all', 'verified', 'pending', 'rejected'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="joined_date">Joined Date</option>
            <option value="balance">Balance</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="card p-0">
        <div style={{ padding: '18px 20px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{summaryText}</div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>KYC</th><th>Wallet Balance</th><th>Joined Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</td></tr>
              ) : users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{user.id}</td>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '-'}</td>
                  <td><span className={`badge ${user.status === 'active' ? 'badge-success' : user.status === 'frozen' ? 'badge-warning' : 'badge-danger'}`}>{user.status}</span></td>
                  <td><span className={`badge ${user.kyc_status === 'verified' ? 'badge-success' : user.kyc_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{user.kyc_status}</span></td>
                  <td>{formatCurrency(user.wallet_balance)}</td>
                  <td>{new Date(user.joined_date).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => openUser(user)} title="View Details"><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: user.status === 'active' ? 'var(--warning)' : 'var(--success)' }} onClick={() => { openUser(user); setStatusForm({ status: user.status === 'active' ? 'frozen' : 'active', reason: '' }); }}>
                        {user.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue)' }} onClick={() => openUser(user)}><Wallet size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center" style={{ padding: 16 }}>
          <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1} onClick={() => loadUsers(page - 1)}>Previous</button>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Page {pagination.page} of {pagination.pages || 1}</div>
          <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => loadUsers(page + 1)}>Next</button>
        </div>
      </div>

      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="heading-lg">User Detail</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedUser(null); setDetail(null); }}>Close</button>
            </div>

            {!detail ? (
              <div style={{ color: 'var(--text-muted)' }}>Loading user detail...</div>
            ) : (
              <>
                <div className="grid-dashboard cols-3 mb-5">
                  <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>User</div>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>{detail.user.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{detail.user.email}</div>
                  </div>
                  <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Wallet Balance</div>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>{formatCurrency(detail.wallet.balance)}</div>
                  </div>
                  <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Rewards</div>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>{detail.rewards.points} pts · {detail.rewards.tier}</div>
                  </div>
                </div>

                <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="card">
                    <h3 className="heading-md mb-3">Status Change</h3>
                    <select className="form-input mb-3" value={statusForm.status} onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))}>
                      {['active', 'frozen', 'deactivated'].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <textarea className="form-input mb-3" rows={3} value={statusForm.reason} onChange={(event) => setStatusForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for freeze/deactivate" />
                    <button className="btn btn-primary btn-full" onClick={handleStatusUpdate} disabled={submitting}>{submitting ? 'Updating...' : 'Update Status'}</button>
                  </div>

                  <div className="card">
                    <h3 className="heading-md mb-3">Balance Adjustment</h3>
                    <div className="grid-dashboard cols-2 mb-3">
                      <input className="form-input" value={balanceForm.amount} onChange={(event) => setBalanceForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" />
                      <select className="form-input" value={balanceForm.adjustment_type} onChange={(event) => setBalanceForm((current) => ({ ...current, adjustment_type: event.target.value }))}>
                        <option value="add">Add</option>
                        <option value="deduct">Deduct</option>
                      </select>
                    </div>
                    <textarea className="form-input mb-3" rows={3} value={balanceForm.reason} onChange={(event) => setBalanceForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason" />
                    <button className="btn btn-outline btn-full" onClick={handleAdjustBalance} disabled={submitting}>{submitting ? 'Processing...' : 'Adjust Balance'}</button>
                  </div>

                  <div className="card">
                    <h3 className="heading-md mb-3">Admin Deposit</h3>
                    <div className="grid-dashboard cols-2 mb-3">
                      <input className="form-input" value={depositForm.amount} onChange={(event) => setDepositForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" />
                      <select className="form-input" value={depositForm.payment_method} onChange={(event) => setDepositForm((current) => ({ ...current, payment_method: event.target.value }))}>
                        {['Bank Transfer', 'Cash', 'Cheque', 'Card', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
                      </select>
                    </div>
                    <input className="form-input mb-3" value={depositForm.admin_note} onChange={(event) => setDepositForm((current) => ({ ...current, admin_note: event.target.value }))} placeholder="Reference / note" />
                    <label className="flex items-center gap-2 mb-3" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={depositForm.email_receipt} onChange={(event) => setDepositForm((current) => ({ ...current, email_receipt: event.target.checked }))} />
                      Send email receipt
                    </label>
                    <button className="btn btn-blue btn-full" onClick={handleDeposit} disabled={submitting}>{submitting ? 'Processing payment...' : 'Deposit Funds'}</button>
                  </div>

                  <div className="card">
                    <h3 className="heading-md mb-3">Snapshot</h3>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div>Linked accounts: {detail.linked_accounts.length}</div>
                      <div>Savings goals: {detail.savings_summary.count}</div>
                      <div>Cards issued: {detail.cards.length}</div>
                      <div>Support tickets: {detail.support_tickets.length}</div>
                    </div>
                  </div>
                </div>

                <div className="card mt-4">
                  <h3 className="heading-md mb-3">Recent Transactions</h3>
                  {(detail.recent_transactions || []).slice(0, 10).map((txn) => (
                    <div key={txn.id} className="tx-row">
                      <div className="tx-meta">
                        <div className="tx-name">{txn.description}</div>
                        <div className="tx-date">{new Date(txn.date).toLocaleString()}</div>
                      </div>
                      <div className="tx-amount-col">
                        <div className={`tx-amount ${txn.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>{txn.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
