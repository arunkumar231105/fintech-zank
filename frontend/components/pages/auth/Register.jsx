import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter as useNavigate } from 'next/navigation';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [showPass, setShowPass] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthColors = ['', '#f87171', '#fbbf24', '#38bdf8', '#34d399'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      if (new TextEncoder().encode(password).length > 72) {
        throw new Error('Password must be 72 bytes or fewer');
      }

      const res = await fetch(apiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          role
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      setSuccessMsg(data.message || 'Registration submitted. Please verify your email before login.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* LEFT PANEL */}
        <div className="auth-panel-left">
          <div className="auth-logo-wrap">
            <div className="auth-logo-orb" />
            <span className="auth-brand-name">Zank AI</span>
          </div>

          <div className="auth-left-content">
            <h2 className="auth-tagline">
              Join <span>2 million</span> smart savers.
            </h2>
            <p className="auth-left-sub">
              Create your account in under 2 minutes. No paperwork, no hidden fees, instant virtual card.
            </p>
            <div className="auth-trust-list">
              {[
                'Free account — always',
                'Instant virtual card on signup',
                '5,000 welcome bonus points',
                'AI spending coach included',
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
              <div className="auth-stat-num">2 min</div>
              <div className="auth-stat-label">Setup time</div>
            </div>
            <div className="auth-stat-item">
              <div className="auth-stat-num">$0</div>
              <div className="auth-stat-label">Sign-up fee</div>
            </div>
            <div className="auth-stat-item">
              <div className="auth-stat-num">256-bit</div>
              <div className="auth-stat-label">Encryption</div>
            </div>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="auth-panel-right">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create account</h1>
            <p className="auth-form-sub">Start your financial journey today.</p>
          </div>

          {/* Role Toggle */}
          <div className="auth-role-tabs">
            <div className={`auth-role-tab ${role === 'user' ? 'active' : ''}`} onClick={() => setRole('user')}>👤 User</div>
            <div className={`auth-role-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>🛡️ Admin</div>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input className="form-input" placeholder="Jordan" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ paddingLeft: 36 }} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" placeholder="Rivera" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 36 }} required />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: 36, paddingRight: 44 }} required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Max password length: 72 bytes
              </div>
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div className="pass-strength-bars">
                    {[1,2,3,4].map(i => <div key={i} className="pass-strength-bar" style={{ background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.08)' }} />)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strengthColors[strength], fontWeight: 600, marginTop: 4, display: 'inline-block' }}>{strengthLabels[strength]}</span>
                </div>
              )}
            </div>

            {/* Agreement */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, marginBottom: 20 }}>
              <input type="checkbox" id="agree" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3, accentColor: 'var(--primary)', cursor: 'pointer', width: 15, height: 15 }} />
              <label htmlFor="agree" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                I agree to Zank's{' '}
                <a href="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Terms of Service</a>{' '}
                and{' '}
                <a href="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</a>
              </label>
            </div>

            {errorMsg && <div style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{errorMsg}</div>}
            {successMsg && <div style={{ color: '#34d399', fontSize: '0.875rem', marginBottom: '1rem', background: 'rgba(52,211,153,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{successMsg}</div>}

            <button type="submit" className="auth-submit-btn" disabled={!agree || loading} style={{ opacity: agree && !loading ? 1 : 0.5 }}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer-link" style={{ marginTop: 20 }}>
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
