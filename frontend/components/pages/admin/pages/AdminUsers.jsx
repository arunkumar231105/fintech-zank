import React, { useState } from 'react';
import { Search, Filter, UserCheck, UserX, Snowflake, Eye, Plus } from 'lucide-react';
import { adminUsers } from '../../../data/mockData';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});

  const filtered = adminUsers.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchKyc = kycFilter === 'All' || u.kyc === kycFilter;
    const matchStatus = statusFilter === 'All' || (userStatuses[u.id] || u.status) === statusFilter;
    return matchSearch && matchKyc && matchStatus;
  });

  const updateStatus = (id, st) => setUserStatuses(prev => ({...prev, [id]: st}));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">View, verify, and control all platform user accounts.</p>
        </div>
        <div className="flex gap-3">
          <span className="badge badge-blue badge-lg">{adminUsers.length} users</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="header-search-wrap" style={{flex: 1, maxWidth: 360}}>
            <Search size={15} color="var(--text-muted)" />
            <input className="header-search-input" placeholder="Search by name, ID, or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{width: 'auto', padding: '7px 14px', fontSize: '0.8125rem'}} value={kycFilter} onChange={e => setKycFilter(e.target.value)}>
            {['All', 'verified', 'pending', 'rejected', 'in-review'].map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <select className="form-input" style={{width: 'auto', padding: '7px 14px', fontSize: '0.8125rem'}} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {['All', 'active', 'frozen', 'inactive'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>ID</th><th>Balance</th><th>KYC</th><th>Status</th><th>Risk</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const status = userStatuses[u.id] || u.status;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm">{u.name[0]}</div>
                        <div>
                          <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{u.name}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{u.id}</td>
                    <td style={{fontWeight: 700}}>${u.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td>
                      <span className={`badge ${u.kyc === 'verified' ? 'badge-success' : u.kyc === 'pending' ? 'badge-warning' : u.kyc === 'in-review' ? 'badge-blue' : 'badge-danger'}`}>
                        {u.kyc}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${status === 'active' ? 'badge-success' : status === 'frozen' ? 'badge-danger' : 'badge-muted'}`}>
                        {status === 'frozen' ? '🔒 ' : ''}{status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.risk === 'high' ? 'badge-danger' : u.risk === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                        {u.risk}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(u)} title="View profile"><Eye size={14} /></button>
                        {status !== 'frozen' ? (
                          <button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}} onClick={() => updateStatus(u.id, 'frozen')} title="Freeze account">
                            <Snowflake size={14} />
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" style={{color: 'var(--success)'}} onClick={() => updateStatus(u.id, 'active')} title="Unfreeze account">
                            <UserCheck size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Panel */}
      {selectedUser && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200}}>
          <div className="card" style={{width: '100%', maxWidth: 520, borderRadius: 'var(--r-xl)', padding: 32, maxHeight: '90vh', overflowY: 'auto'}}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="heading-lg">User Profile</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="avatar avatar-lg">{selectedUser.name[0]}</div>
              <div>
                <div style={{fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700}}>{selectedUser.name}</div>
                <div style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>{selectedUser.email}</div>
                <div className="flex gap-2 mt-2">
                  <span className={`badge ${selectedUser.kyc === 'verified' ? 'badge-success' : 'badge-warning'}`}>{selectedUser.kyc}</span>
                  <span className={`badge ${(userStatuses[selectedUser.id] || selectedUser.status) === 'active' ? 'badge-primary' : 'badge-danger'}`}>
                    {userStatuses[selectedUser.id] || selectedUser.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid-dashboard cols-2" style={{gap: 12, marginBottom: 20}}>
              {[['User ID', selectedUser.id], ['Balance', `$${selectedUser.balance.toLocaleString()}`], ['Country', selectedUser.country], ['Joined', selectedUser.joined], ['Transactions', selectedUser.txCount], ['Risk Level', selectedUser.risk]].map(([k, v]) => (
                <div key={k} style={{background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', padding: '12px 14px'}}>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4}}>{k}</div>
                  <div style={{fontWeight: 600}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom: 20}}>
              <div style={{fontWeight: 600, marginBottom: 8}}>Admin Deposit</div>
              <div className="flex gap-2">
                <input className="form-input" type="number" placeholder="Amount (USD)" style={{flex: 1}} />
                <button className="btn btn-primary" style={{whiteSpace: 'nowrap'}}>Deposit</button>
              </div>
            </div>
            <div className="grid-dashboard cols-2" style={{gap: 10}}>
              {[
                { label: '✅ Activate', color: 'var(--success)', fn: () => updateStatus(selectedUser.id, 'active') },
                { label: '⛔ Deactivate', color: 'var(--warning)', fn: () => updateStatus(selectedUser.id, 'inactive') },
                { label: '🔒 Freeze', color: 'var(--danger)', fn: () => updateStatus(selectedUser.id, 'frozen') },
                { label: '🔓 Unfreeze', color: 'var(--primary)', fn: () => updateStatus(selectedUser.id, 'active') },
              ].map((b, i) => (
                <button key={i} className="btn btn-outline btn-sm" style={{color: b.color, borderColor: `${b.color}40`}} onClick={() => { b.fn(); setSelectedUser(null); }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
