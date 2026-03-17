'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, Ticket } from 'lucide-react';
import { supportService } from '../../../../src/services/supportService';

const priorities = ['low', 'medium', 'high'];

export default function UserSupport() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium', attachment: null });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await supportService.getTickets();
      setTickets(result);
      if (!selectedTicketId && result[0]) {
        setSelectedTicketId(result[0].id);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const handleCreateTicket = async () => {
    if (form.subject.trim().length < 5 || form.subject.trim().length > 100) {
      setError('Ticket subject must be 5-100 chars');
      return;
    }
    if (form.description.trim().length < 20 || form.description.trim().length > 500) {
      setError('Description must be 20-500 chars');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const ticket = await supportService.createTicket(form, (event) => {
        if (event.total) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
      setTickets((current) => [ticket, ...current]);
      setSelectedTicketId(ticket.id);
      setShowCreate(false);
      setForm({ subject: '', description: '', priority: 'medium', attachment: null });
      setUploadProgress(0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !message.trim() || message.trim().length > 1000) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const messages = await supportService.sendMessage({ ticketId: selectedTicket.id, message });
      setTickets((current) => current.map((ticket) => (
        ticket.id === selectedTicket.id ? { ...ticket, messages } : ticket
      )));
      setMessage('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Support</h1>
          <p className="page-subtitle">Create tickets, review status, and message support from your dashboard.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Ticket size={14} /> Create Ticket
        </button>
      </div>

      {error && <div className="card mb-4" style={{ color: 'var(--danger)' }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading support tickets...
        </div>
      ) : (
        <div className="grid-dashboard" style={{ gridTemplateColumns: '0.9fr 1.1fr', gap: 20 }}>
          <div className="card">
            <h2 className="heading-md mb-4">Your Tickets</h2>
            {tickets.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No support tickets yet.</div>
            ) : tickets.map((ticket) => (
              <button
                key={ticket.id}
                className="card"
                onClick={() => setSelectedTicketId(ticket.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: ticket.id === selectedTicketId ? 'rgba(42,255,196,0.06)' : 'rgba(255,255,255,0.03)',
                  border: ticket.id === selectedTicketId ? '1px solid var(--border-active)' : '1px solid var(--border-glass)',
                  marginBottom: 12,
                  padding: 16,
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div style={{ fontWeight: 700 }}>{ticket.subject}</div>
                  <span className={`badge ${ticket.status === 'resolved' ? 'badge-success' : ticket.status === 'in_progress' ? 'badge-warning' : ticket.status === 'closed' ? 'badge-muted' : 'badge-primary'}`}>{ticket.status}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{ticket.id} · {new Date(ticket.created_at).toLocaleDateString()}</div>
              </button>
            ))}
          </div>

          <div className="card">
            {selectedTicket ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="heading-md">{selectedTicket.subject}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{selectedTicket.id} · {selectedTicket.priority} priority · {new Date(selectedTicket.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`badge ${selectedTicket.status === 'resolved' ? 'badge-success' : selectedTicket.status === 'in_progress' ? 'badge-warning' : selectedTicket.status === 'closed' ? 'badge-muted' : 'badge-primary'}`}>{selectedTicket.status}</span>
                </div>
                <div className="card mb-4" style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedTicket.description}</div>
                  {selectedTicket.attachment_name && <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Attachment: {selectedTicket.attachment_name}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 280, marginBottom: 16 }}>
                  {(selectedTicket.messages || []).map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: item.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '12px 14px', borderRadius: item.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: item.sender === 'user' ? 'var(--grad-primary)' : 'var(--bg-surface)', color: item.sender === 'user' ? '#07080f' : 'var(--text-main)' }}>
                        <div style={{ fontSize: '0.86rem' }}>{item.message}</div>
                        <div style={{ fontSize: '0.72rem', marginTop: 6, opacity: 0.7 }}>{new Date(item.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input className="form-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type a message..." onKeyDown={(event) => event.key === 'Enter' && handleSendMessage()} />
                  <button className="btn btn-primary btn-sm" onClick={handleSendMessage} disabled={submitting}>
                    <Send size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Select a ticket to view details.
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(2, 6, 23, 0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520 }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="heading-lg">Create Support Ticket</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Close</button>
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Subject</label>
              <input className="form-input" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Attachment</label>
              <input className="form-input" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setForm((current) => ({ ...current, attachment: event.target.files?.[0] || null }))} />
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="progress-bar-wrap mb-4"><div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, background: 'var(--grad-primary)' }} /></div>
            )}
            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setShowCreate(false)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={handleCreateTicket} disabled={submitting}>
                <MessageCircle size={14} /> {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
