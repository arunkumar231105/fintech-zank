import React, { useState } from 'react';
import { Search, Download, Eye, AlertTriangle } from 'lucide-react';
import { transactions, adminUsers } from '../../../data/mockData';

// Enriched transactions with user context
const allTxns = [...transactions, ...transactions.map((t, i) => ({...t, id: t.id + '-2', merchant: adminUsers[i % adminUsers.length].name, category: 'Transfer'}))].slice(0, 20);

export default function AdminTransactions() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = allTxns.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = t.merchant.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchStatus = status === 'All' || t.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Transactions</h1>
          <p className="page-subtitle">Platform-wide transaction monitoring and management.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline btn-sm"><Download size={14}/> Export</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-dashboard cols-4 mb-4">
        {[
          {label: 'Total Volume', val: '$1.24M', color: 'var(--blue)'},
          {label: 'Completed', val: '18,492', color: 'var(--success)'},
          {label: 'Pending Review', val: '124', color: 'var(--warning)'},
          {label: 'Failed (24h)', val: '38', color: 'var(--danger)'},
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color: s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="header-search-wrap" style={{flex: 1, maxWidth: 360}}>
            <Search size={15} color="var(--text-muted)" />
            <input className="header-search-input" placeholder="Search TX ID, merchant, user..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['All', 'completed', 'pending', 'failed'].map(s => (
              <button key={s} className={`seg-tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)} style={{textTransform: 'capitalize'}}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Transaction</th><th>Type</th><th>Amount</th><th>Date</th><th>Status</th><th>Risk</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} style={{cursor: 'pointer'}} onClick={() => setSelected(tx)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`tx-icon-wrap ${tx.type === 'credit' ? 'tx-icon-credit' : 'tx-icon-debit'}`} style={{width: 32, height: 32, fontSize: '0.85rem'}}>{tx.icon}</div>
                      <div>
                        <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{tx.merchant}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{tx.id}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${tx.type === 'credit' ? 'badge-success' : 'badge-muted'}`}>{tx.type}</span></td>
                  <td style={{fontWeight: 700, color: tx.type === 'credit' ? 'var(--success)' : 'var(--text-main)'}}>
                    {tx.type === 'credit' ? '+' : ''}{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{tx.date}</td>
                  <td><span className={`badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{tx.status}</span></td>
                  <td>
                    {Math.abs(tx.amount) > 1000 ? <span className="badge badge-warning" style={{gap: 4}}><AlertTriangle size={10}/> Review</span> : <span className="badge badge-muted">Low</span>}
                  </td>
                  <td><Eye size={14} color="var(--text-muted)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200}}>
          <div className="card" style={{width: '100%', maxWidth: 400, borderRadius: 'var(--r-xl)', padding: 32}}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="heading-lg">Transaction Detail</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{textAlign: 'center', marginBottom: 24}}>
              <div style={{fontSize: 40, marginBottom: 8}}>{selected.icon}</div>
              <div style={{fontSize: '2rem', fontWeight: 800, color: selected.type === 'credit' ? 'var(--success)' : 'var(--text-main)'}}>
                ${Math.abs(selected.amount).toFixed(2)}
              </div>
              <div style={{color: 'var(--text-muted)'}}>{selected.merchant}</div>
            </div>
            {[['ID', selected.id], ['Date', selected.date], ['Status', selected.status], ['Category', selected.category], ['Type', selected.type]].map(([k, v]) => (
              <div key={k} className="flex justify-between" style={{padding: '10px 0', borderBottom: '1px solid var(--border-glass)'}}>
                <span style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>{k}</span>
                <span style={{fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize'}}>
                  {k === 'Status' ? <span className={`badge ${v === 'completed' ? 'badge-success' : v === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{v}</span> : v}
                </span>
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button className="btn btn-outline flex-1">Flag for Review</button>
              <button className="btn btn-danger flex-1">Reverse TX</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
