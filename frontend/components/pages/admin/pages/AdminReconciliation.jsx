import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import { reconciliationAlerts } from '../../../data/mockData';

export default function AdminReconciliation() {
  const [running, setRunning] = useState(false);
  const [runDone, setRunDone] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => { setRunning(false); setRunDone(true); }, 2200);
  };

  const mismatches = reconciliationAlerts.filter(a => a.status === 'mismatch');
  const matched = reconciliationAlerts.filter(a => a.status === 'matched');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reconciliation</h1>
          <p className="page-subtitle">Compare processor records with platform ledger.</p>
        </div>
        <button className="btn btn-blue btn-sm" onClick={handleRun} disabled={running} style={{gap: 8}}>
          <Play size={14} /> {running ? 'Running...' : runDone ? 'Run Again' : 'Run Reconciliation'}
        </button>
      </div>

      {runDone && (
        <div style={{background: 'var(--success-dim)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--r-lg)', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)'}}>
          <CheckCircle2 size={18} /> Reconciliation complete. 2 mismatches detected out of 4 records.
        </div>
      )}

      {/* Summary */}
      <div className="grid-dashboard cols-4 mb-5">
        {[
          { label: 'Total Compared', val: reconciliationAlerts.length, color: 'var(--blue)' },
          { label: 'Matched', val: matched.length, color: 'var(--success)' },
          { label: 'Mismatches', val: mismatches.length, color: 'var(--danger)' },
          { label: 'Total Variance', val: '-$250.00', color: 'var(--warning)' },
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color: s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Mismatch Alerts */}
      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Reconciliation Records</h2>
          <div className="flex gap-2">
            <span className="badge badge-danger">{mismatches.length} mismatches</span>
            <span className="badge badge-success">{matched.length} matched</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Record ID</th><th>Processor</th><th>Type</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {reconciliationAlerts.map(r => (
                <tr key={r.id}>
                  <td style={{fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{r.id}</td>
                  <td style={{fontWeight: 600}}>{r.processor}</td>
                  <td><span className="badge badge-muted">{r.type}</span></td>
                  <td>{r.expected}</td>
                  <td>{r.actual}</td>
                  <td style={{fontWeight: 700, color: r.diff === '$0.00' ? 'var(--success)' : 'var(--danger)'}}>{r.diff}</td>
                  <td style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{r.date}</td>
                  <td>
                    <span className={`badge ${r.status === 'matched' ? 'badge-success' : 'badge-danger'}`}>
                      {r.status === 'matched' ? '✓ Matched' : '⚠ Mismatch'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Processor Summary */}
      <div className="grid-dashboard cols-3">
        {['Stripe', 'ACH Bank', 'Plaid'].map((p, i) => (
          <div key={i} className={`card ${i === 0 ? 'card-gradient-danger' : ''}`} style={{padding: 20}}>
            <div style={{fontWeight: 700, marginBottom: 12}}>{p}</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <div className="flex justify-between"><span style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>Records</span><span>{i === 2 ? 1 : 2}</span></div>
              <div className="flex justify-between"><span style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>Matched</span><span style={{color: 'var(--success)'}}>{i === 1 ? 2 : 1}</span></div>
              <div className="flex justify-between"><span style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>Variance</span><span style={{color: i === 1 ? 'var(--success)' : 'var(--danger)'}}>{i === 1 ? '$0.00' : i === 0 ? '-$50' : '-$200'}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
