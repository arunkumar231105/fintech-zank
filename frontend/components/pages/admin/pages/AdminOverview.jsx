'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, FileCheck, HelpCircle, ShieldAlert, Wallet } from 'lucide-react';
import { adminOverviewService } from '../../../../src/services/adminOverviewService';
import { formatCurrency, formatDateTime } from '../../../../src/utils/dashboard';

function KpiCard({ label, value, tone }) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: tone }}>{value}</div>
    </div>
  );
}

export default function AdminOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminOverviewService.getOverview()
      .then((data) => {
        if (active) {
          setOverview(data);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="card" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading overview...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">Live platform KPIs, growth, revenue, health, and action queues.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/compliance-kyc" className="btn btn-outline btn-sm">Review KYC</Link>
          <Link href="/admin/user-support" className="btn btn-blue btn-sm">Manage Tickets</Link>
        </div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard mb-5" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <KpiCard label="Total Users" value={overview?.kpis?.total_users || 0} tone="var(--primary)" />
        <KpiCard label="Active Users" value={overview?.kpis?.active_users || 0} tone="var(--success)" />
        <KpiCard label="Total AUM" value={formatCurrency(overview?.kpis?.total_aum || 0)} tone="var(--blue)" />
        <KpiCard label="Total Transactions" value={overview?.kpis?.total_transactions || 0} tone="var(--lavender)" />
      </div>

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card">
          <div className="stat-label">New Users This Week</div>
          <div className="stat-value">{overview?.growth?.new_users_this_week || 0}</div>
        </div>
        <div className="card">
          <div className="stat-label">Revenue This Month</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(overview?.revenue?.revenue_this_month || 0)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Avg Transaction Value</div>
          <div className="stat-value">{formatCurrency(overview?.revenue?.average_transaction_value || 0)}</div>
        </div>
        <div className="card">
          <div className="stat-label">API Response Time</div>
          <div className="stat-value">{overview?.platform_health?.api_response_time_ms || 0}ms</div>
        </div>
      </div>

      <div className="grid-dashboard mb-5" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Quick Stats</h2>
            <span className="badge badge-success">{overview?.platform_health?.system_uptime || 'n/a'} uptime</span>
          </div>
          <div className="grid-dashboard cols-2">
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div className="flex items-center gap-2 mb-2"><FileCheck size={16} color="var(--warning)" /> Pending KYC</div>
              <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{overview?.quick_stats?.pending_kyc || 0}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div className="flex items-center gap-2 mb-2"><HelpCircle size={16} color="var(--blue)" /> Open Tickets</div>
              <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{overview?.quick_stats?.open_support_tickets || 0}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div className="flex items-center gap-2 mb-2"><ShieldAlert size={16} color="var(--danger)" /> Active Risk Flags</div>
              <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{overview?.quick_stats?.active_risk_flags || 0}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div className="flex items-center gap-2 mb-2"><Activity size={16} color="var(--success)" /> Reconciliation</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{overview?.quick_stats?.reconciliation_status || 'n/a'}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="heading-md mb-4">Quick Actions</h2>
          <div className="grid-dashboard cols-2" style={{ gap: 10 }}>
            <Link href="/admin/platform-wallets" className="btn btn-blue btn-sm">Add Deposit</Link>
            <Link href="/admin/manage-users" className="btn btn-outline btn-sm">Freeze User</Link>
            <Link href="/admin/compliance-kyc" className="btn btn-outline btn-sm">Review KYC</Link>
            <Link href="/admin/user-support" className="btn btn-outline btn-sm">Resolve Ticket</Link>
            <Link href="/admin/reconciliation" className="btn btn-outline btn-sm">Run Reconciliation</Link>
            <Link href="/admin/audit-logs" className="btn btn-outline btn-sm">View Audit Logs</Link>
          </div>
        </div>
      </div>

      <div className="grid-dashboard mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">User Growth</h2>
            <span className="badge badge-muted">Last 30 days</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={overview?.charts?.user_growth || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Transaction Volume</h2>
            <span className="badge badge-muted">{overview?.growth?.volume_change_pct || 0}% vs last month</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={overview?.charts?.transaction_volume || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#34d399" radius={[6, 6, 0, 0]} />
                <Bar dataKey="amount" fill="#818cf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-dashboard mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Revenue Trend</h2>
            <span className="badge badge-success">{formatCurrency(overview?.revenue?.total_fees_collected || 0)} total</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={overview?.charts?.revenue_trend || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="rgba(245,158,11,0.25)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">AUM Trend</h2>
            <span className="badge badge-blue"><Wallet size={12} /> {formatCurrency(overview?.kpis?.total_aum || 0)}</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={overview?.charts?.aum_trend || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="aum" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Recent Registrations</h2>
            <Link href="/admin/manage-users" className="btn btn-ghost btn-sm">View users</Link>
          </div>
          {(overview?.recent_registrations || []).slice(0, 8).map((user) => (
            <div key={user.id} className="tx-row">
              <div className="tx-meta">
                <div className="tx-name">{user.name}</div>
                <div className="tx-date">{user.email}</div>
              </div>
              <div className="tx-amount-col">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(user.joined_date)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Recent Activity</h2>
            <Link href="/admin/audit-logs" className="btn btn-ghost btn-sm">Audit trail</Link>
          </div>
          {(overview?.recent_activity || []).slice(0, 10).map((item) => (
            <div key={item.id} className="tx-row">
              <div className="tx-meta">
                <div className="tx-name">{item.title}</div>
                <div className="tx-date">{item.subtitle}</div>
              </div>
              <div className="tx-amount-col">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(item.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
