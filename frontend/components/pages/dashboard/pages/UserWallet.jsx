import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight, Building, Copy, Eye, EyeOff, Landmark, Plus, Send, Wallet2
} from 'lucide-react';
import { useAppData } from '../../../../src/context/AppDataContext';
import {
  formatCurrency,
  formatDateTime,
  isValidAmount,
  isValidEmail,
  isValidOtp,
  isValidPhone,
} from '../../../../src/utils/dashboard';

function ActionModal({ open, title, onClose, children }) {
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="card"
            style={{ width: '100%', maxWidth: 480, borderRadius: 'var(--r-xl)', padding: 28 }}
          >
            <div className="flex justify-between items-center mb-6">
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

function ActionButton({ onClick, icon: Icon, label, variant = 'outline' }) {
  return (
    <button className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={onClick}>
      <Icon size={14} /> {label}
    </button>
  );
}

export default function UserWallet() {
  const {
    wallet,
    linkedAccounts,
    sendWithdrawOtp,
    withdrawFunds,
    sendFunds,
    requestFunds,
    pushToast,
  } = useAppData();
  const [showAccNum, setShowAccNum] = useState(false);
  const [activeModal, setActiveModal] = useState('');
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', destinationAccountId: '', otp: '' });
  const [sendForm, setSendForm] = useState({ recipientEmail: '', amount: '', note: '' });
  const [requestForm, setRequestForm] = useState({ contact: '', amount: '', message: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState({
    sendOtp: false,
    withdraw: false,
    send: false,
    request: false,
  });

  const selectedWithdrawAccount = linkedAccounts.find((account) => account.id === withdrawForm.destinationAccountId);

  const availablePct = useMemo(() => {
    if (!wallet?.totalBalance) {
      return 0;
    }
    return Math.min(100, Math.round((wallet.availableBalance / wallet.totalBalance) * 100));
  }, [wallet]);

  const spendDailyPct = useMemo(() => {
    if (!wallet?.dailyLimit) {
      return 0;
    }
    return Math.min(100, (wallet.todaySpend / wallet.dailyLimit) * 100);
  }, [wallet]);

  const spendMonthlyPct = useMemo(() => {
    if (!wallet?.monthlyLimit) {
      return 0;
    }
    return Math.min(100, (wallet.monthSpend / wallet.monthlyLimit) * 100);
  }, [wallet]);

  if (!wallet) {
    return (
      <div className="card" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading wallet...
      </div>
    );
  }

  const handleWithdraw = async () => {
    if (!isValidAmount(withdrawForm.amount)) {
      pushToast({ tone: 'error', message: 'Enter a valid withdrawal amount.' });
      return;
    }
    if (Number(withdrawForm.amount) > Number(wallet.availableBalance)) {
      pushToast({ tone: 'error', message: 'Insufficient balance for this withdrawal.' });
      return;
    }
    if (!withdrawForm.destinationAccountId) {
      pushToast({ tone: 'error', message: 'Select a destination account.' });
      return;
    }
    if (!otpSent) {
      pushToast({ tone: 'error', message: 'Send OTP to your email before confirming withdrawal.' });
      return;
    }
    if (!isValidOtp(withdrawForm.otp)) {
      pushToast({ tone: 'error', message: 'OTP must be 6 digits.' });
      return;
    }

    setSubmitting((current) => ({ ...current, withdraw: true }));
    try {
      const result = await withdrawFunds({ ...withdrawForm, amount: Number(withdrawForm.amount) });
      pushToast({ tone: 'success', message: result.message || 'Withdrawal completed successfully.' });
      setWithdrawForm({ amount: '', destinationAccountId: '', otp: '' });
      setOtpSent(false);
      setActiveModal('');
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Withdrawal failed.' });
    } finally {
      setSubmitting((current) => ({ ...current, withdraw: false }));
    }
  };

  const handleSend = async () => {
    const recipient = sendForm.recipientEmail.trim();
    if (!isValidAmount(sendForm.amount)) {
      pushToast({ tone: 'error', message: 'Enter a valid amount.' });
      return;
    }
    if (!(isValidEmail(recipient) || isValidPhone(recipient))) {
      pushToast({ tone: 'error', message: 'Enter a valid recipient email or phone.' });
      return;
    }
    if (Number(sendForm.amount) > Number(wallet.availableBalance)) {
      pushToast({ tone: 'error', message: 'Insufficient balance for this transfer.' });
      return;
    }

    setSubmitting((current) => ({ ...current, send: true }));
    try {
      const result = await sendFunds({
        recipientEmail: recipient,
        amount: Number(sendForm.amount),
        note: sendForm.note,
      });
      pushToast({ tone: 'success', message: result.transactionId ? `Money sent successfully (${result.transactionId}).` : 'Money sent successfully.' });
      setSendForm({ recipientEmail: '', amount: '', note: '' });
      setActiveModal('');
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not send money.' });
    } finally {
      setSubmitting((current) => ({ ...current, send: false }));
    }
  };

  const handleRequest = async () => {
    const contact = requestForm.contact.trim();
    if (!isValidAmount(requestForm.amount)) {
      pushToast({ tone: 'error', message: 'Enter a valid request amount.' });
      return;
    }
    if (!(isValidEmail(contact) || isValidPhone(contact))) {
      pushToast({ tone: 'error', message: 'Enter a valid email or phone.' });
      return;
    }

    setSubmitting((current) => ({ ...current, request: true }));
    try {
      const result = await requestFunds({
        contact,
        amount: Number(requestForm.amount),
        message: requestForm.message,
      });
      pushToast({ tone: 'success', message: result.message || 'Request sent successfully.' });
      setRequestForm({ contact: '', amount: '', message: '' });
      setActiveModal('');
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not create request.' });
    } finally {
      setSubmitting((current) => ({ ...current, request: false }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Wallet Dashboard</h1>
          <p className="page-subtitle">Manage balances, secure withdrawals, transfers, and money requests.</p>
        </div>
        <div className="flex gap-3">
          <ActionButton onClick={() => setActiveModal('withdraw')} icon={ArrowUpRight} label="Withdraw" variant="primary" />
          <ActionButton onClick={() => setActiveModal('send')} icon={Send} label="Send" />
          <ActionButton onClick={() => setActiveModal('request')} icon={Plus} label="Request" />
        </div>
      </div>

      <div className="grid-dashboard cols-3 mb-5">
        <div className="card card-gradient-primary" style={{ position: 'relative', overflow: 'hidden', padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Wallet Balance</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800 }} className="grad-text-primary">
            {formatCurrency(wallet.totalBalance, wallet.currency)}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{wallet.currency} · Wallet ID {wallet.walletId}</div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>Available</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 700, color: 'var(--success)' }}>
            {formatCurrency(wallet.availableBalance, wallet.currency)}
          </div>
          <div className="progress-bar-wrap mt-4">
            <div className="progress-bar-fill progress-primary" style={{ width: `${availablePct}%` }} />
          </div>
          <div style={{ marginTop: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{availablePct}% of total balance is available</div>
        </div>

        <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Held Funds</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(wallet.heldBalance, wallet.currency)}</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Wallet Status</div>
            <span className={`badge ${wallet.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{wallet.status}</span>
          </div>
        </div>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="heading-md">Bank Account Details</h2>
            <span className="badge badge-success">Verified</span>
          </div>
          <div className="grid-dashboard cols-3">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Account Number</div>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '1rem' }}>
                  {showAccNum ? wallet.accountNumber : '••••••••••••'}
                </span>
                <button onClick={() => setShowAccNum((value) => !value)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showAccNum ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => navigator.clipboard?.writeText(wallet.accountNumber)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Routing Number</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{wallet.routingNumber}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Bank Name</div>
              <div style={{ fontWeight: 600 }}>{wallet.bankName}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="heading-md mb-4">Spend & Limits</h2>
          <div style={{ marginBottom: 16 }}>
            <div className="flex justify-between mb-2" style={{ fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Today</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(wallet.todaySpend, wallet.currency)} / {formatCurrency(wallet.dailyLimit, wallet.currency)}</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${spendDailyPct}%`, background: 'var(--blue)' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2" style={{ fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>This Month</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(wallet.monthSpend, wallet.currency)} / {formatCurrency(wallet.monthlyLimit, wallet.currency)}</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${spendMonthlyPct}%`, background: 'var(--warning)' }} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4" style={{ fontSize: '0.8125rem', color: 'var(--success)' }}>
            <Building size={14} /> Linked accounts available: {linkedAccounts.length}
          </div>
        </div>
      </div>

      <div className="card mt-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md">Recent Transactions</h2>
          {wallet.recentTransactions.length === 0 && <span className="badge badge-muted">No activity yet</span>}
        </div>
        {wallet.recentTransactions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', paddingBottom: 8 }}>
            Your wallet has no transactions yet. Use the quick actions above to get started.
          </div>
        ) : (
          wallet.recentTransactions.map((transaction) => (
            <div key={transaction.id} className="tx-row">
              <div className={`tx-icon-wrap ${transaction.type === 'credit' ? 'tx-icon-credit' : 'tx-icon-debit'}`}>
                {transaction.type === 'credit' ? <Plus size={16} /> : <ArrowUpRight size={16} />}
              </div>
              <div className="tx-meta">
                <div className="tx-name">{transaction.merchant}</div>
                <div className="tx-date">{formatDateTime(transaction.date)} · {transaction.category}</div>
              </div>
              <div className="tx-amount-col">
                <div className={`tx-amount ${transaction.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                  {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), wallet.currency)}
                </div>
                <span className={`badge ${transaction.status === 'completed' ? 'badge-success' : transaction.status === 'pending' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.625rem', marginTop: 4, display: 'inline-flex' }}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <ActionModal open={activeModal === 'withdraw'} title="Withdraw Funds" onClose={() => setActiveModal('')}>
        <div className="form-group mb-4">
          <label className="form-label">Amount</label>
          <input className="form-input" value={withdrawForm.amount} onChange={(event) => setWithdrawForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" />
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Destination Account</label>
          <select className="form-input" value={withdrawForm.destinationAccountId} onChange={(event) => setWithdrawForm((current) => ({ ...current, destinationAccountId: event.target.value }))}>
            <option value="">Select destination</option>
            {linkedAccounts.map((account) => (
              <option key={account.id} value={account.id}>{account.bankName} ···· {account.last4}</option>
            ))}
          </select>
        </div>
        {selectedWithdrawAccount && (
          <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.02)', padding: 16 }}>
            <div style={{ fontWeight: 600 }}>{selectedWithdrawAccount.bankName}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedWithdrawAccount.type} ···· {selectedWithdrawAccount.last4}</div>
          </div>
        )}
        <div className="form-group mb-5">
          <label className="form-label">OTP</label>
          <div className="flex gap-3">
            <input className="form-input" value={withdrawForm.otp} onChange={(event) => setWithdrawForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="6-digit code" />
            <button
              className="btn btn-outline"
              onClick={async () => {
                if (!isValidAmount(withdrawForm.amount)) {
                  pushToast({ tone: 'error', message: 'Enter a valid withdrawal amount first.' });
                  return;
                }
                if (Number(withdrawForm.amount) > Number(wallet.availableBalance)) {
                  pushToast({ tone: 'error', message: 'Insufficient balance for this withdrawal.' });
                  return;
                }
                if (!withdrawForm.destinationAccountId) {
                  pushToast({ tone: 'error', message: 'Select a destination account first.' });
                  return;
                }

                setSubmitting((current) => ({ ...current, sendOtp: true }));
                try {
                  const result = await sendWithdrawOtp({
                    amount: Number(withdrawForm.amount),
                    destinationAccountId: withdrawForm.destinationAccountId,
                  });
                  setOtpSent(true);
                  pushToast({ tone: 'success', message: result.message || 'OTP sent to your email.' });
                } catch (error) {
                  pushToast({ tone: 'error', message: error.message || 'Could not send OTP.' });
                } finally {
                  setSubmitting((current) => ({ ...current, sendOtp: false }));
                }
              }}
              disabled={submitting.sendOtp}
            >
              {submitting.sendOtp ? 'Sending...' : otpSent ? 'OTP Sent' : 'Send OTP'}
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => setActiveModal('')}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleWithdraw} disabled={submitting.withdraw}>
            {submitting.withdraw ? 'Processing...' : 'Confirm Withdraw'}
          </button>
        </div>
      </ActionModal>

      <ActionModal open={activeModal === 'send'} title="Send Money" onClose={() => setActiveModal('')}>
        <div className="form-group mb-4">
          <label className="form-label">Recipient Email or Phone</label>
          <input className="form-input" value={sendForm.recipientEmail} onChange={(event) => setSendForm((current) => ({ ...current, recipientEmail: event.target.value }))} placeholder="name@example.com" />
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Amount</label>
          <input className="form-input" value={sendForm.amount} onChange={(event) => setSendForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" />
        </div>
        <div className="form-group mb-5">
          <label className="form-label">Description</label>
          <input className="form-input" value={sendForm.note} onChange={(event) => setSendForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional note" />
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => setActiveModal('')}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSend} disabled={submitting.send}>
            {submitting.send ? 'Processing...' : 'Send Money'}
          </button>
        </div>
      </ActionModal>

      <ActionModal open={activeModal === 'request'} title="Request Money" onClose={() => setActiveModal('')}>
        <div className="form-group mb-4">
          <label className="form-label">Email or Phone</label>
          <input className="form-input" value={requestForm.contact} onChange={(event) => setRequestForm((current) => ({ ...current, contact: event.target.value }))} placeholder="name@example.com" />
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Amount</label>
          <input className="form-input" value={requestForm.amount} onChange={(event) => setRequestForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" />
        </div>
        <div className="form-group mb-5">
          <label className="form-label">Message</label>
          <input className="form-input" value={requestForm.message} onChange={(event) => setRequestForm((current) => ({ ...current, message: event.target.value }))} placeholder="Optional message" />
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => setActiveModal('')}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleRequest} disabled={submitting.request}>
            {submitting.request ? 'Processing...' : 'Send Request'}
          </button>
        </div>
      </ActionModal>

      {linkedAccounts.length === 0 && (
        <div className="card mt-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
            <Landmark size={18} color="var(--primary)" />
            <h2 className="heading-md">Add a linked account</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Link a bank account first to enable secure withdrawals.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => window.location.assign('/user/settings')}>
            <Wallet2 size={14} /> Go to Linked Accounts
          </button>
        </div>
      )}
    </div>
  );
}
