import React from 'react';
import { FileCheck, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { adminUsers } from '../../../data/mockData';

const kycQueue = adminUsers.map(u => ({
  id: u.id, name: u.name, email: u.email, country: u.country,
  joined: u.joined, kyc: u.kyc, risk: u.risk,
  docs: u.kyc === 'verified' ? ['ID Card', 'Selfie', 'Address Proof'] : u.kyc === 'pending' ? ['ID Card'] : [],
}));

export default function AdminCompliance() {
  const pending = kycQueue.filter(u => u.kyc === 'pending').length;
  const verified = kycQueue.filter(u => u.kyc === 'verified').length;
  const rejected = kycQueue.filter(u => u.kyc === 'rejected').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance & KYC</h1>
          <p className="page-subtitle">Identity verification pipeline and compliance monitoring.</p>
        </div>
        <button className="btn btn-blue btn-sm">Download Compliance Report</button>
      </div>

      {/* Stats */}
      <div className="grid-dashboard cols-4 mb-5">
        {[
          { label: 'Pending Review', val: pending, color: 'var(--warning)', icon: <Clock size={18}/> },
          { label: 'Verified', val: verified, color: 'var(--success)', icon: <CheckCircle2 size={18}/> },
          { label: 'Rejected', val: rejected, color: 'var(--danger)', icon: <XCircle size={18}/> },
          { label: 'In Review', val: kycQueue.filter(u => u.kyc === 'in-review').length, color: 'var(--blue)', icon: <Eye size={18}/> },
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="flex justify-between items-start">
              <div className="stat-label">{s.label}</div>
              <div style={{color: s.color}}>{s.icon}</div>
            </div>
            <div className="stat-value" style={{color: s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Verification Pipeline */}
      <div className="card mb-5">
        <h2 className="heading-md mb-4">Verification Pipeline</h2>
        <div className="progress-bar-wrap mb-2" style={{height: 16, borderRadius: 8}}>
          <div style={{display: 'flex', height: '100%', borderRadius: 8, overflow: 'hidden'}}>
            <div style={{width: `${(verified/kycQueue.length)*100}%`, background: 'var(--success)', transition: 'width 1s'}} />
            <div style={{width: `${(pending/kycQueue.length)*100}%`, background: 'var(--warning)', transition: 'width 1s'}} />
            <div style={{width: `${(rejected/kycQueue.length)*100}%`, background: 'var(--danger)', transition: 'width 1s'}} />
          </div>
        </div>
        <div className="flex gap-4 mt-2">
          {[['Verified', 'var(--success)', verified], ['Pending', 'var(--warning)', pending], ['Rejected', 'var(--danger)', rejected]].map(([l, c, v]) => (
            <div key={l} className="flex items-center gap-2" style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>
              <div style={{width: 10, height: 10, borderRadius: 2, background: c}} />{l}: {v}
            </div>
          ))}
        </div>
      </div>

      {/* KYC Table */}
      <div className="card mb-5 p-0">
        <div style={{padding: '20px 20px 0'}}>
          <h2 className="heading-md">KYC Review Queue</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Country</th><th>KYC Status</th><th>Documents</th><th>Risk</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {kycQueue.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm">{u.name[0]}</div>
                      <div>
                        <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{u.name}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{fontSize: '0.875rem'}}>{u.country}</td>
                  <td><span className={`badge ${u.kyc === 'verified' ? 'badge-success' : u.kyc === 'pending' ? 'badge-warning' : u.kyc === 'in-review' ? 'badge-blue' : 'badge-danger'}`}>{u.kyc}</span></td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{u.docs.join(', ') || 'No docs uploaded'}</td>
                  <td><span className={`badge ${u.risk === 'high' ? 'badge-danger' : u.risk === 'medium' ? 'badge-warning' : 'badge-success'}`}>{u.risk}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {(u.kyc === 'pending' || u.kyc === 'in-review') && (
                        <>
                          <button className="btn btn-primary btn-sm">Approve</button>
                          <button className="btn btn-danger btn-sm">Reject</button>
                        </>
                      )}
                      {u.kyc !== 'pending' && u.kyc !== 'in-review' && <span style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>No action</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Metrics */}
      <div className="grid-dashboard cols-3">
        {[
          { label: 'KYC Pass Rate', val: '71%', note: 'vs 65% industry avg', color: 'var(--success)' },
          { label: 'Avg Review Time', val: '4.2 hrs', note: 'per application', color: 'var(--blue)' },
          { label: 'Sanctions Checked', val: '100%', note: 'of all applicants', color: 'var(--primary)' },
        ].map((m, i) => (
          <div key={i} className="card">
            <div className="stat-label">{m.label}</div>
            <div style={{fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: m.color, margin: '8px 0'}}>{m.val}</div>
            <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{m.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
