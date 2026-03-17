import React, { useState } from 'react';
import { MessageCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supportTickets } from '../../../data/mockData';

export default function AdminSupport() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');

  const filtered = supportTickets.filter(t => filter === 'All' || t.status === filter || t.priority === filter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Support</h1>
          <p className="page-subtitle">Manage helpdesk tickets and user escalations.</p>
        </div>
      </div>

      <div className="grid-dashboard cols-4 mb-5">
        {[
          { label: 'Open Tickets', val: supportTickets.filter(t => t.status === 'open').length, color: 'var(--primary)' },
          { label: 'In Progress', val: supportTickets.filter(t => t.status === 'in-progress').length, color: 'var(--blue)' },
          { label: 'Escalated', val: supportTickets.filter(t => t.status === 'escalated').length, color: 'var(--danger)' },
          { label: 'Resolved', val: supportTickets.filter(t => t.status === 'resolved').length, color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color: s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4" style={{flexWrap: 'wrap'}}>
        {['All', 'open', 'in-progress', 'escalated', 'resolved'].map(f => (
          <button key={f} className={`seg-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{textTransform: 'capitalize'}}>{f}</button>
        ))}
      </div>

      <div className="grid-dashboard" style={{gridTemplateColumns: '1.2fr 1fr', gap: 20}}>
        <div className="card p-0">
          {filtered.map((t, i) => (
            <div key={t.id}
              style={{padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', cursor: 'pointer', background: selected?.id === t.id ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background 0.2s'}}
              onClick={() => setSelected(t)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{fontWeight: 600, fontSize: '0.875rem'}}>{t.issue}</span>
                  </div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{t.id} · {t.user} · {t.created}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${t.status === 'open' ? 'badge-primary' : t.status === 'escalated' ? 'badge-danger' : t.status === 'resolved' ? 'badge-success' : 'badge-warning'}`} style={{fontSize: '0.625rem'}}>{t.status}</span>
                  <span className={`badge ${t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-success'}`} style={{fontSize: '0.625rem'}}>{t.priority}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{padding: 40, textAlign: 'center', color: 'var(--text-muted)'}}>No tickets match filter.</div>}
        </div>

        {selected ? (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-md">Ticket Detail</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="flex gap-2 mb-3">
              <span className={`badge ${selected.priority === 'high' ? 'badge-danger' : selected.priority === 'medium' ? 'badge-warning' : 'badge-success'}`}>{selected.priority}</span>
              <span className={`badge ${selected.status === 'open' ? 'badge-primary' : selected.status === 'escalated' ? 'badge-danger' : selected.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>{selected.status}</span>
            </div>
            <h3 style={{fontWeight: 700, marginBottom: 8}}>{selected.issue}</h3>
            <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16}}>{selected.id} · {selected.created} · Assigned: {selected.agent}</div>
            <div className="flex items-center gap-3 mb-4" style={{background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', padding: '12px 14px'}}>
              <div className="avatar avatar-sm">{selected.user[0]}</div>
              <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{selected.user}</div>
            </div>
            <div style={{marginBottom: 16}}>
              <label className="form-label mb-2 block">Add Response</label>
              <textarea className="form-input" rows={4} placeholder="Type response..." style={{resize: 'none'}} />
            </div>
            <div className="grid-dashboard cols-2" style={{gap: 10}}>
              <button className="btn btn-primary btn-sm">Send Response</button>
              <button className="btn btn-outline btn-sm">Escalate</button>
              <button className="btn btn-outline btn-sm" style={{color: 'var(--success)', borderColor: 'rgba(52,211,153,0.3)'}}>Mark Resolved</button>
              <button className="btn btn-ghost btn-sm">Close Ticket</button>
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-center" style={{minHeight: 400}}>
            <div>
              <MessageCircle size={40} color="var(--text-dim)" style={{margin: '0 auto 16px'}} />
              <div style={{color: 'var(--text-muted)'}}>Select a ticket to view details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
