'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Gift, Trophy } from 'lucide-react';
import { rewardsService } from '../../../../src/services/rewardsService';
import { useAppData } from '../../../../src/context/AppDataContext';
import { formatCurrency } from '../../../../src/utils/dashboard';

const tierColors = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: 'var(--warning)', Platinum: 'var(--blue)' };

function RedeemModal({ rewards, points, setPoints, onClose, onSubmit, submitting, error }) {
  const conversion = rewards?.conversionRate || { points: 100, wallet_amount: 1 };
  const walletCredit = Number(points || 0) > 0 ? (Number(points || 0) / conversion.points) * conversion.wallet_amount : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(2, 6, 23, 0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="heading-lg">Redeem Points</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>Available points</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800 }}>{rewards?.totalPoints || 0}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>{conversion.points} points = {formatCurrency(conversion.wallet_amount)}</div>
        </div>
        {error && <div className="badge badge-danger mb-4" style={{ display: 'inline-flex' }}>{error}</div>}
        <div className="form-group mb-4">
          <label className="form-label">Points to redeem</label>
          <input className="form-input" value={points} onChange={(event) => setPoints(event.target.value)} placeholder="100" />
        </div>
        <div className="card mb-5" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Wallet credit</div>
          <div style={{ fontWeight: 700 }}>{formatCurrency(walletCredit)}</div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={onSubmit} disabled={submitting}>{submitting ? 'Processing...' : 'Redeem'}</button>
        </div>
      </div>
    </div>
  );
}

export default function UserRewards() {
  const { rewards, rewardOffers, refreshRewards, activateRewardOffer, redeemRewardPoints, pushToast, loading } = useAppData();
  const [filter, setFilter] = useState('all');
  const [historyType, setHistoryType] = useState('all');
  const [history, setHistory] = useState([]);
  const [historyMeta, setHistoryMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [trend, setTrend] = useState({ this_month_points: 0, last_month_points: 0 });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = async (page = 1, type = historyType) => {
    setHistoryLoading(true);
    try {
      const result = await rewardsService.getHistory({ page, limit: 8, type });
      setHistory(result.history);
      setHistoryMeta(result.pagination);
      setTrend(result.trend);
    } catch (error) {
      pushToast({ tone: 'error', message: error.message });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    refreshRewards().catch(() => {});
    loadHistory(1, historyType);
  }, [historyType, refreshRewards]);

  const filteredOffers = useMemo(() => {
    if (filter === 'active') {
      return rewardOffers.filter((offer) => offer.active);
    }
    if (filter === 'expired') {
      return rewardOffers.filter((offer) => offer.expired);
    }
    return rewardOffers;
  }, [filter, rewardOffers]);

  const handleActivate = async (offerId) => {
    try {
      const result = await activateRewardOffer(offerId);
      pushToast({ tone: 'success', message: result.message || 'Offer activated.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message });
    }
  };

  const handleRedeem = async () => {
    const points = Number(pointsToRedeem);
    if (!points || points <= 0 || points % 100 !== 0) {
      setRedeemError('You need at least 100 points to redeem.');
      return;
    }
    if (points > Number(rewards?.totalPoints || 0)) {
      setRedeemError('Insufficient points balance.');
      return;
    }
    setSubmitting(true);
    setRedeemError('');
    try {
      const result = await redeemRewardPoints(points);
      pushToast({ tone: 'success', message: `${formatCurrency(result.amount_credited)} added to your wallet.` });
      setRedeemOpen(false);
      setPointsToRedeem('');
      await loadHistory(1, historyType);
    } catch (error) {
      setRedeemError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = rewards?.nextTierPoints ? Math.min((rewards.totalPoints / rewards.nextTierPoints) * 100, 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards & Cashback</h1>
          <p className="page-subtitle">Live points, cashback offers, and redemption directly into your wallet.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setRedeemOpen(true)}><Gift size={14} /> Redeem Points</button>
      </div>

      <div className="card card-gradient-primary mb-5" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(42,255,196,0.08)' }} />
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={24} color={tierColors[rewards?.tier || 'Bronze']} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }} className="grad-text-primary">{rewards?.tier || 'Bronze'} Member</h2>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, marginBottom: 4 }}>
              {loading.rewards ? '...' : (rewards?.totalPoints || 0).toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>pts</span>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {rewards?.nextUnlock || 0} pts until next reward tier
            </div>
            <div className="progress-bar-wrap" style={{ width: 320, maxWidth: '100%' }}>
              <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: 'var(--grad-primary)' }} />
            </div>
          </div>
          <div className="grid-dashboard" style={{ gap: 12, gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Cashback Earned</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(rewards?.cashbackEarned || 0)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Streak</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Flame size={16} />{rewards?.streakDays || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Available Offers</h2>
            <div className="flex gap-2">
              {['all', 'active', 'expired'].map((value) => (
                <button key={value} className={`seg-tab ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{value}</button>
              ))}
            </div>
          </div>
          {filteredOffers.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No active offers right now, check back soon.</div>
          ) : (
            <div className="grid-dashboard cols-2" style={{ gap: 12 }}>
              {filteredOffers.map((offer) => (
                <div key={offer.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: 'var(--r-lg)', padding: 18 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{offer.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{offer.merchant}</div>
                  <div style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{offer.title}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }} className="grad-text-primary">{offer.cashbackPercent}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Expires {new Date(offer.expiryDate).toLocaleDateString()}</div>
                  <button className={`btn btn-sm btn-full ${offer.active ? 'btn-outline' : 'btn-primary'}`} disabled={offer.active || offer.expired} onClick={() => handleActivate(offer.id)}>
                    {offer.expired ? 'Expired' : offer.active ? 'Active' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Rewards History</h2>
            <select className="form-input" value={historyType} onChange={(event) => setHistoryType(event.target.value)} style={{ width: 140 }}>
              <option value="all">All</option>
              <option value="cashback">Cashback</option>
              <option value="bonus">Bonus</option>
              <option value="redeem">Redeemed</option>
            </select>
          </div>
          <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Points this month vs last month</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{trend.this_month_points} pts / {trend.last_month_points} pts</div>
          </div>
          {historyLoading ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading rewards history...</div>
          ) : history.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Start earning rewards by making transactions.</div>
          ) : history.map((item) => (
            <div key={item.id} className="tx-row">
              <div className="tx-icon-wrap tx-icon-credit">{item.source === 'cashback' ? '💸' : item.source === 'redeem' ? '🎁' : '⭐'}</div>
              <div className="tx-meta">
                <div className="tx-name">{item.description}</div>
                <div className="tx-date">{new Date(item.date).toLocaleDateString()} · {item.source}</div>
              </div>
              <div style={{ fontWeight: 700, color: item.points >= 0 ? 'var(--success)' : 'var(--danger)' }}>{item.points >= 0 ? '+' : ''}{item.points} pts</div>
            </div>
          ))}
          {historyMeta.pages > 1 && (
            <div className="flex justify-between mt-4">
              <button className="btn btn-outline btn-sm" disabled={historyMeta.page <= 1} onClick={() => loadHistory(historyMeta.page - 1, historyType)}>Previous</button>
              <button className="btn btn-outline btn-sm" disabled={historyMeta.page >= historyMeta.pages} onClick={() => loadHistory(historyMeta.page + 1, historyType)}>Next</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="heading-md mb-4">Tier Benefits</h2>
        <div className="grid-dashboard cols-4">
          {[
            { tier: 'Bronze', pts: '0-999', perks: ['1 point per $1', 'Virtual card access'] },
            { tier: 'Silver', pts: '1K-4.9K', perks: ['2% cashback offers', 'Priority support'] },
            { tier: 'Gold', pts: '5K-9.9K', perks: ['3% cashback offers', 'Fast support queue'] },
            { tier: 'Platinum', pts: '10K+', perks: ['5% cashback offers', 'Dedicated rewards concierge'] },
          ].map((tier) => (
            <div key={tier.tier} style={{ background: rewards?.tier === tier.tier ? 'rgba(42,255,196,0.06)' : 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: 'var(--r-lg)', padding: 20 }}>
              <div style={{ fontWeight: 800, color: tierColors[tier.tier], fontSize: '1.25rem', marginBottom: 4 }}>{tier.tier}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>{tier.pts} pts</div>
              <div className="flex flex-col gap-2">
                {tier.perks.map((perk) => (
                  <div key={perk} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{perk}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {redeemOpen && (
        <RedeemModal
          rewards={rewards}
          points={pointsToRedeem}
          setPoints={setPointsToRedeem}
          onClose={() => { setRedeemOpen(false); setRedeemError(''); }}
          onSubmit={handleRedeem}
          submitting={submitting}
          error={redeemError}
        />
      )}
    </div>
  );
}
