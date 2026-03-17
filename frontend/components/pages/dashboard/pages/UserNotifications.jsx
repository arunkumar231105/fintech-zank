'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Gift, Info, MessageCircle, Shield, Wallet } from 'lucide-react';
import { notificationService } from '../../../../src/services/notificationService';
import { useAppData } from '../../../../src/context/AppDataContext';

const iconMap = {
  transaction: Wallet,
  security: Shield,
  rewards: Gift,
  support: MessageCircle,
  system: Info,
};

export default function UserNotifications() {
  const { refreshNotifications, markNotificationRead, markAllNotificationsRead, notificationMeta } = useAppData();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (nextPage = page, nextFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const result = await notificationService.getNotifications({ page: nextPage, limit: 10, unread_only: nextFilter === 'unread' });
      setItems(result.items);
      setPagination(result.pagination);
      setPage(nextPage);
      await refreshNotifications({ page: 1, limit: 5 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, filter);
  }, [filter]);

  const handleMarkRead = async (notificationId) => {
    await markNotificationRead(notificationId);
    setItems((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated with account activity, rewards, security events, and support updates.</p>
        </div>
        <div className="flex gap-2">
          {['all', 'unread'].map((value) => (
            <button key={value} className={`seg-tab ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{value}</button>
          ))}
          <button className="btn btn-outline btn-sm" onClick={async () => { await markAllNotificationsRead(); load(page, filter); }}>Mark All as Read</button>
        </div>
      </div>

      <div className="card mb-4" style={{ display: 'inline-flex' }}>
        <Bell size={14} style={{ marginRight: 8 }} /> {notificationMeta.unreadCount} unread
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading notifications...
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>You're all caught up.</div>
      ) : (
        <div className="card">
          {items.map((item, index) => {
            const Icon = iconMap[item.type] || Bell;
            return (
              <button
                key={item.id}
                className={`notif-item ${item.read ? '' : 'unread'}`}
                onClick={() => handleMarkRead(item.id)}
                style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', opacity: item.read ? 0.78 : 1 }}
              >
                {!item.read && <div className="notif-dot-unread" />}
                <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="heading-sm">{item.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.message}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 6 }}>{new Date(item.timestamp).toLocaleString()}</div>
                </div>
              </button>
            );
          })}
          {pagination.pages > 1 && (
            <div className="flex justify-between" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-glass)' }}>
              <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1, filter)}>Previous</button>
              <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1, filter)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
