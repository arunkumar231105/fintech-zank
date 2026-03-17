import React from 'react';
import { TrendingUp, Building2, Activity } from 'lucide-react';
import { adminUsers } from '../../../data/mockData';

const wallets = adminUsers.map(u => ({
  userId: u.id,
  name: u.name,
  balance: u.balance,
  held: (u.balance * 0.18).toFixed(2),
  currency: 'USD',
  status: u.status,
  kyc: u.kyc,
}));

export default function AdminWallets() {
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const totalHeld = wallets.reduce((s, w) => s + Number(w.held), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Wallets</h1>
          <p className="page-subtitle">View and manage all user wallet balances and health.</p>
        </div>
        <button className="btn btn-blue btn-sm">Liquidity Report</button>
      </div>

      {/* Summary */}
      <div className="grid-dashboard cols-3 mb-5">
        <div className="card card-gradient-blue" style={{padding: 24}}>
          <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8}}>Platform AUM</div>
          <div style={{fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)'}}>${totalBalance.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
        </div>
        <div className="card" style={{padding: 24}}>
          <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8}}>Total Held Funds</div>
          <div style={{fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--warning)'}}>${totalHeld.toFixed(0)}</div>
        </div>
        <div className="card" style={{padding: 24}}>
          <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8}}>Avg Wallet Balance</div>
          <div style={{fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700}}>${(totalBalance / wallets.length).toFixed(0)}</div>
        </div>
      </div>

      {/* Fund Allocation */}
      <div className="grid-dashboard" style={{gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 20}}>
        <div className="card">
          <h2 className="heading-md mb-4">Balance Distribution</h2>
          {[
            { label: 'Available (82%)', val: 82, color: 'var(--primary)' },
            { label: 'Held (18%)', val: 18, color: 'var(--warning)' },
          ].map((d, i) => (
            <div key={i} style={{marginBottom: 16}}>
              <div className="flex justify-between mb-2" style={{fontSize: '0.875rem'}}>
                <span style={{color: 'var(--text-muted)'}}>{d.label}</span>
                <span style={{fontWeight: 700, color: d.color}}>{d.val}%</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{width: `${d.val}%`, background: d.color}} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-4" style={{fontSize: '0.8125rem', color: 'var(--primary)'}}>
            <Building2 size={14} /> FDIC Insured up to $250K per user
          </div>
        </div>

        <div className="card">
          <h2 className="heading-md mb-4">Platform Reserve Balance</h2>
          <div style={{height: 140, display: 'flex', alignItems: 'flex-end', gap: 10}}>
            {[28, 32, 29, 38, 42, 44, 45].map((v, i) => (
              <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
                <div style={{width: '100%', background: 'var(--grad-purple)', borderRadius: '4px 4px 0 0', height: `${(v/50)*130}px`, opacity: 0.72}} />
                <div style={{fontSize: '0.6875rem', color: 'var(--text-muted)'}}>{['Sep','Oct','Nov','Dec','Jan','Feb','Mar'][i]}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop: 12, fontSize: '0.8125rem', color: 'var(--text-muted)'}}>AUM in millions USD</div>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="card p-0">
        <div style={{padding: '20px 20px 0'}}>
          <h2 className="heading-md">User Wallets</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Wallet ID</th><th>Balance</th><th>Held</th><th>Currency</th><th>Status</th><th>KYC</th></tr>
            </thead>
            <tbody>
              {wallets.map((w, i) => (
                <tr key={i}>
                  <td style={{fontWeight: 600, fontSize: '0.875rem'}}>{w.name}</td>
                  <td style={{fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{w.userId}</td>
                  <td style={{fontWeight: 700}}>${w.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  <td style={{color: 'var(--warning)'}}>${w.held}</td>
                  <td><span className="badge badge-muted">{w.currency}</span></td>
                  <td><span className={`badge ${w.status === 'active' ? 'badge-success' : w.status === 'frozen' ? 'badge-danger' : 'badge-muted'}`}>{w.status}</span></td>
                  <td><span className={`badge ${w.kyc === 'verified' ? 'badge-success' : w.kyc === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{w.kyc}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
