// ============================
// ZANK AI — CENTRALIZED MOCK DATA
// ============================

// CURRENT USER
export const currentUser = {
  firstName: 'Jordan',
  lastName: 'Rivera',
  email: 'jordan.r@zankmail.com',
  phone: '+1 (415) 555-0192',
  country: 'United States',
  timezone: 'America/New_York',
  loyaltyTier: 'Gold',
  kycStatus: 'in-progress',
};

// WALLET
export const walletData = {
  totalBalance: 12450.80,
  availableBalance: 10210.00,
  heldBalance: 2240.80,
  pendingDeposit: 500.00,
  accountNumber: '4729-8821-0012-3041',
  routingNumber: '021000021',
  walletId: 'ZANK-8821',
};

// TRANSACTIONS
export const transactions = [
  { id: 'TXN-001', merchant: 'Salary Deposit', icon: '💼', type: 'credit', amount: 4250.00, date: 'Mar 11, 2026', time: '09:00 AM', category: 'Income', status: 'completed' },
  { id: 'TXN-002', merchant: 'Starbucks', icon: '☕', type: 'debit', amount: -5.40, date: 'Mar 11, 2026', time: '08:15 AM', category: 'Food', status: 'completed' },
  { id: 'TXN-003', merchant: 'Amazon Prime', icon: '📦', type: 'debit', amount: -14.99, date: 'Mar 10, 2026', time: '7:05 PM', category: 'Shopping', status: 'completed' },
  { id: 'TXN-004', merchant: 'Netflix', icon: '📺', type: 'debit', amount: -15.99, date: 'Mar 10, 2026', time: '12:00 AM', category: 'Entertainment', status: 'completed' },
  { id: 'TXN-005', merchant: 'Uber Eats', icon: '🛵', type: 'debit', amount: -18.70, date: 'Mar 9, 2026', time: '6:40 PM', category: 'Food', status: 'completed' },
  { id: 'TXN-006', merchant: 'Freelance Payment', icon: '💡', type: 'credit', amount: 2500.00, date: 'Mar 8, 2026', time: '2:30 PM', category: 'Income', status: 'completed' },
  { id: 'TXN-007', merchant: 'Spotify', icon: '🎵', type: 'debit', amount: -11.99, date: 'Mar 6, 2026', time: '12:00 AM', category: 'Entertainment', status: 'completed' },
  { id: 'TXN-008', merchant: 'Gym Membership', icon: '🏋️', type: 'debit', amount: -49.00, date: 'Mar 5, 2026', time: '8:00 AM', category: 'Healthcare', status: 'completed' },
  { id: 'TXN-009', merchant: 'Transfer to Alex', icon: '↗️', type: 'debit', amount: -200.00, date: 'Mar 4, 2026', time: '3:45 PM', category: 'Transfer', status: 'pending' },
  { id: 'TXN-010', merchant: 'Apple Store', icon: '🍎', type: 'debit', amount: -99.00, date: 'Mar 3, 2026', time: '11:20 AM', category: 'Shopping', status: 'completed' },
];

// SAVINGS GOALS
export const savingsGoals = [
  { id: 1, name: 'Dream Vacation', emoji: '✈️', target: 5000, saved: 3250, color: 'var(--primary)', dueDate: 'Jun 2026', autoSave: true, monthlyContrib: 300 },
  { id: 2, name: 'New MacBook Pro', emoji: '💻', target: 3500, saved: 2100, color: 'var(--blue)', dueDate: 'May 2026', autoSave: true, monthlyContrib: 350 },
  { id: 3, name: 'Emergency Fund', emoji: '🛡️', target: 10000, saved: 4800, color: 'var(--lavender)', dueDate: 'Dec 2026', autoSave: true, monthlyContrib: 400 },
  { id: 4, name: 'Wedding Fund', emoji: '💍', target: 20000, saved: 3250, color: 'var(--warning)', dueDate: 'Dec 2027', autoSave: false, monthlyContrib: 0 },
];

// VIRTUAL CARDS
export const cards = [
  { id: 'card-1', name: 'Zank Aqua', number: '**** **** **** 4092', holder: 'Jordan Rivera', expiry: '12/28', status: 'active', color: 'var(--grad-primary)', spent: 340, dailyLimit: 2000 },
  { id: 'card-2', name: 'Zank Violet', number: '**** **** **** 9901', holder: 'Jordan Rivera', expiry: '08/27', status: 'active', color: 'var(--grad-purple)', spent: 120, dailyLimit: 1000 },
  { id: 'card-3', name: 'Zank Ember', number: '**** **** **** 3315', holder: 'Jordan Rivera', expiry: '03/29', status: 'frozen', color: 'var(--grad-warm)', spent: 0, dailyLimit: 500 },
];

// BUDGETS
export const budgets = [
  { category: 'Food & Dining', icon: '🍔', budget: 600, spent: 420, color: 'var(--primary)' },
  { category: 'Shopping', icon: '🛍️', budget: 400, spent: 453, color: 'var(--warning)' },
  { category: 'Entertainment', icon: '🎮', budget: 150, spent: 120, color: 'var(--lavender)' },
  { category: 'Transport', icon: '🚗', budget: 200, spent: 184, color: 'var(--blue)' },
  { category: 'Healthcare', icon: '💊', budget: 100, spent: 49, color: 'var(--success)' },
  { category: 'Subscriptions', icon: '📱', budget: 80, spent: 60, color: 'var(--danger)' },
];

// ANALYTICS
export const analyticsData = {
  healthScore: 74,
  monthly: [
    { month: 'Sep', income: 6200, expense: 3800 },
    { month: 'Oct', income: 5800, expense: 3200 },
    { month: 'Nov', income: 5100, expense: 4100 },
    { month: 'Dec', income: 6500, expense: 4800 },
    { month: 'Jan', income: 5400, expense: 2900 },
    { month: 'Feb', income: 5900, expense: 3300 },
    { month: 'Mar', income: 6750, expense: 2860 },
  ],
  weekly: [42, 68, 55, 89, 72, 94, 38],
  categories: [
    { name: 'Food & Dining', value: 420, color: 'var(--primary)' },
    { name: 'Shopping', value: 453, color: 'var(--warning)' },
    { name: 'Entertainment', value: 120, color: 'var(--lavender)' },
    { name: 'Transport', value: 184, color: 'var(--blue)' },
    { name: 'Healthcare', value: 49, color: 'var(--success)' },
    { name: 'Subscriptions', value: 60, color: 'var(--danger)' },
  ],
};

// REWARDS
export const rewards = {
  tier: 'Gold',
  totalPoints: 7820,
  nextTierPoints: 10000,
  cashbackEarned: 142.30,
  streakDays: 14,
  offers: [
    { brand: 'Apple Store', cashback: '5% back', expires: 'Apr 1', icon: '🍎' },
    { brand: 'Delta Airlines', cashback: '$50 off', expires: 'Mar 31', icon: '✈️' },
    { brand: 'Whole Foods', cashback: '3% back', expires: 'Mar 30', icon: '🥦' },
    { brand: 'Airbnb', cashback: '4% back', expires: 'Apr 30', icon: '🏠' },
  ],
  history: [
    { desc: 'Amazon purchase cashback', date: 'Mar 10, 2026', amount: 1.50 },
    { desc: 'Streak bonus (14 days)', date: 'Mar 9, 2026', amount: 5.00 },
    { desc: 'Starbucks cashback', date: 'Mar 11, 2026', amount: 0.27 },
    { desc: 'Delta booking reward', date: 'Mar 7, 2026', amount: 50.00 },
  ],
};

// NOTIFICATIONS
export const notifications = [
  { id: 'n1', title: 'Payment received', body: 'You received $4,250 salary deposit.', time: '10m ago', read: false },
  { id: 'n2', title: 'Budget alert', body: 'Shopping budget 113% — you\'re over!', time: '2h ago', read: false },
  { id: 'n3', title: 'Card frozen', body: 'Zank Ember card auto-frozen (inactivity).', time: '1d ago', read: true },
  { id: 'n4', title: 'Savings milestone', body: 'You hit 65% of your Vacation goal!', time: '2d ago', read: true },
  { id: 'n5', title: 'Security alert', body: 'New login from New York, US — you.', time: '3d ago', read: true },
];

// ADMIN — USERS
export const adminUsers = [
  { id: 'UID-44021', name: 'Jordan Rivera', email: 'jordan.r@zankmail.com', balance: 12450.80, kyc: 'in-review', status: 'active', risk: 'low', country: 'US', joined: 'Jan 15, 2026', txCount: 112 },
  { id: 'UID-84302', name: 'Alex Kim', email: 'alex.k@example.com', balance: 34200.00, kyc: 'verified', status: 'active', risk: 'medium', country: 'US', joined: 'Feb 1, 2026', txCount: 241 },
  { id: 'UID-22199', name: 'Priya Nair', email: 'priya.n@example.com', balance: 8190.00, kyc: 'pending', status: 'active', risk: 'high', country: 'IN', joined: 'Mar 2, 2026', txCount: 58 },
  { id: 'UID-55810', name: 'Marcus Ford', email: 'marcus.f@example.com', balance: 21300.00, kyc: 'verified', status: 'frozen', risk: 'high', country: 'US', joined: 'Dec 22, 2025', txCount: 305 },
  { id: 'UID-71234', name: 'Luna Zhang', email: 'luna.z@example.com', balance: 5620.00, kyc: 'verified', status: 'active', risk: 'low', country: 'CN', joined: 'Feb 14, 2026', txCount: 77 },
  { id: 'UID-33901', name: 'Sam Torres', email: 'sam.t@example.com', balance: 3100.00, kyc: 'rejected', status: 'inactive', risk: 'high', country: 'MX', joined: 'Mar 5, 2026', txCount: 12 },
  { id: 'UID-66421', name: 'Emma Walsh', email: 'emma.w@example.com', balance: 18900.00, kyc: 'verified', status: 'active', risk: 'low', country: 'UK', joined: 'Jan 30, 2026', txCount: 188 },
];

// ADMIN — STATS
export const adminStats = {
  totalUsers: '2,041,882',
  totalAUM: '$45.8M',
  dailyVolume: '$1.24M',
  riskFlags: 14,
  pendingKYC: 45,
  frozenAccounts: 3,
  revenue30d: '$82,400',
  openTickets: 78,
};

// ADMIN — AUDIT LOGS
export const auditLogs = [
  { id: 'LOG-001', actor: 'Super Admin', action: 'USER_FREEZE', resource: 'UID-84302', ip: '10.0.0.1', ts: 'Mar 11 10:45 AM', severity: 'high' },
  { id: 'LOG-002', actor: 'System', action: 'AML_FLAG', resource: 'UID-22199', ip: '—', ts: 'Mar 11 10:30 AM', severity: 'high' },
  { id: 'LOG-003', actor: 'Super Admin', action: 'KYC_APPROVE', resource: 'UID-71234', ip: '10.0.0.1', ts: 'Mar 11 09:55 AM', severity: 'medium' },
  { id: 'LOG-004', actor: 'System', action: 'BLOCK_IP', resource: '45.227.x.x', ip: '—', ts: 'Mar 10 09:30 AM', severity: 'high' },
  { id: 'LOG-005', actor: 'Agent Relay', action: 'TICKET_RESOLVE', resource: 'TKT-00124', ip: '10.0.0.5', ts: 'Mar 10 08:20 AM', severity: 'info' },
  { id: 'LOG-006', actor: 'Super Admin', action: 'LIMIT_UPDATE', resource: 'GLOBAL_CONFIG', ip: '10.0.0.1', ts: 'Mar 9 03:00 PM', severity: 'medium' },
  { id: 'LOG-007', actor: 'System', action: 'RECONCILE_FLAG', resource: 'RECON-2026-03', ip: '—', ts: 'Mar 9 06:00 AM', severity: 'medium' },
  { id: 'LOG-008', actor: 'Super Admin', action: 'ADMIN_LOGIN', resource: 'AUTH', ip: '10.0.0.1', ts: 'Mar 9 08:00 AM', severity: 'info' },
];

// ADMIN — RISK FLAGS
export const riskFlags = [
  { id: 'RISK-001', userId: 'UID-84302', name: 'Alex Kim', type: 'Velocity Alert', score: 82, severity: 'critical', status: 'open', desc: 'Exceeded $50K withdrawal in 24h window. Possible structuring attempt.' },
  { id: 'RISK-002', userId: 'UID-22199', name: 'Priya Nair', type: 'Geo Mismatch', score: 67, severity: 'high', status: 'review', desc: 'Login from India while KYC address lists UK. Potential fraud.' },
  { id: 'RISK-003', userId: 'UID-55810', name: 'Marcus Ford', type: 'AML Trigger', score: 91, severity: 'critical', status: 'open', desc: 'Multiple rapid large-value transactions to overseas accounts.' },
  { id: 'RISK-004', userId: 'UID-33901', name: 'Sam Torres', type: 'KYC Rejected', score: 45, severity: 'medium', status: 'cleared', desc: 'Identity document failed liveness check. Account restricted.' },
];

// ADMIN — RECONCILIATION ALERTS
export const reconciliationAlerts = [
  { id: 'REC-001', processor: 'Stripe', type: 'ACH Debit', expected: '$1,240.00', actual: '$1,190.00', diff: '-$50.00', date: 'Mar 11, 2026', status: 'mismatch' },
  { id: 'REC-002', processor: 'ACH Bank', type: 'Wire Transfer', expected: '$8,400.00', actual: '$8,400.00', diff: '$0.00', date: 'Mar 11, 2026', status: 'matched' },
  { id: 'REC-003', processor: 'ACH Bank', type: 'Direct Deposit', expected: '$4,250.00', actual: '$4,250.00', diff: '$0.00', date: 'Mar 10, 2026', status: 'matched' },
  { id: 'REC-004', processor: 'Plaid', type: 'Balance Sync', expected: '$12,450.80', actual: '$12,250.80', diff: '-$200.00', date: 'Mar 10, 2026', status: 'mismatch' },
];

// SUPPORT TICKETS
export const supportTickets = [
  { id: 'TKT-00124', user: 'Jordan Rivera', issue: 'Card declined for international purchase', status: 'open', priority: 'medium', agent: 'Agent Sam', created: 'Mar 11, 2026' },
  { id: 'TKT-00125', user: 'Alex Kim', issue: 'KYC documents not accepted after resubmission', status: 'in-progress', priority: 'high', agent: 'Agent Lisa', created: 'Mar 10, 2026' },
  { id: 'TKT-00126', user: 'Marcus Ford', issue: 'Account frozen without prior warning email', status: 'escalated', priority: 'high', agent: 'Agent Sam', created: 'Mar 9, 2026' },
  { id: 'TKT-00127', user: 'Luna Zhang', issue: 'Transfer fee charged twice for one transaction', status: 'resolved', priority: 'low', agent: 'Agent Raj', created: 'Mar 8, 2026' },
  { id: 'TKT-00128', user: 'Emma Walsh', issue: 'Unable to link Wells Fargo bank account', status: 'in-progress', priority: 'medium', agent: 'Agent Raj', created: 'Mar 7, 2026' },
  { id: 'TKT-00129', user: 'Sam Torres', issue: 'Cannot reset password — no email received', status: 'open', priority: 'high', agent: 'Unassigned', created: 'Mar 6, 2026' },
];
