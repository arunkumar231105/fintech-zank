'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { adminSupportService } from '../../../../src/services/adminSupportService';
import { formatDateTime } from '../../../../src/utils/dashboard';

const cannedResponses = [
  "Thank you for contacting support. We're looking into this.",
  "Your issue has been resolved. Please verify and let us know.",
  "We need more information. Can you provide additional details?",
  "This is a known issue. We're working on a fix.",
];

export default function AdminSupport() {
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', assigned_to: 'all', user_id: '' });
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: 'open', assigned_agent: '', reply_message: '', internal_note: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminSupportService.getTickets(filters);
      setTickets(result.items || []);
      setSummary(result.summary || {});
      if (selected) {
        const refreshed = (result.items || []).find((ticket) => ticket.id === selected.id);
        setSelected(refreshed || null);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const handleSelect = (ticket) => {
    setSelected(ticket);
    setForm({
      status: ticket.status,
      assigned_agent: ticket.assigned_to || '',
      reply_message: '',
      internal_note: '',
    });
  };

  const handleSave = async (payload) => {
    if (!selected) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminSupportService.updateTicket(selected.id, payload);
      setSelected(result.ticket);
      setForm((current) => ({
        ...current,
        status: result.ticket.status,
        assigned_agent: result.ticket.assigned_to || '',
        reply_message: '',
        internal_note: '',
      }));
      await loadTickets();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = useMemo(() => ({
    open: summary?.open_tickets || 0,
    progress: summary?.in_progress || 0,
    resolved: summary?.resolved_today || 0,
    response: summary?.avg_response_time_hours || 0,
  }), [summary]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Support</h1>
          <p className="page-subtitle">Manage platform-wide tickets, assignments, replies, and internal notes from live support data.</p>
        </div>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      <div className="grid-dashboard cols-4 mb-5">
        <div className="card stat-card"><div className="stat-label">Open Tickets</div><div className="stat-value">{metrics.open}</div></div>
        <div className="card stat-card"><div className="stat-label">In Progress</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{metrics.progress}</div></div>
        <div className="card stat-card"><div className="stat-label">Resolved Today</div><div className="stat-value" style={{ color: 'var(--success)' }}>{metrics.resolved}</div></div>
        <div className="card stat-card"><div className="stat-label">Avg Response Time</div><div className="stat-value">{metrics.response}h</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select className="form-input" style={{ width: 'auto' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
            {['all', 'low', 'medium', 'high'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={filters.assigned_to} onChange={(event) => setFilters((current) => ({ ...current, assigned_to: event.target.value }))}>
            {['all', 'me', 'unassigned'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input className="form-input" style={{ width: 220 }} placeholder="Search ticket ID or user email" value={filters.user_id} onChange={(event) => setFilters((current) => ({ ...current, user_id: event.target.value }))} />
        </div>
      </div>

      <div className="grid-dashboard" style={{ gridTemplateColumns: '0.95fr 1.05fr', gap: 20 }}>
        <div className="card p-0">
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading support tickets...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No tickets found.</div>
          ) : tickets.map((ticket) => (
            <div
              key={ticket.id}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-glass)',
                cursor: 'pointer',
                background: selected?.id === ticket.id ? 'rgba(255,255,255,0.03)' : 'transparent',
              }}
              onClick={() => handleSelect(ticket)}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div style={{ fontWeight: 700 }}>{ticket.subject}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ticket.id} · {ticket.user_email}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatDateTime(ticket.updated_at)}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${ticket.priority === 'high' ? 'badge-danger' : ticket.priority === 'medium' ? 'badge-warning' : 'badge-success'}`}>{ticket.priority}</span>
                  <span className={`badge ${ticket.status === 'resolved' ? 'badge-success' : ticket.status === 'closed' ? 'badge-muted' : ticket.status === 'in_progress' ? 'badge-warning' : 'badge-blue'}`}>{ticket.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selected ? (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="heading-lg">{selected.subject}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{selected.id} · {selected.user_name} · {selected.user_email}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>

            <div className="grid-dashboard cols-3 mb-4">
              <select className="form-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                {['open', 'in_progress', 'resolved', 'closed'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <input className="form-input" placeholder="Assign to admin email" value={form.assigned_agent} onChange={(event) => setForm((current) => ({ ...current, assigned_agent: event.target.value }))} />
              <button className="btn btn-outline btn-sm" onClick={() => handleSave({ status: form.status, assigned_agent: form.assigned_agent || null })} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Status'}
              </button>
            </div>

            <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Ticket Description</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selected.description}</div>
            </div>

            <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
              <div className="flex justify-between items-center mb-3">
                <div className="heading-md">Message Thread</div>
                <span className="badge badge-muted">{selected.messages.length} messages</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {selected.messages.map((message) => (
                  <div key={message.id} style={{ display: 'flex', justifyContent: message.sender === 'agent' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '82%', background: message.sender === 'agent' ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{message.sender === 'agent' ? 'Agent' : 'User'} · {formatDateTime(message.timestamp)}</div>
                      <div style={{ fontSize: '0.88rem' }}>{message.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card mb-4">
              <div className="flex justify-between items-center mb-3">
                <div className="heading-md">Reply</div>
                <select className="form-input" style={{ width: 320 }} value="" onChange={(event) => setForm((current) => ({ ...current, reply_message: event.target.value }))}>
                  <option value="">Canned responses</option>
                  {cannedResponses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <textarea className="form-input mb-3" rows={4} placeholder="Write a reply..." value={form.reply_message} onChange={(event) => setForm((current) => ({ ...current, reply_message: event.target.value }))} />
              <button className="btn btn-primary btn-sm" onClick={() => handleSave({ reply_message: form.reply_message, status: form.status, assigned_agent: form.assigned_agent || null })} disabled={submitting || !form.reply_message.trim()}>
                {submitting ? 'Sending...' : 'Send Reply'}
              </button>
            </div>

            <div className="card">
              <div className="heading-md mb-3">Internal Notes</div>
              {(selected.internal_notes || []).map((note) => (
                <div key={note.id} className="tx-row">
                  <div className="tx-meta">
                    <div className="tx-name">{note.author}</div>
                    <div className="tx-date">{note.message}</div>
                  </div>
                  <div className="tx-amount-col">
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(note.timestamp)}</div>
                  </div>
                </div>
              ))}
              <textarea className="form-input my-3" rows={3} placeholder="Add internal note" value={form.internal_note} onChange={(event) => setForm((current) => ({ ...current, internal_note: event.target.value }))} />
              <button className="btn btn-outline btn-sm" onClick={() => handleSave({ internal_note: form.internal_note, status: form.status, assigned_agent: form.assigned_agent || null })} disabled={submitting || !form.internal_note.trim()}>
                {submitting ? 'Saving...' : 'Add Internal Note'}
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageCircle size={40} style={{ margin: '0 auto 12px' }} />
              Select a ticket to review, assign, or reply.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
