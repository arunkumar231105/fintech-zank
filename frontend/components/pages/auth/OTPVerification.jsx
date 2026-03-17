import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter as useNavigate, useSearchParams } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import './Auth.css';

export default function OTPVerification() {
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const inputs = useRef([]);
  const handleChange = (e, i) => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val.slice(-1);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };
  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !e.target.value && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus();
  };
  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').split('').slice(0, 6);
    paste.forEach((char, i) => { if (inputs.current[i]) inputs.current[i].value = char; });
    inputs.current[Math.min(paste.length, 5)]?.focus();
    e.preventDefault();
  };

  const verifyOTP = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const code = inputs.current.map(i => i.value).join('');
      if (code.length < 6) throw new Error('Enter 6 digit OTP');

      const res = await fetch(apiUrl('/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp: code })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Verification failed');
      
      localStorage.setItem('accessToken', data.accessToken);
      
      if (data.user.role === 'admin') {
        navigate.push('/admin');
      } else {
        navigate.push('/user');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-center-page">
      <div className="auth-center-card">
        <div className="auth-center-logo">
          <div className="auth-logo-orb" />
          <span className="auth-brand-name">Zank AI</span>
        </div>

        {/* Icon */}
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--blue-dim)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Shield size={30} color="var(--blue)" />
        </div>

        <h1 className="auth-form-title" style={{ marginBottom: 8 }}>Verify your identity</h1>
        <p className="auth-form-sub" style={{ marginBottom: 32 }}>
          We sent a 6-digit code to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>.<br />
          Enter it below to continue.
        </p>

        <div className="otp-grid" style={{ marginBottom: 28 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              placeholder="·"
              onChange={e => handleChange(e, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              onPaste={handlePaste}
            />
          ))}
        </div>

        {errorMsg && <div style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{errorMsg}</div>}

        <button
          className="auth-submit-btn"
          style={{ marginBottom: 16, opacity: loading ? 0.7 : 1 }}
          onClick={verifyOTP}
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Didn't receive the code?{' '}
          <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Resend in 0:42</span>
        </p>

        <div style={{ marginTop: 12 }}>
          <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
