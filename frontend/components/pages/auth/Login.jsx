import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter as useNavigate } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      if (new TextEncoder().encode(password).length > 72) {
        throw new Error('Password must be 72 bytes or fewer');
      }

      const res = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      
      setSuccessMsg(data.message || 'OTP sent to your email.');
      setTimeout(() => {
        navigate.push(`/auth/otp?email=${encodeURIComponent(email)}`);
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch(apiUrl('/auth/google'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to get Google login URL');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to get Google login URL');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* LEFT BRANDING PANEL */}
        <div className="auth-panel-left">
          <div className="auth-logo-wrap">
            <div className="auth-logo-orb" />
            <span className="auth-brand-name">Zank AI</span>
          </div>

          <div className="auth-left-content">
            <h2 className="auth-tagline">
              Finance that <span>thinks</span> with you.
            </h2>
            <p className="auth-left-sub">
              The AI-powered account built for how Gen Z actually lives — intuitive, instant, and beautifully designed.
            </p>
            <div className="auth-trust-list">
              {[
                'Send & receive money in seconds',
                'AI insights that predict your spending',
                'Virtual cards with instant controls',
                'Bank-grade security, always on',
              ].map((item, i) => (
                <div key={i} className="auth-trust-item">
                  <div className="auth-trust-dot" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="auth-left-stats">
            <div className="auth-stat-item">
              <div className="auth-stat-num">2M+</div>
              <div className="auth-stat-label">Active users</div>
            </div>
            <div className="auth-stat-item">
              <div className="auth-stat-num">$45M</div>
              <div className="auth-stat-label">AUM managed</div>
            </div>
            <div className="auth-stat-item">
              <div className="auth-stat-num">4.9★</div>
              <div className="auth-stat-label">App rating</div>
            </div>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="auth-panel-right">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Welcome back 👋</h1>
            <p className="auth-form-sub">Sign in to your Zank AI account.</p>
          </div>

          {/* Role Toggle */}
          <div className="auth-role-tabs">
            <div className={`auth-role-tab ${role === 'user' ? 'active' : ''}`} onClick={() => setRole('user')}>👤 User</div>
            <div className={`auth-role-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>🛡️ Admin</div>
          </div>

          {/* Google Sign In */}
          <button className="btn-google-auth" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17Z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07Z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.48a4.77 4.77 0 0 1 4.48-3.3Z"/></svg>
            Continue with Google
          </button>

          <div className="divider">or sign in with email</div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label">Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>Forgot?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {errorMsg && <div style={{ color: '#f87171', fontSize: '0.875rem', marginTop: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{errorMsg}</div>}
            {successMsg && <div style={{ color: '#34d399', fontSize: '0.875rem', marginTop: '1rem', background: 'rgba(52,211,153,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{successMsg}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 20, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : `Sign In ${role === 'admin' ? 'as Admin' : ''}`}
            </button>
          </form>

          <div className="auth-footer-link" style={{ marginTop: 24 }}>
            Don't have an account? <Link href="/auth/register">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
