import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Link2, Trash2, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppData } from '../../../../src/context/AppDataContext';
import { getInitials, isValidPhone } from '../../../../src/utils/dashboard';

const tabs = ['Profile', 'Notifications', 'Linked Accounts'];
const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function Modal({ open, title, onClose, children }) {
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
            style={{ width: '100%', maxWidth: 520, borderRadius: 'var(--r-xl)', padding: 28 }}
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

export default function UserSettings() {
  const {
    user,
    notificationPreferences,
    linkedAccounts,
    updateProfile,
    uploadAvatar,
    saveNotificationPreferences,
    addLinkedAccount,
    removeLinkedAccount,
    pushToast,
  } = useAppData();
  const [activeTab, setActiveTab] = useState('Profile');
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    timezone: '',
  });
  const [prefsForm, setPrefsForm] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [linkedModalOpen, setLinkedModalOpen] = useState(false);
  const [linkedForm, setLinkedForm] = useState({
    provider: 'Plaid',
    bankName: '',
    type: 'Checking',
    accountNumber: '',
  });
  const [saving, setSaving] = useState({
    profile: false,
    avatar: false,
    prefs: false,
    linked: false,
    removing: '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        phone: user.phone || '',
        country: user.country || '',
        timezone: user.timezone || '',
      });
      setAvatarPreview(user.avatarUrl || '');
    }
  }, [user]);

  useEffect(() => {
    if (notificationPreferences) {
      setPrefsForm(notificationPreferences);
    }
  }, [notificationPreferences]);

  useEffect(() => () => {
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  const initials = useMemo(() => getInitials(user), [user]);

  const handleProfileSave = async () => {
    if (profileForm.phone && !isValidPhone(profileForm.phone)) {
      pushToast({ tone: 'error', message: 'Enter a valid phone number.' });
      return;
    }

    setSaving((current) => ({ ...current, profile: true }));
    try {
      await updateProfile(profileForm);
      pushToast({ tone: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not update profile.' });
    } finally {
      setSaving((current) => ({ ...current, profile: false }));
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!supportedImageTypes.includes(file.type)) {
      pushToast({ tone: 'error', message: 'Only JPG, PNG, and WEBP files are allowed.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      pushToast({ tone: 'error', message: 'File must be smaller than 5MB.' });
      return;
    }

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      pushToast({ tone: 'error', message: 'Select an image before uploading.' });
      return;
    }

    setSaving((current) => ({ ...current, avatar: true }));
    try {
      await uploadAvatar(avatarFile);
      setAvatarFile(null);
      pushToast({ tone: 'success', message: 'Avatar updated successfully.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Avatar upload failed.' });
    } finally {
      setSaving((current) => ({ ...current, avatar: false }));
    }
  };

  const handlePreferencesSave = async () => {
    if (!prefsForm) {
      return;
    }

    setSaving((current) => ({ ...current, prefs: true }));
    try {
      await saveNotificationPreferences(prefsForm);
      pushToast({ tone: 'success', message: 'Notification preferences updated.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not save preferences.' });
    } finally {
      setSaving((current) => ({ ...current, prefs: false }));
    }
  };

  const handleLinkedAccountAdd = async () => {
    if (!linkedForm.bankName.trim() || !linkedForm.accountNumber.trim()) {
      pushToast({ tone: 'error', message: 'Enter bank name and account number.' });
      return;
    }

    setSaving((current) => ({ ...current, linked: true }));
    try {
      await addLinkedAccount(linkedForm);
      setLinkedModalOpen(false);
      setLinkedForm({
        provider: 'Plaid',
        bankName: '',
        type: 'Checking',
        accountNumber: '',
      });
      pushToast({ tone: 'success', message: 'Linked account added.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not link account.' });
    } finally {
      setSaving((current) => ({ ...current, linked: false }));
    }
  };

  const handleLinkedAccountRemove = async (accountId) => {
    const confirmed = window.confirm('Remove this linked account?');
    if (!confirmed) {
      return;
    }

    setSaving((current) => ({ ...current, removing: accountId }));
    try {
      await removeLinkedAccount(accountId);
      pushToast({ tone: 'success', message: 'Linked account removed.' });
    } catch (error) {
      pushToast({ tone: 'error', message: error.message || 'Could not remove linked account.' });
    } finally {
      setSaving((current) => ({ ...current, removing: '' }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile & Settings</h1>
          <p className="page-subtitle">Manage your profile, alerts, and connected accounts.</p>
        </div>
      </div>

      <div className="tabs mb-5">
        {tabs.map((tab) => (
          <div key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </div>
        ))}
      </div>

      {activeTab === 'Profile' && (
        <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <div className="card text-center" style={{ height: 'fit-content' }}>
            <div className="avatar avatar-xl" style={{ margin: '0 auto 16px', overflow: 'hidden' }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div className="heading-md mb-1">{user?.firstName} {user?.lastName}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 4 }}>{user?.email}</div>
            <div className="badge badge-primary mb-4">{user?.loyaltyTier || 'Bronze'} Member</div>
            <label className="btn btn-outline btn-sm btn-full" style={{ cursor: 'pointer' }}>
              <Camera size={14} /> Choose Photo
              <input type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={handleAvatarChange} />
            </label>
            <button className="btn btn-primary btn-sm btn-full mt-3" onClick={handleAvatarUpload} disabled={!avatarFile || saving.avatar}>
              <Upload size={14} /> {saving.avatar ? 'Uploading...' : 'Upload Avatar'}
            </button>
          </div>

          <div className="card">
            <h2 className="heading-md mb-4">Personal Information</h2>
            <div className="grid-dashboard cols-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={profileForm.first_name} onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={profileForm.last_name} onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={user?.email || ''} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" value={profileForm.country} onChange={(event) => setProfileForm((current) => ({ ...current, country: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <input className="form-input" value={profileForm.timezone} onChange={(event) => setProfileForm((current) => ({ ...current, timezone: event.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm mt-5" onClick={handleProfileSave} disabled={saving.profile}>
              {saving.profile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Notifications' && prefsForm && (
        <div className="card" style={{ maxWidth: 720 }}>
          <h2 className="heading-md mb-4">Notification Preferences</h2>
          {[
            ['transactionAlerts', 'Transaction Alerts', 'Get notified for every debit or credit'],
            ['securityAlerts', 'Security Alerts', 'Suspicious login and security notices'],
            ['promotionalEmails', 'Promotional Emails', 'Cashback offers and product updates'],
            ['budgetWarnings', 'Budget Warnings', 'Alerts when nearing your set limits'],
            ['savingsMilestones', 'Savings Milestones', 'Progress alerts on savings goals'],
            ['weeklyDigest', 'Weekly Digest', 'A weekly account summary'],
          ].map(([key, label, description], index) => (
            <div key={key} className="flex items-center justify-between" style={{ padding: '16px 0', borderBottom: index < 5 ? '1px solid var(--border-glass)' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{description}</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={Boolean(prefsForm[key])}
                  onChange={(event) => setPrefsForm((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <div className="toggle-track"><div className="toggle-thumb" /></div>
              </label>
            </div>
          ))}
          <button className="btn btn-primary btn-sm mt-5" onClick={handlePreferencesSave} disabled={saving.prefs}>
            {saving.prefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}

      {activeTab === 'Linked Accounts' && (
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-md">Linked Bank Accounts</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setLinkedModalOpen(true)}>
              <Link2 size={14} /> Link New Account
            </button>
          </div>

          {linkedAccounts.length === 0 ? (
            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No linked accounts yet</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
                Add a bank account to enable secure withdrawals.
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setLinkedModalOpen(true)}>
                Add your first account
              </button>
            </div>
          ) : (
            linkedAccounts.map((account, index) => (
              <div key={account.id} className="flex items-center gap-3" style={{ padding: '14px 0', borderBottom: index < linkedAccounts.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(42,255,196,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Link2 size={18} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{account.bankName}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{account.type} ···· {account.last4}</div>
                </div>
                <span className="badge badge-success">Linked</span>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleLinkedAccountRemove(account.id)} disabled={saving.removing === account.id}>
                  <Trash2 size={14} /> {saving.removing === account.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={linkedModalOpen} title="Link New Account" onClose={() => setLinkedModalOpen(false)}>
        <div className="grid-dashboard cols-2" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select className="form-input" value={linkedForm.provider} onChange={(event) => setLinkedForm((current) => ({ ...current, provider: event.target.value }))}>
              <option>Plaid</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select className="form-input" value={linkedForm.type} onChange={(event) => setLinkedForm((current) => ({ ...current, type: event.target.value }))}>
              <option>Checking</option>
              <option>Savings</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Bank Name</label>
            <input className="form-input" value={linkedForm.bankName} onChange={(event) => setLinkedForm((current) => ({ ...current, bankName: event.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Account Number</label>
            <input className="form-input" value={linkedForm.accountNumber} onChange={(event) => setLinkedForm((current) => ({ ...current, accountNumber: event.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setLinkedModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleLinkedAccountAdd} disabled={saving.linked}>
            {saving.linked ? 'Linking...' : 'Link Account'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
