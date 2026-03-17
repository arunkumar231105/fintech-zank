'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { userService } from '../services/userService';
import { walletService } from '../services/walletService';
import { cardService } from '../services/cardService';
import { savingsService } from '../services/savingsService';
import { analyticsService } from '../services/analyticsService';
import { rewardsService } from '../services/rewardsService';
import { notificationService } from '../services/notificationService';
import { apiClient, clearSessionToken, normalizeApiError } from '../services/apiClient';

const AppDataContext = createContext(null);

// Context is enough here because only dashboard-wide user and wallet state is shared.
// Redux would add extra boilerplate without solving a real complexity problem in this repo.
export function AppDataProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [savingsSummary, setSavingsSummary] = useState({ total_saved: 0, total_target: 0, active_goals: 0 });
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [rewardOffers, setRewardOffers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationMeta, setNotificationMeta] = useState({ unreadCount: 0, pagination: { page: 1, limit: 5, total: 0, pages: 0 } });
  const [loading, setLoading] = useState({
    bootstrap: true,
    profile: false,
    wallet: false,
    preferences: false,
    linkedAccounts: false,
    cards: false,
    savings: false,
    analytics: false,
    rewards: false,
    notifications: false,
  });
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current, { id, tone: 'info', ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 4200);
  }, []);

  const updateWalletSnapshot = useCallback((walletPatch, transaction) => {
    if (walletPatch) {
      setWallet((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          ...walletPatch,
          recentTransactions: transaction
            ? [transaction, ...(current.recentTransactions || [])].slice(0, 5)
            : current.recentTransactions || [],
        };
      });
      return;
    }

    if (transaction) {
      setWallet((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          recentTransactions: [transaction, ...(current.recentTransactions || [])].slice(0, 5),
        };
      });
    }
  }, []);

  const bootstrap = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('accessToken');
    if (!token) {
      setLoading((current) => ({ ...current, bootstrap: false }));
      return;
    }

    setLoading((current) => ({
      ...current,
      bootstrap: true,
      profile: true,
      wallet: true,
      preferences: true,
      linkedAccounts: true,
      cards: true,
      savings: true,
      analytics: true,
      rewards: true,
      notifications: true,
    }));

    const [profileRes, walletRes, prefsRes, linkedRes, cardsRes, savingsRes, overviewRes, healthRes, rewardsRes, offersRes, notificationsRes] = await Promise.allSettled([
      userService.getProfile(),
      walletService.getWallet(),
      userService.getNotificationPreferences(),
      userService.getLinkedAccounts(),
      cardService.getCards(),
      savingsService.getGoals(),
      analyticsService.getOverview(),
      analyticsService.getHealthScore(),
      rewardsService.getRewards(),
      rewardsService.getOffers(),
      notificationService.getNotifications({ page: 1, limit: 5 }),
    ]);

    if (profileRes.status === 'fulfilled') {
      setUser(profileRes.value);
    } else {
      const profileError = normalizeApiError(profileRes.reason);
      if (profileError.status === 401) {
        clearSessionToken();
      } else {
        pushToast({ tone: 'error', message: profileError.message });
      }
    }

    if (walletRes.status === 'fulfilled') {
      setWallet(walletRes.value);
    } else {
      pushToast({ tone: 'error', message: normalizeApiError(walletRes.reason).message });
    }

    if (prefsRes.status === 'fulfilled') {
      setNotificationPreferences(prefsRes.value);
    }

    if (linkedRes.status === 'fulfilled') {
      setLinkedAccounts(linkedRes.value);
    }

    if (cardsRes.status === 'fulfilled') {
      setCards(cardsRes.value);
    }

    if (savingsRes.status === 'fulfilled') {
      setSavingsGoals(savingsRes.value.goals);
      setSavingsSummary(savingsRes.value.summary);
    }

    if (overviewRes.status === 'fulfilled') {
      setAnalyticsOverview(overviewRes.value);
    }

    if (healthRes.status === 'fulfilled') {
      setHealthScore(healthRes.value);
    }

    if (rewardsRes.status === 'fulfilled') {
      setRewards(rewardsRes.value);
    }

    if (offersRes.status === 'fulfilled') {
      setRewardOffers(offersRes.value);
    }

    if (notificationsRes.status === 'fulfilled') {
      setNotifications(notificationsRes.value.items);
      setNotificationMeta({
        unreadCount: notificationsRes.value.unreadCount,
        pagination: notificationsRes.value.pagination,
      });
    }

    setLoading({
      bootstrap: false,
      profile: false,
      wallet: false,
      preferences: false,
      linkedAccounts: false,
      cards: false,
      savings: false,
      analytics: false,
      rewards: false,
      notifications: false,
    });
  }, [pushToast]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const refreshWallet = useCallback(async () => {
    setLoading((current) => ({ ...current, wallet: true }));
    try {
      const nextWallet = await walletService.getWallet();
      setWallet(nextWallet);
      return nextWallet;
    } finally {
      setLoading((current) => ({ ...current, wallet: false }));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setLoading((current) => ({ ...current, profile: true }));
    try {
      const profile = await userService.getProfile();
      setUser(profile);
      return profile;
    } finally {
      setLoading((current) => ({ ...current, profile: false }));
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const saved = await userService.updateProfile(payload);
    setUser((current) => ({
      ...(current || {}),
      firstName: saved.first_name,
      lastName: saved.last_name,
      phone: saved.phone,
      country: saved.country,
      timezone: saved.timezone,
    }));
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const avatarUrl = await userService.uploadAvatar(file);
    setUser((current) => ({ ...(current || {}), avatarUrl }));
    return avatarUrl;
  }, []);

  const saveNotificationPreferences = useCallback(async (payload) => {
    const saved = await userService.updateNotificationPreferences(payload);
    setNotificationPreferences(saved);
    return saved;
  }, []);

  const addLinkedAccount = useCallback(async (payload) => {
    const account = await userService.addLinkedAccount(payload);
    setLinkedAccounts((current) => [...current, account]);
    return account;
  }, []);

  const removeLinkedAccount = useCallback(async (accountId) => {
    await userService.removeLinkedAccount(accountId);
    setLinkedAccounts((current) => current.filter((account) => account.id !== accountId));
  }, []);

  const refreshCards = useCallback(async () => {
    setLoading((current) => ({ ...current, cards: true }));
    try {
      const nextCards = await cardService.getCards();
      setCards(nextCards);
      return nextCards;
    } finally {
      setLoading((current) => ({ ...current, cards: false }));
    }
  }, []);

  const refreshSavings = useCallback(async () => {
    setLoading((current) => ({ ...current, savings: true }));
    try {
      const nextSavings = await savingsService.getGoals();
      setSavingsGoals(nextSavings.goals);
      setSavingsSummary(nextSavings.summary);
      return nextSavings;
    } finally {
      setLoading((current) => ({ ...current, savings: false }));
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    setLoading((current) => ({ ...current, analytics: true }));
    try {
      const [overview, health] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getHealthScore(),
      ]);
      setAnalyticsOverview(overview);
      setHealthScore(health);
      return { overview, health };
    } finally {
      setLoading((current) => ({ ...current, analytics: false }));
    }
  }, []);

  const refreshRewards = useCallback(async () => {
    setLoading((current) => ({ ...current, rewards: true }));
    try {
      const [rewardSummary, offers] = await Promise.all([
        rewardsService.getRewards(),
        rewardsService.getOffers(),
      ]);
      setRewards(rewardSummary);
      setRewardOffers(offers);
      return { rewardSummary, offers };
    } finally {
      setLoading((current) => ({ ...current, rewards: false }));
    }
  }, []);

  const refreshNotifications = useCallback(async (params = { page: 1, limit: 5 }) => {
    setLoading((current) => ({ ...current, notifications: true }));
    try {
      const result = await notificationService.getNotifications(params);
      setNotifications(result.items);
      setNotificationMeta({ unreadCount: result.unreadCount, pagination: result.pagination });
      return result;
    } finally {
      setLoading((current) => ({ ...current, notifications: false }));
    }
  }, []);

  const withdrawFunds = useCallback(async (payload) => {
    const result = await walletService.withdraw(payload);
    updateWalletSnapshot(result.wallet, result.transaction);
    return result;
  }, [updateWalletSnapshot]);

  const sendWithdrawOtp = useCallback(async (payload) => {
    return walletService.sendWithdrawOtp(payload);
  }, []);

  const sendFunds = useCallback(async (payload) => {
    const result = await walletService.send(payload);
    updateWalletSnapshot(result.wallet, result.transaction);
    return result;
  }, [updateWalletSnapshot]);

  const requestFunds = useCallback(async (payload) => {
    return walletService.request(payload);
  }, []);

  const createSavingsGoal = useCallback(async (payload) => {
    const goal = await savingsService.createGoal(payload);
    setSavingsGoals((current) => [goal, ...current]);
    setSavingsSummary((current) => ({
      ...current,
      active_goals: (current.active_goals || 0) + 1,
      total_target: Number(current.total_target || 0) + goal.targetAmount,
    }));
    refreshAnalytics();
    return goal;
  }, [refreshAnalytics]);

  const updateSavingsGoal = useCallback(async (goalId, payload) => {
    const goal = await savingsService.updateGoal(goalId, payload);
    setSavingsGoals((current) => current.map((entry) => (entry.id === goalId ? goal : entry)));
    await refreshSavings();
    refreshAnalytics();
    return goal;
  }, [refreshAnalytics, refreshSavings]);

  const contributeToSavingsGoal = useCallback(async (goalId, payload) => {
    const result = await savingsService.contribute(goalId, payload);
    setSavingsGoals((current) => current.map((entry) => (entry.id === goalId ? result.goal : entry)));
    updateWalletSnapshot(result.wallet, result.transaction || null);
    await refreshSavings();
    refreshAnalytics();
    return result;
  }, [refreshAnalytics, refreshSavings, updateWalletSnapshot]);

  const deleteSavingsGoal = useCallback(async (goalId) => {
    const result = await savingsService.deleteGoal(goalId);
    setSavingsGoals((current) => current.filter((entry) => entry.id !== goalId));
    updateWalletSnapshot(result.wallet || null, null);
    await refreshSavings();
    refreshAnalytics();
    return result;
  }, [refreshAnalytics, refreshSavings, updateWalletSnapshot]);

  const activateRewardOffer = useCallback(async (offerId) => {
    const result = await rewardsService.activateOffer(offerId);
    setRewardOffers((current) => current.map((offer) => (offer.id === offerId ? { ...offer, active: true } : offer)));
    refreshNotifications();
    return result;
  }, [refreshNotifications]);

  const redeemRewardPoints = useCallback(async (pointsToRedeem) => {
    const result = await rewardsService.redeemPoints(pointsToRedeem);
    updateWalletSnapshot(result.wallet || null, null);
    await refreshRewards();
    refreshNotifications();
    return result;
  }, [refreshNotifications, refreshRewards, updateWalletSnapshot]);

  const markNotificationRead = useCallback(async (notificationId) => {
    await notificationService.markRead(notificationId);
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
    setNotificationMeta((current) => ({ ...current, unreadCount: Math.max(0, current.unreadCount - 1) }));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await notificationService.markAllRead();
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setNotificationMeta((current) => ({ ...current, unreadCount: 0 }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const token = window.localStorage.getItem('accessToken');
    if (!token) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshNotifications({ page: 1, limit: 5 }).catch(() => {});
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [refreshNotifications]);

  const createCard = useCallback(async (payload) => {
    const card = await cardService.createCard(payload);
    setCards((current) => [card, ...current]);
    return card;
  }, []);

  const updateCardStatus = useCallback(async (cardId, status) => {
    const card = await cardService.updateStatus(cardId, status);
    setCards((current) => current.map((entry) => (String(entry.id) === String(cardId) ? card : entry)));
    return card;
  }, []);

  const updateCardLimits = useCallback(async (cardId, payload) => {
    const card = await cardService.updateLimits(cardId, payload);
    setCards((current) => current.map((entry) => (String(entry.id) === String(cardId) ? card : entry)));
    return card;
  }, []);

  const updateCardControls = useCallback(async (cardId, payload) => {
    const card = await cardService.updateControls(cardId, payload);
    setCards((current) => current.map((entry) => (String(entry.id) === String(cardId) ? card : entry)));
    return card;
  }, []);

  const deleteCard = useCallback(async (cardId) => {
    await cardService.deleteCard(cardId);
    setCards((current) => current.filter((entry) => String(entry.id) !== String(cardId)));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore logout failures and still clear local session.
    } finally {
      clearSessionToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }, []);

  const value = useMemo(() => ({
    user,
    wallet,
    cards,
    savingsGoals,
    savingsSummary,
    analyticsOverview,
    healthScore,
    rewards,
    rewardOffers,
    notifications,
    notificationMeta,
    notificationPreferences,
    linkedAccounts,
    loading,
    pushToast,
    refreshProfile,
    refreshWallet,
    refreshCards,
    refreshSavings,
    refreshAnalytics,
    refreshRewards,
    refreshNotifications,
    updateProfile,
    uploadAvatar,
    saveNotificationPreferences,
    addLinkedAccount,
    removeLinkedAccount,
    sendWithdrawOtp,
    withdrawFunds,
    sendFunds,
    requestFunds,
    createSavingsGoal,
    updateSavingsGoal,
    contributeToSavingsGoal,
    deleteSavingsGoal,
    activateRewardOffer,
    redeemRewardPoints,
    markNotificationRead,
    markAllNotificationsRead,
    createCard,
    updateCardStatus,
    updateCardLimits,
    updateCardControls,
    deleteCard,
    logout,
  }), [
    user,
    wallet,
    cards,
    savingsGoals,
    savingsSummary,
    analyticsOverview,
    healthScore,
    rewards,
    rewardOffers,
    notifications,
    notificationMeta,
    notificationPreferences,
    linkedAccounts,
    loading,
    pushToast,
    refreshProfile,
    refreshWallet,
    refreshCards,
    refreshSavings,
    refreshAnalytics,
    refreshRewards,
    refreshNotifications,
    updateProfile,
    uploadAvatar,
    saveNotificationPreferences,
    addLinkedAccount,
    removeLinkedAccount,
    sendWithdrawOtp,
    withdrawFunds,
    sendFunds,
    requestFunds,
    createSavingsGoal,
    updateSavingsGoal,
    contributeToSavingsGoal,
    deleteSavingsGoal,
    activateRewardOffer,
    redeemRewardPoints,
    markNotificationRead,
    markAllNotificationsRead,
    createCard,
    updateCardStatus,
    updateCardLimits,
    updateCardControls,
    deleteCard,
    logout,
  ]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              style={{
                minWidth: 260,
                maxWidth: 360,
                padding: '14px 16px',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.12)',
                background: '#111522',
                color: '#f8fafc',
                boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {toast.tone === 'error' ? 'Error' : toast.tone === 'success' ? 'Success' : 'Notice'}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
