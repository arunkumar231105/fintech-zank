'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Zap, Globe, Smartphone, BarChart3, Shield, 
  ChevronDown, CheckCircle2, Star, TrendingUp, Clock, Users,
  CreditCard, Lock, Sparkles, ArrowUpRight
} from 'lucide-react';
import './Landing.css';

const faqs = [
  { q: 'Is Zank AI safe to use?', a: 'Absolutely. We use bank-grade 256-bit encryption, biometric authentication, and real-time fraud monitoring. Your money is protected by FDIC-insured accounts.' },
  { q: 'Are there any fees?', a: 'Our basic plan is completely free. We offer Zank Premium for $9.99/mo with advanced analytics, higher limits, and exclusive offers.' },
  { q: 'How fast are transfers?', a: 'Internal transfers are instant. Bank transfers arrive within 1 business day. International wires take 1-2 days.' },
  { q: 'Can I have a virtual card instantly?', a: 'Yes! Your virtual card is issued within seconds of signing up. Use it online immediately.' },
  { q: 'How does the AI part work?', a: 'Our AI analyzes your spending patterns to give personal insights, auto-categorize transactions, and even predict upcoming expenses.' },
];

const testimonials = [
  { name: 'Alex Kim', handle: '@alexkim', text: 'Zank AI is the only app that makes managing money feel actually fun. The AI insights are wild.', rating: 5, role: 'Content Creator' },
  { name: 'Priya Nair', handle: '@priyan', text: 'Set up my savings goals and auto-transfers in 2 minutes. Never going back to Chase lmao.', rating: 5, role: 'Design Student' },
  { name: 'Marcus Ford', handle: '@mford', text: 'The virtual card feature is ðŸ”¥ especially for subscriptions. Instant freeze, instant unfreeze.', rating: 5, role: 'Freelancer' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="lnav">
        <div className="lnav-inner">
          <Link href="/" className="lnav-brand">
            <div className="brand-orb" />
            <span>Zank AI</span>
          </Link>
          <div className="lnav-links hide-sm">
            <a href="#features">Features</a>
            <a href="#stats">Stats</a>
            <a href="#testimonials">Reviews</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lnav-actions">
            <Link href="/auth/login" className="btn btn-ghost hide-sm">Log In</Link>
            <Link href="/auth/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge reveal">
            <Sparkles size={14} />
            <span>AI-Powered Finance for Gen Z</span>
          </div>
          <h1 className="display-xl hero-headline reveal" style={{transitionDelay: '0.1s'}}>
            Your Money, <br />
            <span className="grad-text-primary">Finally Smart.</span>
          </h1>
          <p className="hero-sub reveal" style={{transitionDelay: '0.2s'}}>
            Take control with AI insights, instant virtual cards, zero-fee transfers, 
            and savings goals that actually work. Built for people who dream big.
          </p>
          <div className="hero-ctas reveal" style={{transitionDelay: '0.3s'}}>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Open Free Account <ArrowRight size={18} />
            </Link>
            <Link href="/user" className="btn btn-outline btn-lg">
              View Dashboard Demo
            </Link>
          </div>
          <div className="hero-trust reveal" style={{transitionDelay: '0.4s'}}>
            <CheckCircle2 size={16} color="var(--primary)" />
            <span>No credit check</span>
            <CheckCircle2 size={16} color="var(--primary)" />
            <span>FDIC Insured</span>
            <CheckCircle2 size={16} color="var(--primary)" />
            <span>SOC 2 Certified</span>
          </div>

          {/* DASHBOARD PREVIEW */}
          <div className="hero-preview reveal" style={{transitionDelay: '0.5s'}}>
            <div className="preview-frame">
              <div className="preview-bar">
                <span /><span /><span />
                <div className="preview-url">app.zank.ai/dashboard</div>
              </div>
              <div className="preview-content">
                <div className="preview-sidebar">
                  <div className="ps-item active" />
                  <div className="ps-item" />
                  <div className="ps-item" />
                  <div className="ps-item" />
                </div>
                <div className="preview-main">
                  <div className="pm-card teal">
                    <div style={{fontSize: '0.65rem', opacity: 0.8}}>Total Balance</div>
                    <div style={{fontSize: '1.25rem', fontWeight: 700, margin: '4px 0'}}>$12,450.80</div>
                    <div style={{fontSize: '0.65rem', opacity: 0.8}}>+$4,250 this month â†‘</div>
                  </div>
                  <div className="pm-row">
                    <div className="pm-mini">
                      <BarChart3 size={14} color="var(--primary)" />
                      <span>+14.5%</span>
                    </div>
                    <div className="pm-mini">
                      <Shield size={14} color="var(--blue)" />
                      <span>KYC âœ“</span>
                    </div>
                    <div className="pm-mini">
                      <CreditCard size={14} color="var(--lavender)" />
                      <span>2 Cards</span>
                    </div>
                  </div>
                  <div className="pm-txlist">
                    {['ðŸŽ Apple Store', 'ðŸ¢ Salary Deposit', 'â˜• Starbucks'].map((tx, i) => (
                      <div key={i} className="pm-tx">
                        <span style={{fontSize: '0.65rem'}}>{tx}</span>
                        <span style={{fontSize: '0.65rem', color: i === 1 ? 'var(--primary)' : 'var(--danger)'}}>{i === 1 ? '+$4,250' : '-$x'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="lstats reveal">
        <div className="lstats-grid">
          <div className="lstat"><div className="lstat-val grad-text-primary">2M+</div><div className="lstat-label">Active Users</div></div>
          <div className="lstat"><div className="lstat-val grad-text-primary">$5B+</div><div className="lstat-label">Processed</div></div>
          <div className="lstat"><div className="lstat-val grad-text-primary">99.9%</div><div className="lstat-label">Uptime</div></div>
          <div className="lstat"><div className="lstat-val grad-text-primary">150+</div><div className="lstat-label">Countries</div></div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lfeatures">
        <div className="section-header text-center reveal">
          <div className="section-chip">Features</div>
          <h2 className="display-md">Everything you need. <span className="grad-text-primary">Nothing you don't.</span></h2>
          <p style={{color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto'}}>We redesigned the banking experience from scratch â€” for the TikTok generation.</p>
        </div>
        <div className="features-grid">
          {[
            { icon: <Zap size={22} />, title: 'Instant Transfers', desc: 'Send money to anyone in seconds. No hidden fees, no delays.', color: 'var(--primary)' },
            { icon: <Globe size={22} />, title: 'Global Reach', desc: 'Spend in 150+ countries with mid-market exchange rates.', color: 'var(--blue)' },
            { icon: <BarChart3 size={22} />, title: 'AI Analytics', desc: 'Your personal CFO. Get insights before you overspend.', color: 'var(--lavender)' },
            { icon: <CreditCard size={22} />, title: 'Virtual Cards', desc: 'Generate cards instantly. Freeze, unfreeze, set limits.', color: 'var(--warning)' },
            { icon: <Lock size={22} />, title: 'Bank-Grade Security', desc: 'End-to-end encryption, biometrics, and real-time alerts.', color: 'var(--danger)' },
            { icon: <TrendingUp size={22} />, title: 'Savings Goals', desc: 'Automate savings toward your goals with smart rules.', color: 'var(--success)' },
          ].map((f, i) => (
            <div key={i} className="feature-card card card-hover reveal" style={{transitionDelay: `${i * 0.05}s`}}>
              <div className="feature-icon" style={{background: `${f.color}18`, color: f.color}}>{f.icon}</div>
              <h3 className="heading-sm mt-3 mb-2">{f.title}</h3>
              <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="ltestimonials">
        <div className="section-header text-center reveal">
          <div className="section-chip">Reviews</div>
          <h2 className="display-md">Gen Z â¤ï¸ Zank</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card card reveal" style={{transitionDelay: `${i * 0.1}s`}}>
              <div className="stars">{Array.from({length: t.rating}).map((_, s) => <Star key={s} size={14} fill="var(--warning)" color="var(--warning)" />)}</div>
              <p className="mt-3 mb-4" style={{color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7}}>"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="avatar avatar-sm">{t.name[0]}</div>
                <div>
                  <div className="heading-sm">{t.name}</div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{t.handle} Â· {t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lfaq">
        <div className="section-header text-center reveal">
          <div className="section-chip">FAQ</div>
          <h2 className="display-md">Got questions?</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item reveal" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="faq-q">
                <span>{faq.q}</span>
                <ChevronDown size={18} style={{transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', flexShrink: 0}} />
              </div>
              {openFaq === i && <div className="faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="lcta reveal">
        <div className="lcta-card">
          <h2 className="display-md mb-4">Ready to level up <span className="grad-text-primary">your money?</span></h2>
          <p style={{color: 'var(--text-muted)', marginBottom: 32, fontSize: '1.0625rem'}}>Join 2 million Gen Z users already thriving with Zank AI.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/register" className="btn btn-primary btn-lg">Create Free Account <ArrowRight size={18} /></Link>
            <Link href="/user" className="btn btn-outline btn-lg">View Demo</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lfooter">
        <div className="lfooter-top">
          <div className="lfooter-brand">
            <div className="brand-orb" />
            <span className="heading-lg">Zank AI</span>
            <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 12, maxWidth: 240, lineHeight: 1.7}}>
              The future of finance is here. Smart. Fast. Built for you.
            </p>
          </div>
          <div className="lfooter-links">
            {[
              { title: 'Product', links: [['Features', '#features'], ['Pricing', '#'], ['API Docs', '#'], ['Security', '#']] },
              { title: 'Company', links: [['About', '#'], ['Blog', '#'], ['Careers', '#'], ['Press', '#']] },
              { title: 'Demo', links: [['User Dashboard', '/user'], ['Admin Panel', '/admin'], ['Sign Up', '/auth/register'], ['Log In', '/auth/login']] },
            ].map((g, i) => (
              <div key={i} className="lfooter-group">
                <h4 className="heading-sm mb-4">{g.title}</h4>
                {g.links.map(([label, href], j) => (
                  <Link key={j} href={href} style={{color: 'var(--text-muted)', display: 'block', marginBottom: 10, fontSize: '0.875rem', transition: 'color 0.2s'}}
                    onMouseEnter={e => e.target.style.color = 'var(--text-main)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                  >{label}</Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="lfooter-bottom">
          <span style={{color: 'var(--text-muted)', fontSize: '0.8125rem'}}>Â© 2026 Zank AI, Inc. All rights reserved.</span>
          <span style={{color: 'var(--text-muted)', fontSize: '0.8125rem'}}>SOC 2 Â· FDIC Â· PCI DSS</span>
        </div>
      </footer>
    </div>
  );
}
