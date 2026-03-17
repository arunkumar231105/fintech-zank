'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, CreditCard, ArrowLeftRight, PieChart,
  PiggyBank, Target, Gift, ShieldCheck, Settings, HelpCircle,
  Bell, Search, Menu, ChevronLeft, ChevronRight, LogOut, X
} from 'lucide-react';
import { useAppData } from '../../../src/context/AppDataContext';
import { getInitials } from '../../../src/utils/dashboard';
import './Dashboard.css';

import UserOverview from './pages/UserOverview';
import UserWallet from './pages/UserWallet';
import UserCards from './pages/UserCards';
import UserTransactions from './pages/UserTransactions';
import UserAnalytics from './pages/UserAnalytics';
import UserSavings from './pages/UserSavings';
import UserBudgets from './pages/UserBudgets';
import UserRewards from './pages/UserRewards';
import UserSecurity from './pages/UserSecurity';
import UserSettings from './pages/UserSettings';
import UserSupport from './pages/UserSupport';

const navItems = [
  { path: '', label: 'Overview', icon: LayoutDashboard },
  { path: 'wallet', label: 'Wallet', icon: Wallet },
  { path: 'cards', label: 'Cards', icon: CreditCard },
  { path: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: 'analytics', label: 'Analytics', icon: PieChart },
  { path: 'savings-goals', label: 'Savings Goals', icon: PiggyBank },
  { path: 'budgets', label: 'Budgets', icon: Target },
  { path: 'rewards', label: 'Rewards', icon: Gift },
  { path: 'security-kyc', label: 'Security & KYC', icon: ShieldCheck },
  { path: 'settings', label: 'Settings', icon: Settings },
  { path: 'support', label: 'Support', icon: HelpCircle },
];

const pageComponentMap = {
  '': <UserOverview />,
  wallet: <UserWallet />,
  cards: <UserCards />,
  transactions: <UserTransactions />,
  analytics: <UserAnalytics />,
  'savings-goals': <UserSavings />,
  budgets: <UserBudgets />,
  rewards: <UserRewards />,
  'security-kyc': <UserSecurity />,
  settings: <UserSettings />,
  support: <UserSupport />,
};

function buildNotifications(user, wallet, linkedAccounts) {
  const items = [];

  if (wallet && Number(wallet.availableBalance) <= 0) {
    items.push({
      id: 'wallet-empty',
      title: 'Wallet balance is low',
      body: 'Add funds to continue sending or withdrawing money.',
      time: 'Now',
    });
  }

  if (Array.isArray(linkedAccounts) && linkedAccounts.length === 0) {
      items.push({
      id: 'accounts-empty',
      title: 'No linked bank account',
      body: 'Link an account to enable secure withdrawals from your wallet.',
      time: 'Now',
    });
  }

  if (user && !user.isVerified) {
    items.push({
      id: 'user-unverified',
      title: 'Complete account verification',
      body: 'Verify your account to unlock all wallet actions.',
      time: 'Now',
    });
  }

  return items;
}

export default function UserDashboard() {
  const pathname = usePathname();
  const notifsRef = useRef(null);
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { user, wallet, linkedAccounts, loading, logout } = useAppData();

  const currentPath = (pathname || '/user').replace('/user', '').replace(/^\//, '');
  const sectionPath = currentPath.split('/')[0] || '';
  const currentPage = navItems.find((item) => item.path === sectionPath) || navItems[0];
  const PageComponent = pageComponentMap[sectionPath] || pageComponentMap[''];
  const notifications = useMemo(() => buildNotifications(user, wallet, linkedAccounts), [user, wallet, linkedAccounts]);

  useEffect(() => {
    const handler = (event) => {
      if (notifsRef.current && !notifsRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = getInitials(user);
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Loading user';

  return (
    <div className="dash-wrap">
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`dash-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-orb" />
            <span className="sidebar-brand-name">Zank AI</span>
          </div>
          <button className="sidebar-collapse-btn hide-sm" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button className="sidebar-collapse-btn show-mobile-only" onClick={() => setMobileOpen(false)} title="Close sidebar">
            <X size={14} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const itemPath = item.path === '' ? '/user' : `/user/${item.path}`;
            const isActive = pathname === itemPath || (item.path === '' && pathname === '/user');
            return (
              <Link
                key={item.path}
                href={itemPath}
                className={`nav-link ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-link-icon"><item.icon size={18} /></span>
                <span className="nav-link-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-sm">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{fullName}</div>
              <div className="sidebar-user-email">{user?.email || 'Loading...'}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="dash-content-wrap">
        <header className="dash-header">
          <button
            className="header-hamburger"
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                setMobileOpen((value) => !value);
              } else {
                setCollapsed((value) => !value);
              }
            }}
          >
            <Menu size={18} />
          </button>

          <span className="header-page-title">{currentPage.label}</span>

          <div className="header-search-wrap hide-sm">
            <Search size={16} color="var(--text-muted)" />
            <input className="header-search-input" type="text" placeholder="Search dashboard sections..." readOnly />
          </div>

          <div className="header-actions">
            <div ref={notifsRef} style={{ position: 'relative' }}>
              <button className="header-icon-btn" onClick={() => setShowNotifs((value) => !value)}>
                <Bell size={17} />
                {notifications.length > 0 && <span className="notif-dot" />}
              </button>
              {showNotifs && (
                <div className="notif-panel">
                  <div className="notif-header">
                    <span className="heading-sm">Notifications</span>
                    <span className="badge badge-primary">{notifications.length} new</span>
                  </div>
                  {notifications.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '12px 0' }}>
                      No new notifications.
                    </div>
                  )}
                  {notifications.map((notification) => (
                    <div key={notification.id} className="notif-item unread">
                      <div className="notif-dot-unread" />
                      <div>
                        <div className="heading-sm">{notification.title}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>{notification.body}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>{notification.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="avatar avatar-sm" style={{ cursor: 'pointer' }}>{initials}</div>

            <button className="header-icon-btn" onClick={logout} title="Sign Out">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="dash-main">
          {loading.bootstrap ? (
            <div className="card" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading your dashboard...
            </div>
          ) : (
            PageComponent
          )}
        </main>
      </div>
    </div>
  );
}
