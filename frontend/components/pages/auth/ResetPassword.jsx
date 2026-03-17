import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter as useNavigate, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, CheckCircle2, ArrowLeft, XCircle, Loader2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthColors = ['', '#f87171', '#fbbf24', '#38bdf8', '#34d399'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid token. No token provided.');
      setValidatingToken(false);
      return;
    }

    fetch(apiUrl(`/auth/verify-reset-token/${token}`))
      .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
      .then(res => {
        if (!res.ok) {
          setTokenError(res.data.detail || 'This link has expired. Please request a new one.');
        }
      })
      .catch(err => {
        setTokenError('Network error checking token. Please try again later.');
      })
      .finally(() => {
        setValidatingToken(false);
      });
  }, [token]);

  const handleReset = async () => {
    if (password !== confirm) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (password.length < 8) return;
    if (new TextEncoder().encode(password).length > 72) {
      setErrorMsg('Password must be 72 bytes or fewer');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(apiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          new_password: password, 
          confirm_password: confirm 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password reset failed');
      
      setDone(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate.push('/auth/login');
      }, 2000);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="auth-center-page">
        <div className="auth-center-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo-wrap" style={{ marginBottom: 36, justifyContent: 'center' }}>
            <div className="auth-logo-orb" />
            <span className="auth-brand-name">Zank AI</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Loader2 size={40} className="animate-spin" color="var(--primary)" />
          </div>
          <h2 className="auth-form-title">Verifying link...</h2>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="auth-center-page">
        <div className="auth-center-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo-wrap" style={{ marginBottom: 36, justifyContent: 'center' }}>
            <div className="auth-logo-orb" />
            <span className="auth-brand-name">Zank AI</span>
          </div>
          <div className="verify-icon-wrap" style={{ margin: '0 auto 24px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <XCircle size={36} color="#f87171" />
          </div>
          <h2 className="auth-form-title" style={{ marginBottom: 16 }}>{tokenError}</h2>
          <Link href="/auth/forgot-password">
            <button className="auth-submit-btn">Request a new link</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-center-page">
      <div className="auth-center-card" style={{ textAlign: 'left' }}>
        <div className="auth-logo-wrap" style={{ marginBottom: 36 }}>
          <div className="auth-logo-orb" />
          <span className="auth-brand-name">Zank AI</span>
        </div>

        {!done ? (
          <>
            <div className="auth-form-header">
              <h1 className="auth-form-title">Set new password</h1>
              <p className="auth-form-sub">Must be at least 8 characters with a number and uppercase letter.</p>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength indicator */}
              {password && (
                <div style={{ marginTop: 10 }}>
                  <div className="pass-strength-bars">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="pass-strength-bar"
                        style={{ background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: strengthColors[strength], marginTop: 5, fontWeight: 600 }}>
                    {strengthLabels[strength]}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{
                    paddingLeft: 40, paddingRight: 44,
                    borderColor: confirm && confirm !== password ? 'var(--danger)' : undefined
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {errorMsg && <div style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{errorMsg}</div>}

            <button
              className="auth-submit-btn"
              onClick={handleReset}
              disabled={loading || password.length < 8 || password !== confirm}
              style={{ opacity: (password.length >= 8 && password === confirm && !loading) ? 1 : 0.5 }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <div className="auth-footer-link" style={{ marginTop: 20 }}>
              <Link href="/auth/login" style={{ color: 'var(--text-muted)' }}>Remember your password? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</span></Link>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="verify-icon-wrap" style={{ margin: '0 auto 24px' }}>
              <CheckCircle2 size={36} color="var(--success)" />
            </div>
            <h2 className="auth-form-title">Password reset successfully!</h2>
            <p className="auth-form-sub" style={{ marginBottom: 28, marginTop: 8 }}>
              Redirecting you to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
