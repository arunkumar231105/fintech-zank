import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import './Auth.css';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendLink = async () => {
    if (!email) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(apiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send reset link');
      setSent(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-center-page">
      <div className="auth-center-card" style={{ textAlign: 'left' }}>
        {/* Logo */}
        <div className="auth-logo-wrap" style={{ marginBottom: 36 }}>
          <div className="auth-logo-orb" />
          <span className="auth-brand-name">Zank AI</span>
        </div>

        {!sent ? (
          <>
            <div className="auth-form-header">
              <h1 className="auth-form-title">Forgot password?</h1>
              <p className="auth-form-sub">
                No worries — we'll send a reset link to your email.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            {errorMsg && <div style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{errorMsg}</div>}

            <button
              className="auth-submit-btn"
              onClick={handleSendLink}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              <Send size={16} style={{ display: 'inline', marginRight: 8 }} />
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="auth-footer-link" style={{ marginTop: 24 }}>
              <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 500 }}>
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="verify-icon-wrap" style={{ width: 72, height: 72, background: 'var(--primary-dim)', border: '1px solid rgba(42,255,196,0.2)' }}>
              <Mail size={30} color="var(--primary)" />
            </div>
            <h2 className="auth-form-title">Check your inbox</h2>
            <p className="auth-form-sub" style={{ marginBottom: 24, marginTop: 8 }}>
              We sent a reset link to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>.
              <br />Check your spam folder if you don't see it.
            </p>
            <Link href="/auth/reset-password">
              <button className="auth-submit-btn" style={{ marginBottom: 16 }}>Open Reset Link</button>
            </Link>
            <div className="auth-footer-link">
              Didn't receive it? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setSent(false)}>Resend</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
