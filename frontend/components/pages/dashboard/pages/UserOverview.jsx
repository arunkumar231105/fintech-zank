import React from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Landmark, Send, Wallet2, PieChart, PiggyBank, Gift } from 'lucide-react';
import { useAppData } from '../../../../src/context/AppDataContext';
import { formatCurrency, formatDateTime } from '../../../../src/utils/dashboard';

const actionLinks = [
  { href: '/user/wallet', label: 'Withdraw', icon: ArrowUpRight, color: 'var(--warning)' },
  { href: '/user/wallet', label: 'Send', icon: Send, color: 'var(--primary)' },
  { href: '/user/wallet', label: 'Request', icon: Wallet2, color: 'var(--blue)' },
  { href: '/user/settings', label: 'Link Account', icon: Landmark, color: 'var(--lavender)' },
];

function QuickAction({ href, label, icon: Icon, color }) {
  return (
    <Link href={href} style={{ textAlign: 'center', cursor: 'pointer', textDecoration: 'none' }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--r-lg)',
          background: `${color}18`,
          border: `1px solid ${color}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 8px',
        }}
      >
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
    </Link>
  );
}

export default function UserOverview() {
  const { user, wallet, linkedAccounts, analyticsOverview, healthScore, savingsSummary, rewards } = useAppData();

  if (!wallet) {
    return (
      <div className="card" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading wallet overview...
      </div>
    );
  }

  const recentTransactions = wallet.recentTransactions || [];
  const overviewChart = analyticsOverview?.miniChart || [];
  const overviewChartMax = Math.max(1, ...overviewChart.map((entry) => Math.max(entry.income || 0, entry.expenses || 0, 1)));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.firstName || 'there'}</h1>
          <p className="page-subtitle">Your live wallet summary and account activity.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/user/settings" className="btn btn-outline btn-sm">Profile</Link>
          <Link href="/user/wallet" className="btn btn-primary btn-sm"><ArrowUpRight size={14} /> Withdraw</Link>
        </div>
      </div>

      <div className="grid-dashboard cols-4 mb-4">
        <div className="card card-gradient-primary" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Total Balance</div>
          <div className="grad-text-primary" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: 4 }}>
            {formatCurrency(wallet.totalBalance, wallet.currency)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Wallet ID: {wallet.walletId || 'Pending'}</div>
        </div>

        <div className="card stat-card card-hover">
          <div className="stat-label">Available</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(wallet.availableBalance, wallet.currency)}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Ready to spend or transfer</div>
        </div>

        <div className="card stat-card card-hover">
          <div className="stat-label">Today's Spend</div>
          <div className="stat-value">{formatCurrency(wallet.todaySpend, wallet.currency)}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Tracked from real wallet activity</div>
        </div>

        <div className="card stat-card card-hover">
          <div className="stat-label">Month Spend</div>
          <div className="stat-value">{formatCurrency(wallet.monthSpend, wallet.currency)}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Current calendar month</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Quick Actions</h2>
          <span className="badge badge-primary">{linkedAccounts.length} linked account{linkedAccounts.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          {actionLinks.map((item) => (
            <QuickAction key={item.label} {...item} />
          ))}
        </div>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <h2 className="heading-md">Recent Wallet Activity</h2>
            <Link href="/user/transactions" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {recentTransactions.length === 0 ? (
            <div style={{ padding: '24px 0', color: 'var(--text-muted)' }}>
              No transactions yet. Ask an admin to fund your wallet or receive money from another user.
            </div>
          ) : (
            recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="tx-row">
                <div className={`tx-icon-wrap ${transaction.type === 'credit' ? 'tx-icon-credit' : 'tx-icon-debit'}`}>
                  {transaction.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="tx-meta">
                  <div className="tx-name">{transaction.merchant}</div>
                  <div className="tx-date">{formatDateTime(transaction.date)} · {transaction.category}</div>
                </div>
                <div className="tx-amount-col">
                  <div className={`tx-amount ${transaction.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount), wallet.currency)}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <span className={`badge ${transaction.status === 'completed' ? 'badge-success' : transaction.status === 'pending' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.625rem' }}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Account Snapshot</h2>
            <span className={`badge ${wallet.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{wallet.status}</span>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Linked bank accounts</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{linkedAccounts.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Held balance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(wallet.heldBalance, wallet.currency)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Primary bank</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{wallet.bankName || 'Zank Bank'}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Wallet2 size={16} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>Zero-balance support</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {wallet.totalBalance > 0
                  ? 'Your wallet is funded and ready for transfers.'
                  : 'Your wallet is empty. Admin funding or an incoming transfer will appear here.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <PieChart size={18} color="var(--primary)" />
              <h2 className="heading-md">Analytics Overview</h2>
            </div>
            <Link href="/user/analytics" className="btn btn-ghost btn-sm">View analytics</Link>
          </div>
          <div className="grid-dashboard cols-2 mb-4">
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Income</div>
              <div style={{ fontWeight: 700 }}>{formatCurrency(analyticsOverview?.totalIncome || 0, wallet.currency)}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Expenses</div>
              <div style={{ fontWeight: 700 }}>{formatCurrency(analyticsOverview?.totalExpenses || 0, wallet.currency)}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Active goals</div>
              <div style={{ fontWeight: 700 }}>{analyticsOverview?.activeSavingsGoals ?? savingsSummary.active_goals ?? 0}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Budget adherence</div>
              <div style={{ fontWeight: 700 }}>{Math.round(analyticsOverview?.budgetAdherence || 0)}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 12 }}>
            {overviewChart.slice(-7).map((point) => (
              <div key={point.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: 100 }}>
                  <div style={{ width: 8, height: `${Math.max(((point.income || 0) / overviewChartMax) * 100, 8)}%`, background: 'var(--primary)', borderRadius: '999px 999px 0 0' }} />
                  <div style={{ width: 8, height: `${Math.max(((point.expenses || 0) / overviewChartMax) * 100, 8)}%`, background: 'var(--danger)', borderRadius: '999px 999px 0 0' }} />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>{point.label}</div>
              </div>
            ))}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Top category: {analyticsOverview?.topCategory?.name || 'Not enough data'} {analyticsOverview?.topCategory ? `(${formatCurrency(analyticsOverview.topCategory.value, wallet.currency)})` : ''}
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} color="var(--success)" />
              <h2 className="heading-md">Financial Health Score</h2>
            </div>
            <span className={`badge ${healthScore?.score >= 71 ? 'badge-success' : healthScore?.score >= 41 ? 'badge-warning' : 'badge-danger'}`}>{healthScore?.score || 0}/100</span>
          </div>
          <div className="grid-dashboard cols-2 mb-4">
            <div>
              <div style={{ width: 130, height: 130, margin: '0 auto', borderRadius: '50%', border: '10px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 0 0 10px ${healthScore?.score >= 71 ? 'rgba(34,197,94,0.12)' : healthScore?.score >= 41 ? 'rgba(245,158,11,0.12)' : 'rgba(248,113,113,0.12)'}` }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 }}>{healthScore?.score || 0}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{healthScore?.label || 'Unavailable'}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Savings', healthScore?.breakdown?.savings_rate || 0, 30],
                ['Budget', healthScore?.breakdown?.budget_adherence || 0, 25],
                ['Activity', healthScore?.breakdown?.transaction_activity || 0, 20],
                ['Balance', healthScore?.breakdown?.wallet_balance || 0, 25],
              ].map(([label, value, total]) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{label}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{Number(value).toFixed(1)}/{total}</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${Math.min((Number(value) / Number(total)) * 100, 100)}%`, background: healthScore?.score >= 71 ? 'var(--success)' : healthScore?.score >= 41 ? 'var(--warning)' : 'var(--danger)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {healthScore?.tips?.[0] || 'Refresh analytics after more transactions to see personalized tips.'}
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Gift size={18} color="var(--warning)" />
              <h2 className="heading-md">Rewards Overview</h2>
            </div>
            <Link href="/user/rewards" className="btn btn-ghost btn-sm">View offers</Link>
          </div>
          <div className="grid-dashboard cols-2 mb-4">
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Points</div>
              <div style={{ fontWeight: 700 }}>{rewards?.totalPoints || 0}</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Streak</div>
              <div style={{ fontWeight: 700 }}>{rewards?.streakDays || 0} days</div>
            </div>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Next reward unlock</div>
            <div style={{ fontWeight: 700 }}>{rewards?.nextUnlock || 0} pts remaining</div>
            <div className="progress-bar-wrap mt-3">
              <div className="progress-bar-fill" style={{ width: `${rewards?.nextTierPoints ? Math.min((rewards.totalPoints / rewards.nextTierPoints) * 100, 100) : 0}%`, background: 'var(--grad-primary)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
