import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase.js';

export function AdminSupportPage() {
    const { getToken } = useAuth();
    const { user } = useUser();

    const [tickets, setTickets] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [loadingTickets, setLoadingTickets] = useState(true);
    const messagesEndRef = useRef(null);
    // Track selected session in ref for realtime callback (avoids stale closure)
    const selectedSessionRef = useRef(null);
    useEffect(() => { selectedSessionRef.current = selectedSessionId; }, [selectedSessionId]);

    // Fetch Tickets via our secure Backend API
    const loadTickets = async () => {
        try {
            console.log('[AdminSupport] Loading support tickets...');
            const token = await getToken();
            const res = await fetch('http://localhost:5000/api/admin/support-tickets', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-user-role': 'admin'
                }
            });
            const data = await res.json();
            if (data.success) {
                console.log(`[AdminSupport] Loaded ${(data.tickets || []).length} tickets.`);
                setTickets(data.tickets || []);
            } else {
                console.warn('[AdminSupport] Failed to load tickets:', data);
            }
        } catch (error) {
            console.error("[AdminSupport] Error loading tickets:", error);
        } finally {
            setLoadingTickets(false);
        }
    };

    // Load Chat History for a specific session
    const loadChatHistory = async (sessionId) => {
        try {
            console.log(`[AdminSupport] Loading chat history for session: ${sessionId}`);
            const token = await getToken();
            const res = await fetch(`http://localhost:5000/api/admin/chat/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-user-role': 'admin'
                }
            });
            const data = await res.json();
            if (data.success) {
                console.log(`[AdminSupport] Loaded ${(data.messages || []).length} messages.`);
                setMessages(data.messages || []);
                setSelectedSessionId(sessionId);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (error) {
            console.error("[AdminSupport] Error loading chat:", error);
        }
    };

    // Setup Supabase Realtime Subscriptions
    useEffect(() => {
        loadTickets();

        console.log('[AdminSupport] Setting up Realtime subscriptions...');
        const channel = supabase.channel('admin_support_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
                console.log('[AdminSupport][Realtime] New support ticket inserted:', payload.new?.id);
                setTickets(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, (payload) => {
                console.log('[AdminSupport][Realtime] Support ticket updated:', payload.new?.id, 'status:', payload.new?.status);
                setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                console.log('[AdminSupport][Realtime] New chat message:', payload.new?.sender, 'session:', payload.new?.session_id);
                // Use ref for current session to avoid stale closure
                const currentSession = selectedSessionRef.current;
                if (currentSession && payload.new.session_id === currentSession) {
                    setMessages(prev => [...prev, payload.new]);
                }
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_sessions' }, (payload) => {
                console.log('[AdminSupport][Realtime] Chat session updated:', payload.new?.id, 'escalated:', payload.new?.escalated);
            })
            .subscribe((status) => {
                console.log('[AdminSupport][Realtime] Subscription status:', status);
            });

        return () => {
            console.log('[AdminSupport] Cleaning up Realtime subscription.');
            supabase.removeChannel(channel);
        };
    }, []);

    // Also auto-scroll when new messages appear for good UX
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedSessionId) return;

        try {
            const token = await getToken();
            await fetch('http://localhost:5000/api/admin/chat/reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-user-role': 'admin'
                },
                body: JSON.stringify({
                    session_id: selectedSessionId,
                    message: replyText
                })
            });
            setReplyText('');
            // UI will update instantly via Realtime subscription! No polling required.
        } catch (error) {
            console.error("Failed to send reply:", error);
        }
    };

    const handleResolveTicket = async (ticketId) => {
        try {
            const token = await getToken();
            await fetch(`http://localhost:5000/api/admin/ticket/${ticketId}/resolve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-user-role': 'admin'
                }
            });
            // Update UI instantly via Realtime subscription!
            setSelectedSessionId(null);
            setMessages([]);
        } catch (error) {
            console.error("Failed to resolve ticket:", error);
        }
    };

    const activeTickets = tickets.filter(t => t.status !== 'resolved');
    const resolvedTickets = tickets.filter(t => t.status === 'resolved');

    return (
        <div className="page-content admin-page support-panel">
            <h1 className="page-title">Live Chat Support</h1>
            <p className="page-subtitle">Manage escalated citizen requests and AI chatbot handoffs.</p>

            <div className="support-layout" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)', marginTop: '20px' }}>

                {/* Left Side: Ticket Queue (30%) */}
                <div className="support-sidebar" style={{ width: '30%', background: 'white', borderRadius: '15px', padding: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
                    <h3 style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginTop: 0 }}>Active Tickets</h3>

                    {loadingTickets ? (
                        <p style={{ color: '#A0AEC0', textAlign: 'center', marginTop: '20px' }}>Loading queue...</p>
                    ) : (
                        <div className="ticket-list">
                            {activeTickets.length === 0 && <p style={{ color: '#A0AEC0', fontSize: '13px' }}>No active escalations right now.</p>}
                            {activeTickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => loadChatHistory(ticket.session_id)}
                                    style={{
                                        padding: '12px',
                                        background: selectedSessionId === ticket.session_id ? '#EBF4FF' : '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        marginBottom: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <b style={{ color: '#2D3748', fontSize: '14px' }}>Session {ticket.session_id.substring(0, 6)}</b>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            padding: '2px 6px',
                                            borderRadius: '10px',
                                            background: ticket.priority === 'high' ? '#FEE2E2' : '#FEF3C7',
                                            color: ticket.priority === 'high' ? '#DC2626' : '#D97706'
                                        }}>
                                            {ticket.priority.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#718096' }}>
                                        Escalated: {new Date(ticket.created_at).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side: Chat Window (70%) */}
                <div className="support-chat-window" style={{ width: '70%', background: 'white', borderRadius: '15px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    {selectedSessionId ? (
                        <>
                            <div className="chat-header" style={{ padding: '20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#2D3748' }}>Live Support Session</h3>
                                    <span style={{ fontSize: '12px', color: '#718096' }}>ID: {selectedSessionId}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const ticket = activeTickets.find(t => t.session_id === selectedSessionId);
                                        if (ticket) handleResolveTicket(ticket.id);
                                    }}
                                    style={{ background: '#10B981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ✓ Mark Resolved
                                </button>
                            </div>

                            <div className="chat-history" style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#FAFAFA' }}>
                                {messages.map(m => (
                                    <div key={m.id} style={{
                                        display: 'flex',
                                        justifyContent: m.sender === 'user' ? 'flex-start' : 'flex-end',
                                        marginBottom: '15px'
                                    }}>
                                        <div style={{
                                            maxWidth: '70%',
                                            padding: '12px 16px',
                                            borderRadius: '15px',
                                            borderBottomLeftRadius: m.sender === 'user' ? '2px' : '15px',
                                            borderBottomRightRadius: m.sender !== 'user' ? '2px' : '15px',
                                            background: m.sender === 'user' ? '#FFFFFF' : (m.sender === 'bot' ? '#EBF4FF' : '#2563EB'),
                                            color: m.sender === 'admin' ? '#FFFFFF' : '#2D3748',
                                            border: m.sender === 'user' ? '1px solid #E2E8F0' : 'none',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8, color: m.sender === 'admin' ? '#EBF4FF' : (m.sender === 'bot' ? '#2563EB' : '#A0AEC0') }}>
                                                {m.sender === 'bot' ? '🤖 AI Asst' : (m.sender === 'admin' ? '🛡️ You (Admin)' : '👤 Citizen')}
                                            </div>
                                            <div style={{ fontSize: '14px', lineHeight: 1.4 }}>{m.message}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="chat-input-area" style={{ padding: '15px 20px', borderTop: '1px solid #E2E8F0', background: 'white', display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Type your reply as Admin..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                                    style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '14px' }}
                                />
                                <button
                                    onClick={handleSendReply}
                                    style={{ background: '#2563EB', color: 'white', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Send
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A0AEC0' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            <h2>No Chat Selected</h2>
                            <p>Select a ticket from the queue to start responding.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
