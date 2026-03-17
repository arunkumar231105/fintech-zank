import React from 'react';
import { Gift, Star, Zap, ArrowRight, Trophy } from 'lucide-react';
import { rewards } from '../../../data/mockData';

const tierColors = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: 'var(--warning)', Platinum: 'var(--blue)' };

export default function UserRewards() {
  const tierPct = Math.round((rewards.totalPoints / rewards.nextTierPoints) * 100);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards & Cashback</h1>
          <p className="page-subtitle">Earn and redeem exclusive rewards for spending smarter.</p>
        </div>
        <button className="btn btn-primary btn-sm"><Gift size={14} /> Redeem Points</button>
      </div>

      {/* Loyalty Hero Card */}
      <div className="card card-gradient-primary mb-5" style={{padding: 32, position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(42,255,196,0.08)'}} />
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={24} color={tierColors[rewards.tier]} />
              <h2 style={{fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700}} className="grad-text-primary">{rewards.tier} Member</h2>
            </div>
            <div style={{fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, marginBottom: 4}}>
              {rewards.totalPoints.toLocaleString()} <span style={{fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400}}>pts</span>
            </div>
            <div style={{fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16}}>
              {rewards.nextTierPoints - rewards.totalPoints} pts until <span style={{color: tierColors.Platinum, fontWeight: 700}}>Platinum</span>
            </div>
            <div className="progress-bar-wrap" style={{width: 300, maxWidth: '100%'}}>
              <div className="progress-bar-fill" style={{width: `${tierPct}%`, background: 'var(--grad-primary)'}} />
            </div>
          </div>
          <div className="grid-dashboard" style={{gap: 12, gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))'}}>
            <div style={{background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center'}}>
              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4}}>Cashback Earned</div>
              <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)'}}>${rewards.cashbackEarned}</div>
            </div>
            <div style={{background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center'}}>
              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4}}>Day Streak 🔥</div>
              <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)'}}>{rewards.streakDays}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-dashboard" style={{gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20}}>
        {/* Exclusive Offers */}
        <div className="card">
          <h2 className="heading-md mb-4">Exclusive Offers</h2>
          <div className="grid-dashboard cols-2" style={{gap: 12}}>
            {rewards.offers.map((o, i) => (
              <div key={i} style={{background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: 'var(--r-lg)', padding: 18, cursor: 'pointer', transition: 'var(--transition)'}}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-active)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{fontSize: '1.5rem', marginBottom: 8}}>{o.icon}</div>
                <div style={{fontWeight: 700, marginBottom: 4}}>{o.brand}</div>
                <div style={{fontSize: '1.25rem', fontWeight: 800}} className="grad-text-primary">{o.cashback}</div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10}}>cashback · Expires {o.expires}</div>
                <button className="btn btn-primary btn-sm btn-full">Activate</button>
              </div>
            ))}
          </div>
        </div>

        {/* Reward History */}
        <div className="card">
          <h2 className="heading-md mb-4">Reward History</h2>
          {rewards.history.map((r, i) => (
            <div key={i} className="tx-row">
              <div className="tx-icon-wrap tx-icon-credit">🎉</div>
              <div className="tx-meta">
                <div className="tx-name">{r.desc}</div>
                <div className="tx-date">{r.date}</div>
              </div>
              <div style={{fontWeight: 700, color: 'var(--success)'}}>+${r.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="card">
        <h2 className="heading-md mb-4">Loyalty Tiers & Benefits</h2>
        <div className="grid-dashboard cols-4">
          {[
            { tier: 'Bronze', pts: '0–999', perks: ['1% cashback', 'Virtual card'], color: '#cd7f32' },
            { tier: 'Silver', pts: '1K–4.9K', perks: ['2% cashback', 'Priority support', 'No FX fees'], color: '#bababf' },
            { tier: 'Gold', pts: '5K–9.9K', perks: ['3% cashback', '24/7 support', 'Lounge access'], color: 'var(--warning)', current: true },
            { tier: 'Platinum', pts: '10K+', perks: ['5% cashback', 'Dedicated manager', 'Concierge', 'Metal card'], color: 'var(--blue)' },
          ].map((t, i) => (
            <div key={i} style={{
              background: t.current ? 'rgba(251,191,36,0.06)' : 'var(--bg-surface)',
              border: `1px solid ${t.current ? 'rgba(251,191,36,0.2)' : 'var(--border-glass)'}`,
              borderRadius: 'var(--r-lg)', padding: 20,
            }}>
              {t.current && <div className="badge badge-warning mb-2" style={{fontSize: '0.6875rem'}}>Your Tier</div>}
              <div style={{fontWeight: 800, color: t.color, fontSize: '1.25rem', marginBottom: 4}}>{t.tier}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12}}>{t.pts} pts</div>
              <div className="flex flex-col gap-2">
                {t.perks.map((p, j) => (
                  <div key={j} className="flex items-center gap-2" style={{fontSize: '0.8125rem', color: 'var(--text-secondary)'}}>
                    <Star size={11} color={t.color} fill={t.color} /> {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
