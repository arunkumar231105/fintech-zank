import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import './Auth.css';

export default function EmailVerification() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Verifying your email...');
  
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }
    
    fetch(apiUrl('/auth/verify-email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
    .then(res => {
      if (res.ok) {
        setStatus('success');
        setMessage(res.data.message || 'Email verified! You can now login.');
      } else {
        setStatus('error');
        setMessage(res.data.detail || 'Verification failed. Token may be expired.');
      }
    })
    .catch(err => {
      setStatus('error');
      setMessage('Network error verifying email.');
    });
  }, [token]);

  return (
    <div className="auth-center-page">
      <div className="auth-center-card">
        {/* Logo */}
        <div className="auth-center-logo">
          <div className="auth-logo-orb" />
          <span className="auth-brand-name">Zank AI</span>
        </div>

        {/* Dynamic Icon */}
        <div className="verify-icon-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          {status === 'loading' && <Loader2 size={40} className="animate-spin" color="var(--primary)" />}
          {status === 'success' && <CheckCircle2 size={40} color="var(--success)" />}
          {status === 'error' && <XCircle size={40} color="#f87171" />}
        </div>

        <h1 className="auth-form-title" style={{ marginBottom: 10, textAlign: 'center' }}>
          {status === 'loading' ? 'Verifying...' : status === 'success' ? 'You\'re all set! 🎉' : 'Verification Failed'}
        </h1>
        <p className="auth-form-sub" style={{ marginBottom: 32, lineHeight: 1.7, textAlign: 'center' }}>
          {message}
        </p>

        {/* Perks list */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
          {[
            '🚀 AI-powered spending insights active',
            '💳 Your virtual card is ready to use',
            '🎁 5,000 welcome bonus points added',
            '🔒 Bank-grade security enabled',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border-glass)' : 'none', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {item}
            </div>
          ))}
        </div>

        <Link href="/auth/login">
          <button className="auth-submit-btn" style={{ marginBottom: 14 }}>
            Go to Login
          </button>
        </Link>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Need help?{' '}
          <a href="mailto:support@zankmail.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>Contact support</a>
        </p>
      </div>
    </div>
  );
}
