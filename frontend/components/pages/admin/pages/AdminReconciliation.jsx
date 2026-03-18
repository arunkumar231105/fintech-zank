'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Play } from 'lucide-react';
import { adminReconciliationService } from '../../../../src/services/adminReconciliationService';

export default function AdminReconciliation() {
  const [records, setRecords] = useState([]);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ date: '', status: 'all', processor: 'all' });
  const [runForm, setRunForm] = useState({ start_date: '', end_date: '', processor: 'All' });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const loadRecords = async () => {
    try {
      const result = await adminReconciliationService.getReconciliation(filters);
      setRecords(result.items || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [filters]);

  const handleRun = async () => {
    if (!runForm.start_date || !runForm.end_date) {
      setError('Valid date range required.');
      return;
    }
    setRunning(true);
    setProgress(20);
    try {
      const intervalId = window.setInterval(() => {
        setProgress((current) => (current >= 90 ? current : current + 15));
      }, 250);
      const result = await adminReconciliationService.runReconciliation(runForm);
      window.clearInterval(intervalId);
      setProgress(100);
      setDetail(result);
      await loadRecords();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRunning(false);
      window.setTimeout(() => setProgress(0), 1200);
    }
  };

  const loadDetail = async (recordId) => {
    try {
      const result = await adminReconciliationService.getReconciliationDetail(recordId);
      setDetail(result);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const matchedCount = records.reduce((sum, item) => sum + (item.matched || 0), 0);
  const unmatchedCount = records.reduce((sum, item) => sum + (item.unmatched || 0), 0);
  const discrepancyCount = records.reduce((sum, item) => sum + (item.discrepancies || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reconciliation</h1>
          <p className="page-subtitle">Run processor matching, review discrepancies, and inspect reconciliation detail reports.</p>
        </div>
        <button className="btn btn-blue btn-sm" onClick={handleRun} disabled={running}><Play size={14} /> {running ? 'Running...' : 'Run Reconciliation'}</button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}
      {progress > 0 && (
        <div className="card mb-4">
          <div style={{ marginBottom: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Reconciliation progress: {progress}%</div>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'var(--grad-primary)' }} /></div>
        </div>
      )}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card stat-card"><div className="stat-label">Matched</div><div className="stat-value" style={{ color: 'var(--success)' }}>{matchedCount}</div></div>
        <div className="card stat-card"><div className="stat-label">Unmatched</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{unmatchedCount}</div></div>
        <div className="card stat-card"><div className="stat-label">Discrepancies</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{discrepancyCount}</div></div>
        <div className="card stat-card"><div className="stat-label">Runs</div><div className="stat-value">{records.length}</div></div>
      </div>

      <div className="card mb-4">
        <div className="grid-dashboard cols-3" style={{ gap: 12 }}>
          <input className="form-input" type="date" value={runForm.start_date} onChange={(event) => setRunForm((current) => ({ ...current, start_date: event.target.value }))} />
          <input className="form-input" type="date" value={runForm.end_date} onChange={(event) => setRunForm((current) => ({ ...current, end_date: event.target.value }))} />
          <select className="form-input" value={runForm.processor} onChange={(event) => setRunForm((current) => ({ ...current, processor: event.target.value }))}>
            {['All', 'Stripe', 'Razorpay', 'PayPal', 'Bank Transfer'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="card mb-5">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Date Range</th><th>Processor</th><th>Total</th><th>Matched</th><th>Unmatched</th><th>Discrepancies</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.start_date} to {record.end_date}</td>
                  <td>{record.processor}</td>
                  <td>{record.total_transactions}</td>
                  <td style={{ color: 'var(--success)' }}>{record.matched}</td>
                  <td style={{ color: 'var(--warning)' }}>{record.unmatched}</td>
                  <td style={{ color: 'var(--danger)' }}>{record.discrepancies}</td>
                  <td><span className={`badge ${record.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{record.status}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => loadDetail(record.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Reconciliation Detail</h2>
            <span className="badge badge-success"><CheckCircle2 size={12} /> {detail.status}</span>
          </div>
          <div className="grid-dashboard cols-4 mb-4">
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>Total: {detail.total_transactions}</div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>Matched: {detail.matched}</div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>Unmatched: {detail.unmatched}</div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>Discrepancies: {detail.discrepancies}</div>
          </div>

          {[
            ['Matched Transactions', detail.matched_transactions || [], 'var(--success)'],
            ['Unmatched Transactions', detail.unmatched_transactions || [], 'var(--warning)'],
            ['Extra Transactions', detail.extra_transactions || [], 'var(--danger)'],
            ['Discrepancies', detail.discrepancy_transactions || [], 'var(--warning)'],
          ].map(([label, items, color]) => (
            <div key={label} className="card mb-3" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <h3 className="heading-md mb-3" style={{ color }}>{label}</h3>
              {items.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No records.</div>
              ) : items.map((item) => (
                <div key={item.id} className="tx-row">
                  <div className="tx-meta">
                    <div className="tx-name">{item.id}</div>
                    <div className="tx-date">{item.user_name} · {item.type}</div>
                  </div>
                  <div className="tx-amount-col">{item.amount}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
