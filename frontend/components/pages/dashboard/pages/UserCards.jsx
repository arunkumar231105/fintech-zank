'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Eye,
  Loader2,
  Plus,
  ShieldAlert,
  Snowflake,
  Trash2,
  X,
} from 'lucide-react';

import { useAppData } from '../../../../src/context/AppDataContext';
import { cardService } from '../../../../src/services/cardService';
import { formatCurrency, formatExpiry, isValidOtp, maskCardNumber } from '../../../../src/utils/dashboard';

const categoryOptions = ['groceries', 'fuel', 'online shopping', 'travel', 'entertainment', 'subscriptions'];
const cardGradients = {
  aqua: 'var(--grad-primary)',
  ember: 'var(--grad-warm)',
  violet: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
};

function CardShell({ card, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="vcard"
      style={{
        background: cardGradients[card.color] || cardGradients.aqua,
        border: active ? '2px solid rgba(255,255,255,0.45)' : '2px solid transparent',
        textAlign: 'left',
      }}
    >
      <div className="flex justify-between items-center">
        <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#07080f' }}>{card.cardName}</div>
        <div className="flex items-center gap-2">
          <span className={`badge ${card.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{card.status}</span>
          <CreditCard size={22} color="#07080f" />
        </div>
      </div>
      <div>
        <div style={{ letterSpacing: '0.2em', fontFamily: 'monospace', color: '#07080f', marginBottom: 10, fontSize: '1rem' }}>
          {maskCardNumber(card.maskedNumber)}
        </div>
        <div className="flex justify-between items-end">
          <div>
            <div style={{ fontSize: '0.625rem', opacity: 0.7, color: '#07080f' }}>CARD HOLDER</div>
            <div style={{ fontWeight: 700, color: '#07080f', fontSize: '0.8125rem' }}>{card.holder.toUpperCase()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.625rem', opacity: 0.7, color: '#07080f' }}>EXPIRES</div>
            <div style={{ fontWeight: 700, color: '#07080f', fontSize: '0.8125rem' }}>{formatExpiry(card.expiry)}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

function Modal({ open, title, onClose, children, maxWidth = 520 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 220 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="card"
            style={{ width: '100%', maxWidth, borderRadius: 'var(--r-xl)', padding: 28 }}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="heading-lg">{title}</h3>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function UserCards() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    cards,
    loading,
    refreshCards,
    createCard,
    updateCardStatus,
    updateCardLimits,
    updateCardControls,
    deleteCard,
    pushToast,
  } = useAppData();
  const [selectedCardId, setSelectedCardId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ card_name: '', daily_limit: '', monthly_limit: '' });
  const [controlsForm, setControlsForm] = useState({ allowed_categories: [], blocked_merchants: [] });
  const [merchantInput, setMerchantInput] = useState('');
  const [limitForm, setLimitForm] = useState({ daily_limit: '', monthly_limit: '' });
  const [otpState, setOtpState] = useState({ step: 'request', code: '', details: null, countdown: 0, loading: false });
  const [busy, setBusy] = useState({ create: false, status: false, limits: false, controls: false, delete: false });

  const selectedCard = useMemo(() => {
    if (!cards.length) {
      return null;
    }
    return cards.find((card) => String(card.id) === String(selectedCardId)) || cards[0];
  }, [cards, selectedCardId]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  useEffect(() => {
    const pathParts = (pathname || '').split('/').filter(Boolean);
    const cardIdFromPath = pathParts[2] || '';
    if (cardIdFromPath) {
      setSelectedCardId(cardIdFromPath);
      return;
    }
    if (cards.length > 0 && !selectedCardId) {
      setSelectedCardId(String(cards[0].id));
    }
  }, [pathname, cards, selectedCardId]);

  useEffect(() => {
    if (selectedCard) {
      setLimitForm({
        daily_limit: String(selectedCard.dailyLimit || ''),
        monthly_limit: String(selectedCard.monthlyLimit || ''),
      });
      setControlsForm({
        allowed_categories: selectedCard.allowedCategories || [],
        blocked_merchants: selectedCard.blockedMerchants || [],
      });
    }
  }, [selectedCard]);

  useEffect(() => {
    if (!otpOpen || otpState.countdown <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setOtpState((current) => ({ ...current, countdown: current.countdown - 1 }));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpOpen, otpState.countdown]);

  useEffect(() => {
    if (otpState.countdown === 0 && otpState.details) {
      setOtpState((current) => ({ ...current, details: null, step: 'request' }));
    }
  }, [otpState.countdown, otpState.details]);

  const openCard = (cardId) => {
    setSelectedCardId(String(cardId));
    router.push(`/user/cards/${cardId}`);
  };

  const handleCreate = async () => {
    const daily = Number(createForm.daily_limit);
    const monthly = Number(createForm.monthly_limit);
    if (createForm.card_name.trim().length < 3 || createForm.card_name.trim().length > 20) {
      pushToast({ tone: 'error', message: 'Card name must be 3 to 20 characters.' });
      return;
    }
    if (!(daily > 0) || !(monthly > 0)) {
      pushToast({ tone: 'error', message: 'Limits must be greater than 0.' });
      return;
    }
    if (daily > monthly) {
      pushToast({ tone: 'error', message: 'Daily limit cannot exceed monthly limit.' });
      return;
    }

    setBusy((current) => ({ ...current, create: true }));
    try {
      const card = await createCard({
        card_name: createForm.card_name.trim(),
        daily_limit: daily,
        monthly_limit: monthly,
      });
      setCreateOpen(false);
      setCreateForm({ card_name: '', daily_limit: '', monthly_limit: '' });
      openCard(card.id);
      pushToast({ tone: 'success', message: 'Virtual card created successfully.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Card creation failed.' });
    } finally {
      setBusy((current) => ({ ...current, create: false }));
    }
  };

  const handleStatusToggle = async () => {
    if (!selectedCard) {
      return;
    }
    const nextStatus = selectedCard.status === 'active' ? 'frozen' : 'active';
    setBusy((current) => ({ ...current, status: true }));
    try {
      await updateCardStatus(selectedCard.id, nextStatus);
      pushToast({ tone: 'success', message: `Card ${nextStatus === 'active' ? 'unfrozen' : 'frozen'} successfully.` });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not update card status.' });
    } finally {
      setBusy((current) => ({ ...current, status: false }));
    }
  };

  const handleSaveLimits = async () => {
    if (!selectedCard) {
      return;
    }
    const daily = Number(limitForm.daily_limit);
    const monthly = Number(limitForm.monthly_limit);
    if (!(daily > 0) || !(monthly > 0)) {
      pushToast({ tone: 'error', message: 'Card limits must be positive numbers.' });
      return;
    }
    if (daily > monthly) {
      pushToast({ tone: 'error', message: 'Daily limit cannot exceed monthly limit.' });
      return;
    }

    setBusy((current) => ({ ...current, limits: true }));
    try {
      await updateCardLimits(selectedCard.id, { daily_limit: daily, monthly_limit: monthly });
      pushToast({ tone: 'success', message: 'Card limits updated.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not update limits.' });
    } finally {
      setBusy((current) => ({ ...current, limits: false }));
    }
  };

  const handleSaveControls = async () => {
    if (!selectedCard) {
      return;
    }
    setBusy((current) => ({ ...current, controls: true }));
    try {
      await updateCardControls(selectedCard.id, controlsForm);
      pushToast({ tone: 'success', message: 'Merchant controls updated.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not update controls.' });
    } finally {
      setBusy((current) => ({ ...current, controls: false }));
    }
  };

  const handleDelete = async () => {
    if (!selectedCard) {
      return;
    }
    if (!window.confirm('Cancel this card permanently?')) {
      return;
    }
    setBusy((current) => ({ ...current, delete: true }));
    try {
      await deleteCard(selectedCard.id);
      router.push('/user/cards');
      pushToast({ tone: 'success', message: 'Card cancelled.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not cancel card.' });
    } finally {
      setBusy((current) => ({ ...current, delete: false }));
    }
  };

  const requestOtp = async () => {
    if (!selectedCard) {
      return;
    }
    setOtpState((current) => ({ ...current, loading: true }));
    try {
      const result = await cardService.requestCardDetailsOtp(selectedCard.id);
      setOtpState({ step: 'verify', code: '', details: null, countdown: 0, loading: false });
      pushToast({ tone: 'success', message: result.message || 'OTP sent to your email.' });
    } catch (error) {
      setOtpState((current) => ({ ...current, loading: false }));
      pushToast({ tone: 'error', message: error.message || 'Could not send OTP.' });
    }
  };

  const verifyOtp = async () => {
    if (!selectedCard) {
      return;
    }
    if (!isValidOtp(otpState.code)) {
      pushToast({ tone: 'error', message: 'OTP must be 6 digits.' });
      return;
    }

    setOtpState((current) => ({ ...current, loading: true }));
    try {
      // Sensitive card data stays only inside this modal state and is cleared on close/timeout.
      const details = await cardService.getCardDetails(selectedCard.id, otpState.code);
      setOtpState({ step: 'reveal', code: '', details, countdown: 30, loading: false });
      pushToast({ tone: 'success', message: 'Card details verified.' });
    } catch (error) {
      setOtpState((current) => ({ ...current, loading: false }));
      pushToast({ tone: 'error', message: error.message || 'Invalid or expired OTP, try again.' });
    }
  };

  const closeOtpModal = () => {
    setOtpOpen(false);
    setOtpState({ step: 'request', code: '', details: null, countdown: 0, loading: false });
  };

  if (loading.cards && cards.length === 0) {
    return (
      <div className="card" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading cards...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Virtual Cards</h1>
          <p className="page-subtitle">Create, freeze, secure, and manage your virtual card controls.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Create New Card
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <div className="heading-md mb-2">No cards yet</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 18 }}>Create your first virtual card to start managing spending controls.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Create Card
          </button>
        </div>
      ) : (
        <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
          <div>
            <h2 className="heading-md mb-4">Your Cards</h2>
            <div className="grid-dashboard" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {cards.map((card) => (
                <CardShell key={card.id} card={card} active={String(selectedCard?.id) === String(card.id)} onClick={() => openCard(card.id)} />
              ))}
            </div>
          </div>

          {selectedCard && (
            <div className="flex flex-col gap-4">
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="heading-md">{selectedCard.cardName}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedCard.brand}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push('/user/cards')}>
                    <ArrowLeft size={14} /> Back
                  </button>
                </div>

                <div className="vcard" style={{ background: cardGradients[selectedCard.color] || cardGradients.aqua, marginBottom: 20 }}>
                  <div className="flex justify-between items-center">
                    <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#07080f' }}>{selectedCard.cardName}</div>
                    <span className={`badge ${selectedCard.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{selectedCard.status}</span>
                  </div>
                  <div>
                    <div style={{ letterSpacing: '0.2em', fontFamily: 'monospace', color: '#07080f', marginBottom: 10, fontSize: '1rem' }}>
                      {selectedCard.maskedNumber}
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div style={{ fontSize: '0.625rem', opacity: 0.7, color: '#07080f' }}>CARD HOLDER</div>
                        <div style={{ fontWeight: 700, color: '#07080f', fontSize: '0.8125rem' }}>{selectedCard.holder.toUpperCase()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.625rem', opacity: 0.7, color: '#07080f' }}>EXPIRES</div>
                        <div style={{ fontWeight: 700, color: '#07080f', fontSize: '0.8125rem' }}>{formatExpiry(selectedCard.expiry)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setOtpOpen(true)}>
                    <Eye size={14} /> View Full Details
                  </button>
                  <button className={`btn btn-sm ${selectedCard.status === 'active' ? 'btn-outline' : 'btn-primary'}`} onClick={handleStatusToggle} disabled={busy.status}>
                    <Snowflake size={14} /> {busy.status ? 'Saving...' : selectedCard.status === 'active' ? 'Freeze Card' : 'Unfreeze Card'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={handleDelete} disabled={busy.delete}>
                    <Trash2 size={14} /> {busy.delete ? 'Cancelling...' : 'Cancel Card'}
                  </button>
                </div>
              </div>

              <div className="card">
                <h3 className="heading-sm mb-4">Limits</h3>
                <div className="grid-dashboard cols-2" style={{ gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Daily Limit</label>
                    <input className="form-input" value={limitForm.daily_limit} onChange={(event) => setLimitForm((current) => ({ ...current, daily_limit: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Limit</label>
                    <input className="form-input" value={limitForm.monthly_limit} onChange={(event) => setLimitForm((current) => ({ ...current, monthly_limit: event.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm mt-4" onClick={handleSaveLimits} disabled={busy.limits}>
                  {busy.limits ? 'Saving...' : 'Save Limits'}
                </button>
              </div>

              <div className="card">
                <h3 className="heading-sm mb-4">Merchant Controls</h3>
                <div className="mb-4">
                  <label className="form-label">Allowed Categories</label>
                  <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                    {categoryOptions.map((category) => {
                      const active = controlsForm.allowed_categories.includes(category);
                      return (
                        <button
                          key={category}
                          className={`seg-tab ${active ? 'active' : ''}`}
                          onClick={() => setControlsForm((current) => ({
                            ...current,
                            allowed_categories: active
                              ? current.allowed_categories.filter((entry) => entry !== category)
                              : [...current.allowed_categories, category],
                          }))}
                        >
                          {active && <Check size={12} />} {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Blocked Merchants</label>
                  <div className="flex gap-2">
                    <input className="form-input" value={merchantInput} onChange={(event) => setMerchantInput(event.target.value)} placeholder="Add merchant name" />
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        if (!merchantInput.trim()) return;
                        setControlsForm((current) => ({
                          ...current,
                          blocked_merchants: [...new Set([...current.blocked_merchants, merchantInput.trim()])],
                        }));
                        setMerchantInput('');
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
                  {controlsForm.blocked_merchants.map((merchant) => (
                    <span key={merchant} className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {merchant}
                      <button
                        onClick={() => setControlsForm((current) => ({
                          ...current,
                          blocked_merchants: current.blocked_merchants.filter((entry) => entry !== merchant),
                        }))}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm mt-4" onClick={handleSaveControls} disabled={busy.controls}>
                  {busy.controls ? 'Saving...' : 'Save Controls'}
                </button>
              </div>

              <div className="card">
                <h3 className="heading-sm mb-3">Recent Card Activity</h3>
                {otpState.details?.id === selectedCard.id && otpState.details.recentTransactions.length > 0 ? (
                  otpState.details.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="tx-row">
                      <div className="tx-icon-wrap tx-icon-debit"><CreditCard size={14} /></div>
                      <div className="tx-meta">
                        <div className="tx-name">{transaction.description}</div>
                        <div className="tx-date">{transaction.category} · {transaction.timestamp}</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{formatCurrency(transaction.amount)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No card transactions yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={createOpen} title="Create Virtual Card" onClose={() => setCreateOpen(false)}>
        <div className="form-group mb-4">
          <label className="form-label">Card Name</label>
          <input className="form-input" value={createForm.card_name} onChange={(event) => setCreateForm((current) => ({ ...current, card_name: event.target.value }))} placeholder="e.g. Travel Card" />
        </div>
        <div className="grid-dashboard cols-2" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Daily Limit</label>
            <input className="form-input" type="number" value={createForm.daily_limit} onChange={(event) => setCreateForm((current) => ({ ...current, daily_limit: event.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Limit</label>
            <input className="form-input" type="number" value={createForm.monthly_limit} onChange={(event) => setCreateForm((current) => ({ ...current, monthly_limit: event.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleCreate} disabled={busy.create}>
            {busy.create ? 'Creating...' : 'Create Card'}
          </button>
        </div>
      </Modal>

      <Modal open={otpOpen} title="View Full Card Details" onClose={closeOtpModal} maxWidth={560}>
        {otpState.step === 'request' && (
          <div>
            <div className="card" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.18)', marginBottom: 20 }}>
              <div className="flex items-start gap-3">
                <ShieldAlert size={18} color="#f59e0b" />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Security warning</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Keep this information private. Sensitive details auto-hide after 30 seconds.</div>
                </div>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={requestOtp} disabled={otpState.loading}>
              {otpState.loading ? <><Loader2 size={14} className="animate-spin" /> Sending OTP...</> : 'Request OTP'}
            </button>
          </div>
        )}

        {otpState.step === 'verify' && (
          <div>
            <div className="form-group mb-4">
              <label className="form-label">Enter 6-digit OTP</label>
              <input className="form-input" value={otpState.code} onChange={(event) => setOtpState((current) => ({ ...current, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="123456" />
            </div>
            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setOtpState({ step: 'request', code: '', details: null, countdown: 0, loading: false })}>Back</button>
              <button className="btn btn-primary flex-1" onClick={verifyOtp} disabled={otpState.loading}>
                {otpState.loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        {otpState.step === 'reveal' && otpState.details && (
          <div>
            <div className="card mb-4" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.18)' }}>
              Sensitive details visible for {otpState.countdown}s. Do not share this information.
            </div>
            <div className="grid-dashboard cols-2" style={{ gap: 16 }}>
              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Card Number</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{otpState.details.cardNumber}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>CVV</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{otpState.details.cvv}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Expiry</div>
                <div style={{ fontWeight: 700 }}>{otpState.details.expiry}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Holder</div>
                <div style={{ fontWeight: 700 }}>{otpState.details.holder}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
