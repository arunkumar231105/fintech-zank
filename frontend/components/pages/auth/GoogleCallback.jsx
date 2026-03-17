'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import './Auth.css';

export default function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Signing you in with Google...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Google sign-in was cancelled or failed.');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Missing Google authorization code.');
      return;
    }

    let cancelled = false;

    async function completeGoogleLogin() {
      try {
        const res = await fetch(apiUrl('/auth/google/callback'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'Google sign-in failed');
        }

        if (cancelled) {
          return;
        }

        localStorage.setItem('accessToken', data.accessToken);
        setStatus('success');
        setMessage('Google sign-in successful. Redirecting...');

        const nextRoute = data.user?.role === 'admin' ? '/admin' : '/user';
        setTimeout(() => router.replace(nextRoute), 800);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setStatus('error');
        setMessage(err.message || 'Google sign-in failed');
      }
    }

    completeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="auth-center-page">
      <div className="auth-center-card">
        <div className="auth-center-logo">
          <div className="auth-logo-orb" />
          <span className="auth-brand-name">Zank AI</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          {status === 'loading' && <Loader2 size={40} className="animate-spin" color="var(--primary)" />}
          {status === 'success' && <CheckCircle2 size={40} color="var(--success)" />}
          {status === 'error' && <XCircle size={40} color="#f87171" />}
        </div>

        <h1 className="auth-form-title" style={{ marginBottom: 10, textAlign: 'center' }}>
          {status === 'loading' ? 'Connecting Google...' : status === 'success' ? 'Signed in' : 'Google Sign-In Failed'}
        </h1>
        <p className="auth-form-sub" style={{ marginBottom: 28, textAlign: 'center', lineHeight: 1.7 }}>
          {message}
        </p>

        {status === 'error' && (
          <Link href="/auth/login">
            <button className="auth-submit-btn">Back to Login</button>
          </Link>
        )}
      </div>
    </div>
  );
}
