'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { adminReconciliationService } from '../../../../src/services/adminReconciliationService';
import { formatCurrency } from '../../../../src/utils/dashboard';

const jobs = [
  { value: 'bank_settlement', label: 'Run Bank Settlement' },
  { value: 'ach_file', label: 'Run ACH' },
  { value: 'card_processor', label: 'Run Card Processor' },
];

export default function AdminReconciliation() {
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [filters, setFilters] = useState({ job_type: '', status: '', from_date: '', to_date: '' });
  const [runningJob, setRunningJob] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    try {
      const [reportsResponse, alertsResponse] = await Promise.all([
        adminReconciliationService.getReports({ ...filters, limit: 50, offset: 0 }),
        adminReconciliationService.getAlerts({ resolved: false, limit: 50, offset: 0 }),
      ]);
      setReports(reportsResponse.items || []);
      setAlerts(alertsResponse.items || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.job_type, filters.status, filters.from_date, filters.to_date]);

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    const todaysReports = reports.filter((report) => report.created_at && new Date(report.created_at).toDateString() === today);
    const passed = reports.filter((report) => report.status === 'passed').length;
    const failed = reports.filter((report) => ['failed', 'mismatch'].includes(report.status)).length;
    return {
      today: todaysReports.length,
      passed,
      failed,
      unresolvedAlerts: alerts.filter((alert) => !alert.resolved).length,
    };
  }, [reports, alerts]);

  const runJob = async (jobType) => {
    setRunningJob(jobType);
    try {
      await adminReconciliationService.runReconciliation({ job_type: jobType });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRunningJob('');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await adminReconciliationService.resolveAlert(alertId);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reconciliation</h1>
          <p className="page-subtitle">Run reconciliation jobs, review reports, and resolve mismatch alerts.</p>
        </div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card stat-card"><div className="stat-label">Total Reports Today</div><div className="stat-value">{summary.today}</div></div>
        <div className="card stat-card"><div className="stat-label">Passed Reports</div><div className="stat-value" style={{ color: 'var(--success)' }}>{summary.passed}</div></div>
        <div className="card stat-card"><div className="stat-label">Failed / Mismatch</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.failed}</div></div>
        <div className="card stat-card"><div className="stat-label">Unresolved Alerts</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.unresolvedAlerts}</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center mb-4">
          {jobs.map((job) => (
            <button key={job.value} className="btn btn-blue btn-sm" onClick={() => runJob(job.value)} disabled={runningJob === job.value}>
              <Play size={14} /> {runningJob === job.value ? 'Running...' : job.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <select className="form-input" style={{ width: 'auto' }} value={filters.job_type} onChange={(event) => setFilters((current) => ({ ...current, job_type: event.target.value }))}>
            <option value="">All Jobs</option>
            <option value="bank_settlement">bank_settlement</option>
            <option value="ach_file">ach_file</option>
            <option value="card_processor">card_processor</option>
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All Statuses</option>
            <option value="passed">passed</option>
            <option value="failed">failed</option>
            <option value="mismatch">mismatch</option>
          </select>
          <input className="form-input" style={{ width: 160 }} type="date" value={filters.from_date} onChange={(event) => setFilters((current) => ({ ...current, from_date: event.target.value }))} />
          <input className="form-input" style={{ width: 160 }} type="date" value={filters.to_date} onChange={(event) => setFilters((current) => ({ ...current, to_date: event.target.value }))} />
        </div>
      </div>

      <div className="card mb-5">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Job Type</th><th>Status</th><th>Ledger Balance</th><th>External Balance</th><th>Difference</th><th>Created At</th></tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No reconciliation reports found.</td></tr>
              ) : reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.job_type}</td>
                  <td><span className={`badge ${report.status === 'passed' ? 'badge-success' : 'badge-danger'}`}>{report.status}</span></td>
                  <td>{formatCurrency(report.ledger_balance)}</td>
                  <td>{formatCurrency(report.external_balance)}</td>
                  <td style={{ color: Number(report.difference) === 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(report.difference)}</td>
                  <td>{report.created_at ? new Date(report.created_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="heading-md mb-4">Alerts</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Alert Type</th><th>Severity</th><th>Message</th><th>Resolved</th><th>Created At</th><th>Action</th></tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No alerts found.</td></tr>
              ) : alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.alert_type}</td>
                  <td><span className={`badge ${alert.severity === 'critical' ? 'badge-danger' : alert.severity === 'high' ? 'badge-warning' : alert.severity === 'medium' ? 'badge-blue' : 'badge-muted'}`}>{alert.severity}</span></td>
                  <td>{alert.message}</td>
                  <td>{alert.resolved ? 'Yes' : 'No'}</td>
                  <td>{alert.created_at ? new Date(alert.created_at).toLocaleString() : '-'}</td>
                  <td>{!alert.resolved && <button className="btn btn-outline btn-sm" onClick={() => resolveAlert(alert.id)}>Resolve</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
