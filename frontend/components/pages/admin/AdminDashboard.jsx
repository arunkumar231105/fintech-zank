'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart2, Users, Wallet, ArrowLeftRight, Activity, ShieldAlert,
  FileCheck, FileText, HelpCircle, Settings, Bell, Search, Menu,
  ChevronLeft, ChevronRight, LogOut, AlertTriangle
} from 'lucide-react';
import '../dashboard/Dashboard.css';

import AdminOverview from './pages/AdminOverview';
import AdminUsers from './pages/AdminUsers';
import AdminWallets from './pages/AdminWallets';
import AdminTransactions from './pages/AdminTransactions';
import AdminReconciliation from './pages/AdminReconciliation';
import AdminRisk from './pages/AdminRisk';
import AdminCompliance from './pages/AdminCompliance';
import AdminAudit from './pages/AdminAudit';
import AdminSupport from './pages/AdminSupport';
import AdminSettings from './pages/AdminSettings';
import { userService } from '../../../src/services/userService';
import { clearSessionToken } from '../../../src/services/apiClient';
import { adminService } from '../../../src/services/adminService';

const navItems = [
  { path: '', label: 'Overview', icon: BarChart2 },
  { path: 'manage-users', label: 'Manage Users', icon: Users },
  { path: 'platform-wallets', label: 'Platform Wallets', icon: Wallet },
  { path: 'all-transactions', label: 'All Transactions', icon: ArrowLeftRight },
  { path: 'reconciliation', label: 'Reconciliation', icon: Activity },
  { path: 'risk-intelligence', label: 'Risk Intelligence', icon: ShieldAlert },
  { path: 'compliance-kyc', label: 'Compliance & KYC', icon: FileCheck },
  { path: 'audit-logs', label: 'Audit Logs', icon: FileText },
  { path: 'user-support', label: 'User Support', icon: HelpCircle },
  { path: 'settings', label: 'Platform Settings', icon: Settings },
];

const pageComponentMap = {
  '': <AdminOverview />,
  'manage-users': <AdminUsers />,
  'platform-wallets': <AdminWallets />,
  'all-transactions': <AdminTransactions />,
  reconciliation: <AdminReconciliation />,
  'risk-intelligence': <AdminRisk />,
  'compliance-kyc': <AdminCompliance />,
  'audit-logs': <AdminAudit />,
  'user-support': <AdminSupport />,
  settings: <AdminSettings />,
};

export default function AdminDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentPath = (pathname || '/admin').replace('/admin', '').replace(/^\//, '');
  const sectionPath = currentPath.split('/')[0] || '';
  const currentPage = navItems.find((item) => item.path === sectionPath) || navItems[0];
  const PageComponent = pageComponentMap[sectionPath] || pageComponentMap[''];

  useEffect(() => {
    let active = true;

    Promise.all([userService.getProfile(), adminService.getOverview()])
      .then(([profile, adminOverview]) => {
        if (!active) {
          return;
        }
        if (profile.role !== 'admin') {
          router.replace('/user');
          return;
        }
        setAdminUser(profile);
        setOverview(adminOverview);
      })
      .catch(() => {
        clearSessionToken();
        router.replace('/auth/login');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="dash-wrap admin-mode">
        <div className="dash-content-wrap">
          <main className="dash-main">
            <div className="card" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading admin panel...
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-wrap admin-mode">
      <div className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`dash-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{ borderRight: '1px solid rgba(56,189,248,0.12)', background: 'rgba(10,14,20,0.98)' }}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-orb" style={{ background: 'var(--grad-purple)' }} />
            <span className="sidebar-brand-name" style={{ background: 'var(--grad-purple)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Zank Ops</span>
          </div>
          <button className="sidebar-collapse-btn hide-sm" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {!collapsed && (
          <div style={{ padding: '8px 14px 0' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(56,189,248,0.5)' }}>
              Internal Platform
            </span>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const itemPath = item.path === '' ? '/admin' : `/admin/${item.path}`;
            const isActive = pathname === itemPath || (item.path === '' && pathname === '/admin');
            return (
              <Link key={item.path} href={itemPath} className={`nav-link ${isActive ? 'active' : ''}`} title={collapsed ? item.label : ''} onClick={() => setMobileOpen(false)}>
                <span className="nav-link-icon"><item.icon size={18} /></span>
                <span className="nav-link-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-sm" style={{ color: 'var(--blue)', borderColor: 'rgba(56,189,248,0.3)', background: 'var(--blue-dim)' }}>
              {(adminUser?.firstName?.[0] || 'A')}{(adminUser?.lastName?.[0] || 'D')}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{adminUser?.firstName} {adminUser?.lastName}</div>
              <div className="sidebar-user-email" style={{ color: 'var(--blue)' }}>Logged in as: {adminUser?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="dash-content-wrap">
        <header className="dash-header">
          <button className="header-hamburger" onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth <= 768) {
              setMobileOpen((value) => !value);
            } else {
              setCollapsed((value) => !value);
            }
          }}>
            <Menu size={18} />
          </button>

          <span className="header-page-title" style={{ color: 'var(--blue)' }}>Admin · {currentPage.label}</span>

          <div className="header-search-wrap hide-sm">
            <Search size={16} color="var(--text-muted)" />
            <input className="header-search-input" type="text" placeholder="Search UID, email, wallet ID..." readOnly />
          </div>

          <div className="header-actions">
            <div className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '5px 10px' }}>
              <AlertTriangle size={12} /> {overview?.kpis?.pending_kyc || 0} Pending KYC
            </div>
            <button className="header-icon-btn" onClick={() => router.push('/admin/audit-logs')}>
              <Bell size={17} />
              {Boolean(overview?.recent_actions?.length) && <span className="notif-dot" />}
            </button>
            <button className="header-icon-btn" onClick={() => { clearSessionToken(); router.push('/auth/login'); }} title="Sign Out">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="dash-main">
          {PageComponent}
        </main>
      </div>
    </div>
  );
}
