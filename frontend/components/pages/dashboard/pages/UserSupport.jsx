import React, { useState } from 'react';
import { MessageCircle, HelpCircle, ChevronDown, ChevronUp, Send, Ticket, Phone, Mail } from 'lucide-react';
import { supportTickets } from '../../../data/mockData';

const faqs = [
  { q: 'How do I transfer money to another Zank user?', a: 'Go to Quick Actions on your Overview, click "Send", enter the recipient\'s email or @username, enter the amount, and confirm. Internal transfers are instant.' },
  { q: 'My card was declined internationally — why?', a: 'By default, international payments are disabled for security. Go to Cards → Merchant Controls → International Payments → Enable.' },
  { q: 'How does wallet funding work?', a: 'Wallet balances are funded by approved admin credits or incoming transfers from other users.' },
  { q: 'How can I get my KYC re-verified?', a: 'Go to Security & KYC and complete the remaining verification steps. If you need to update documents, contact support.' },
];

const userTickets = supportTickets.filter(t => t.user === 'Jordan Rivera');

export default function UserSupport() {
  const [openFaq, setOpenFaq] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatMsgs, setChatMsgs] = useState([{ from: 'bot', text: "Hi Jordan! 👋 I'm Zank's AI support assistant. How can I help you today?" }]);

  const sendMsg = () => {
    if (!message.trim()) return;
    setChatMsgs(prev => [...prev, { from: 'user', text: message }, { from: 'bot', text: "Thanks for reaching out! A human agent will review this shortly. In the meantime, check our FAQ or common help topics below." }]);
    setMessage('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Help & Support</h1>
          <p className="page-subtitle">24/7 support center — we're here when you need us.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setChatOpen(true)}>
          <MessageCircle size={14} /> Live Chat
        </button>
      </div>

      {/* Help Cards */}
      <div className="grid-dashboard cols-3 mb-5">
        {[
          { icon: <MessageCircle size={24}/>, title: 'Live Chat', sub: 'Avg reply in 2 min', action: () => setChatOpen(true), badge: 'Online', badgeType: 'badge-success', color: 'var(--primary)' },
          { icon: <Mail size={24}/>, title: 'Email Support', sub: 'support@zankmail.com', action: () => {}, badge: '< 2h reply', badgeType: 'badge-blue', color: 'var(--blue)' },
          { icon: <Phone size={24}/>, title: 'Priority Line', sub: '+1 (800) ZANK-AI', action: () => {}, badge: 'Gold+ only', badgeType: 'badge-warning', color: 'var(--warning)' },
        ].map((c, i) => (
          <div key={i} className="card card-hover text-center" style={{cursor: 'pointer', padding: 28}} onClick={c.action}>
            <div style={{width: 52, height: 52, borderRadius: 'var(--r-lg)', background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: c.color}}>
              {c.icon}
            </div>
            <div className="heading-md mb-1">{c.title}</div>
            <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12}}>{c.sub}</div>
            <span className={`badge ${c.badgeType}`}>{c.badge}</span>
          </div>
        ))}
      </div>

      <div className="grid-dashboard" style={{gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20}}>
        {/* FAQ */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={20} color="var(--primary)" />
            <h2 className="heading-md">Frequently Asked</h2>
          </div>
          <div className="flex flex-col gap-2">
            {faqs.map((f, i) => (
              <div key={i} style={{background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', overflow: 'hidden'}}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem'}}>
                  {f.q}
                  {openFaq === i ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </button>
                {openFaq === i && (
                  <div style={{padding: '0 16px 14px', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7}}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Ticket */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Ticket size={20} color="var(--blue)" />
            <h2 className="heading-md">Submit a Ticket</h2>
          </div>
          <div className="form-group mb-3">
            <label className="form-label">Subject</label>
            <input className="form-input" placeholder="e.g. Card not working abroad" />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">Category</label>
            <select className="form-input">
              <option>Card Issue</option>
              <option>Transaction Problem</option>
              <option>KYC & Identity</option>
              <option>Billing & Fees</option>
              <option>Account Access</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={4} placeholder="Describe your issue in detail..." style={{resize: 'vertical'}} />
          </div>
          <button className="btn btn-blue btn-full">Submit Ticket</button>

          {userTickets.length > 0 && (
            <div style={{marginTop: 24}}>
              <div className="heading-sm mb-3">Your Tickets</div>
              {userTickets.map(t => (
                <div key={t.id} className="flex items-center gap-3" style={{padding: '10px 0', borderBottom: '1px solid var(--border-glass)'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{t.issue}</div>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{t.id} · {t.created}</div>
                  </div>
                  <span className={`badge ${t.status === 'open' ? 'badge-primary' : t.status === 'in-progress' ? 'badge-warning' : 'badge-success'}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {chatOpen && (
        <div style={{position: 'fixed', bottom: 24, right: 24, width: 360, zIndex: 300}}>
          <div className="card" style={{borderRadius: 'var(--r-xl)', padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(42,255,196,0.2)'}}>
            <div style={{background: 'var(--grad-primary)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div className="flex items-center gap-2">
                <MessageCircle size={18} color="#07080f" />
                <span style={{fontWeight: 700, color: '#07080f'}}>Zank Support</span>
              </div>
              <button onClick={() => setChatOpen(false)} style={{background: 'rgba(0,0,0,0.15)', border: 'none', color: '#07080f', cursor: 'pointer', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700}}>✕</button>
            </div>
            <div style={{height: 280, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-surface)'}}>
              {chatMsgs.map((m, i) => (
                <div key={i} style={{display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start'}}>
                  <div style={{maxWidth: '80%', padding: '10px 14px', borderRadius: m.from === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: m.from === 'user' ? 'var(--grad-primary)' : 'var(--bg-card)', color: m.from === 'user' ? '#07080f' : 'var(--text-main)', fontSize: '0.8125rem', lineHeight: 1.5}}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding: '12px 14px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: 8, background: 'var(--bg-card)'}}>
              <input className="form-input" placeholder="Type a message..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} style={{flex: 1, padding: '8px 12px'}} />
              <button className="btn btn-primary btn-sm" onClick={sendMsg}><Send size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
