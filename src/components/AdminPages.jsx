// ─── Admin Pages ──────────────────────────────────────────────────
// These pages render inside AdminLayout and reuse the core page components
// from App.jsx but with admin-specific capabilities.

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useLanguage } from '../LanguageContext.jsx';
import { translations } from '../translations.js';
import {
    fetchComplaints,
    fetchActivityLogs,
    updateComplaintStatus,
    insertActivityLog,
    updateComplaintVotes,
} from '../lib/supabase.js';

// ─── Admin Dashboard ──────────────────────────────────────────────
export function AdminDashboardPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { user } = useUser();
    const { getToken } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, critical: 0 });

    useEffect(() => {
        (async () => {
            const result = await fetchComplaints();
            if (result.success) {
                setComplaints(result.data);
                setStats({
                    total: result.data.length,
                    resolved: result.data.filter(c => c.status === 'Resolved').length,
                    pending: result.data.filter(c => c.status === 'Reported' || c.status === 'In Progress').length,
                    critical: result.data.filter(c => c.priority === 'Critical' || c.is_emergency).length,
                });
            }
            setLoading(false);
        })();
    }, []);

    const PRIORITY_COLORS = {
        Critical: '#DC2626', High: '#EA580C', Medium: '#D97706', Low: '#16A34A',
    };

    const STATUS_COLORS = {
        Reported: '#D97706', 'In Progress': '#2563EB', Resolved: '#16A34A', Escalated: '#DC2626',
    };

    return (
        <div className="page-content admin-page">
            <div className="admin-welcome-banner">
                <div className="admin-welcome-text">
                    <h1>Welcome, {user?.firstName || 'Admin'}</h1>
                    <p>CivicLens Administrative Dashboard — Real-time overview of all civic complaints and system activity.</p>
                </div>
                <div className="admin-welcome-badge">🔐 Administrator</div>
            </div>

            <div className="admin-stats-grid">
                <div className="admin-stat-card" style={{ '--accent': '#2563EB' }}>
                    <div className="admin-stat-icon">📊</div>
                    <div className="admin-stat-value">{stats.total}</div>
                    <div className="admin-stat-label">Total Complaints</div>
                </div>
                <div className="admin-stat-card" style={{ '--accent': '#16A34A' }}>
                    <div className="admin-stat-icon">✅</div>
                    <div className="admin-stat-value">{stats.resolved}</div>
                    <div className="admin-stat-label">Resolved</div>
                </div>
                <div className="admin-stat-card" style={{ '--accent': '#D97706' }}>
                    <div className="admin-stat-icon">⏳</div>
                    <div className="admin-stat-value">{stats.pending}</div>
                    <div className="admin-stat-label">Pending</div>
                </div>
                <div className="admin-stat-card" style={{ '--accent': '#DC2626' }}>
                    <div className="admin-stat-icon">🚨</div>
                    <div className="admin-stat-value">{stats.critical}</div>
                    <div className="admin-stat-label">Critical / Emergency</div>
                </div>
            </div>

            {loading ? (
                <div className="admin-loading">
                    <div className="post-spinner" />
                    <p>Loading complaints from database...</p>
                </div>
            ) : (
                <div className="admin-recent-section">
                    <h2>Recent Complaints</h2>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Image</th>
                                    <th>Location</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.slice(0, 20).map(c => (
                                    <tr key={c.id || c.uid}>
                                        <td className="admin-table-id">{c.uid || c.id}</td>
                                        <td className="admin-table-desc">{(c.description || '').slice(0, 60)}...</td>
                                        <td><span className="admin-table-badge" style={{ background: (PRIORITY_COLORS[c.priority] || '#2563EB') + '22', color: PRIORITY_COLORS[c.priority] || '#2563EB' }}>{c.category}</span></td>
                                        <td><span className="admin-table-badge" style={{ background: (PRIORITY_COLORS[c.priority] || '#2563EB') + '22', color: PRIORITY_COLORS[c.priority] || '#2563EB' }}>{c.priority}</span></td>
                                        <td><span className="admin-table-badge" style={{ background: (STATUS_COLORS[c.status] || '#2563EB') + '22', color: STATUS_COLORS[c.status] || '#2563EB' }}>{c.status}</span></td>
                                        <td>{c.image_url ? <img src={c.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} /> : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>}</td>
                                        <td>{c.location || '—'}</td>
                                        <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                    </tr>
                                ))}
                                {complaints.length === 0 && (
                                    <tr><td colSpan="8" className="admin-table-empty">No complaints found in database.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Admin Queue Page ─────────────────────────────────────────────
export function AdminQueuePage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState(null);

    useEffect(() => {
        (async () => {
            const result = await fetchComplaints();
            if (result.success) setComplaints(result.data);
            setLoading(false);
        })();
    }, []);

    const handleStatusChange = async (uid, newStatus) => {
        const result = await updateComplaintStatus(uid, newStatus);
        if (result.success) {
            setComplaints(prev => prev.map(c => (c.uid || c.id) === uid ? { ...c, status: newStatus } : c));
            insertActivityLog('STATUS', `Admin changed ${uid} status to ${newStatus}`, uid, 'info');
            if (selectedComplaint && (selectedComplaint.uid || selectedComplaint.id) === uid) {
                setSelectedComplaint(prev => ({ ...prev, status: newStatus }));
            }
            try {
                const token = await getToken();
                await fetch(`http://localhost:5000/api/admin/complaints/${uid}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        'x-user-role': 'admin',
                    },
                    body: JSON.stringify({
                        status: newStatus,
                        actor_role: 'admin',
                    }),
                });
            } catch (err) {
                console.error('[Admin] Failed to emit workflow notifications:', err);
            }
        }
    };

    const PRIORITY_COLORS = {
        Critical: '#DC2626', High: '#EA580C', Medium: '#D97706', Low: '#16A34A',
    };
    const STATUS_COLORS = {
        Reported: '#D97706', 'In Progress': '#2563EB', Resolved: '#16A34A', Escalated: '#DC2626',
    };
    const STATUSES = ['Reported', 'In Progress', 'Escalated', 'Resolved'];

    return (
        <div className="page-content admin-page">
            <h1 className="page-title">Admin Complaint Queue</h1>
            <p className="page-subtitle">View all complaints in detail. Change status, view images, and manage resolution.</p>

            {loading ? (
                <div className="admin-loading">
                    <div className="post-spinner" />
                    <p>Loading complaints...</p>
                </div>
            ) : (
                <div className="admin-queue-layout">
                    <div className="admin-queue-list">
                        {complaints.map(c => (
                            <div
                                key={c.id || c.uid}
                                className={`admin-queue-card ${selectedComplaint && (selectedComplaint.uid || selectedComplaint.id) === (c.uid || c.id) ? 'selected' : ''}`}
                                onClick={() => setSelectedComplaint(c)}
                            >
                                <div className="admin-queue-card-header">
                                    <span className="admin-queue-card-id">{c.uid || c.id}</span>
                                    <span className="admin-table-badge" style={{ background: (PRIORITY_COLORS[c.priority] || '#2563EB') + '22', color: PRIORITY_COLORS[c.priority] || '#2563EB' }}>
                                        {c.priority}
                                    </span>
                                </div>
                                <div className="admin-queue-card-desc">{(c.description || '').slice(0, 80)}{(c.description || '').length > 80 ? '...' : ''}</div>
                                <div className="admin-queue-card-meta">
                                    <span style={{ color: STATUS_COLORS[c.status] || '#ccc' }}>● {c.status}</span>
                                    <span>📍 {c.location || '—'}</span>
                                </div>
                            </div>
                        ))}
                        {complaints.length === 0 && (
                            <div className="admin-queue-empty">No complaints in database.</div>
                        )}
                    </div>

                    {selectedComplaint && (
                        <div className="admin-queue-detail">
                            <div className="admin-detail-header">
                                <h2>{selectedComplaint.uid || selectedComplaint.id}</h2>
                                <span className="admin-table-badge" style={{ background: (PRIORITY_COLORS[selectedComplaint.priority] || '#2563EB') + '22', color: PRIORITY_COLORS[selectedComplaint.priority] || '#2563EB' }}>
                                    {selectedComplaint.priority}
                                </span>
                            </div>
                            <div className="admin-detail-body">
                                <div className="admin-detail-field">
                                    <label>Description</label>
                                    <p>{selectedComplaint.description}</p>
                                </div>
                                <div className="admin-detail-row">
                                    <div className="admin-detail-field">
                                        <label>Category</label>
                                        <p>{selectedComplaint.category}</p>
                                    </div>
                                    <div className="admin-detail-field">
                                        <label>Authority</label>
                                        <p>{selectedComplaint.authority || selectedComplaint.assigned_dept || '—'}</p>
                                    </div>
                                </div>
                                <div className="admin-detail-row">
                                    <div className="admin-detail-field">
                                        <label>Location</label>
                                        <p>📍 {selectedComplaint.location || '—'}</p>
                                    </div>
                                    <div className="admin-detail-field">
                                        <label>Zone</label>
                                        <p>🏛️ {selectedComplaint.zone || '—'}</p>
                                    </div>
                                </div>
                                <div className="admin-detail-row">
                                    <div className="admin-detail-field">
                                        <label>Damage Level</label>
                                        <p>{selectedComplaint.damage_level || '—'}</p>
                                    </div>
                                    <div className="admin-detail-field">
                                        <label>Risk Type</label>
                                        <p>{selectedComplaint.risk_type || '—'}</p>
                                    </div>
                                </div>
                                <div className="admin-detail-row">
                                    <div className="admin-detail-field">
                                        <label>AI Confidence</label>
                                        <p>{selectedComplaint.ai_confidence || '—'}%</p>
                                    </div>
                                    <div className="admin-detail-field">
                                        <label>AI Score</label>
                                        <p>{selectedComplaint.ai_score || '—'}</p>
                                    </div>
                                </div>
                                <div className="admin-detail-field">
                                    <label>AI Reasoning</label>
                                    <p className="admin-detail-reasoning">{selectedComplaint.ai_reasoning || '—'}</p>
                                </div>
                                {selectedComplaint.image_url ? (
                                    <div className="admin-detail-field">
                                        <label>Attached Image</label>
                                        <img
                                            src={selectedComplaint.image_url}
                                            alt={`Complaint ${selectedComplaint.uid || selectedComplaint.id}`}
                                            className="admin-detail-image"
                                            style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain', background: '#F1F5F9' }}
                                            onError={(e) => {
                                                console.warn('[Admin] Image failed to load:', selectedComplaint.image_url);
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML += '<p style="color:#A0AEC0;font-size:13px;">⚠️ Image could not be loaded. The URL may have expired or the file may have been removed.</p>';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="admin-detail-field">
                                        <label>Attached Image</label>
                                        <p style={{ color: '#A0AEC0', fontSize: '13px' }}>No image attached to this complaint.</p>
                                    </div>
                                )}
                                <div className="admin-detail-field">
                                    <label>Change Status</label>
                                    <div className="admin-status-buttons">
                                        {STATUSES.map(s => (
                                            <button
                                                key={s}
                                                className={`admin-status-btn ${selectedComplaint.status === s ? 'active' : ''}`}
                                                style={{
                                                    '--btn-color': STATUS_COLORS[s],
                                                    background: selectedComplaint.status === s ? STATUS_COLORS[s] + '33' : 'transparent',
                                                    borderColor: STATUS_COLORS[s],
                                                    color: STATUS_COLORS[s],
                                                }}
                                                onClick={() => handleStatusChange(selectedComplaint.uid || selectedComplaint.id, s)}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="admin-detail-meta">
                                    <span>Votes: {selectedComplaint.votes || 0}</span>
                                    <span>Emergency: {selectedComplaint.is_emergency ? '🚨 YES' : 'No'}</span>
                                    <span>Escalation: {selectedComplaint.escalation_required ? '⚠️ YES' : 'No'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Admin Logs Page ──────────────────────────────────────────────
export function AdminLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        (async () => {
            const result = await fetchActivityLogs(200);
            if (result.success) setLogs(result.data);
            setLoading(false);
        })();
    }, []);

    const LOG_TYPE_COLORS = {
        AI: '#7C3AED', SYSTEM: '#2563EB', ROUTE: '#16A34A', SLA: '#EA580C', VOTE: '#D97706', STATUS: '#059669',
    };
    const LEVEL_COLORS = {
        info: '#2563EB', warn: '#D97706', error: '#DC2626', success: '#16A34A',
    };

    const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.type === filter);

    return (
        <div className="page-content admin-page">
            <h1 className="page-title">System Logs</h1>
            <p className="page-subtitle">Complete activity log from AI analysis, routing, voting, and status changes.</p>

            <div className="admin-log-filters">
                {['ALL', 'AI', 'SYSTEM', 'ROUTE', 'SLA', 'VOTE', 'STATUS'].map(f => (
                    <button
                        key={f}
                        className={`admin-log-filter-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                        style={filter === f ? { background: (LOG_TYPE_COLORS[f] || '#2563EB') + '22', color: LOG_TYPE_COLORS[f] || '#2563EB', borderColor: LOG_TYPE_COLORS[f] || '#2563EB' } : {}}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="admin-loading">
                    <div className="post-spinner" />
                    <p>Loading logs...</p>
                </div>
            ) : (
                <div className="admin-logs-list">
                    {filteredLogs.map(log => (
                        <div key={log.id} className="admin-log-entry">
                            <div className="admin-log-type" style={{ background: (LOG_TYPE_COLORS[log.type] || '#2563EB') + '22', color: LOG_TYPE_COLORS[log.type] || '#2563EB' }}>
                                {log.type}
                            </div>
                            <div className="admin-log-content">
                                <div className="admin-log-message">{log.message}</div>
                                <div className="admin-log-meta">
                                    <span className="admin-log-level" style={{ color: LEVEL_COLORS[log.level] || '#999' }}>● {log.level}</span>
                                    {log.complaint_uid && <span className="admin-log-complaint">🧾 {log.complaint_uid}</span>}
                                    <span className="admin-log-time">{log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && (
                        <div className="admin-queue-empty">No logs found{filter !== 'ALL' ? ` for type "${filter}"` : ''}.</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Admin Routing Rules Page ─────────────────────────────────────
export function AdminRoutingRulesPage() {
    const ROUTING_RULES = [
        { category: 'Roads & Potholes', authority: 'Public Works Department (PWD)', escalation: 'severe damage / main road blockage', icon: '🛣️', color: '#EA580C' },
        { category: 'Sanitation & Garbage', authority: 'Municipal Sanitation Department', escalation: 'health hazard / sewage overflow', icon: '🗑️', color: '#16A34A' },
        { category: 'Electricity', authority: 'State Electricity Board', escalation: 'electrocution risk / fire hazard', icon: '⚡', color: '#D97706' },
        { category: 'Water Supply', authority: 'Water Board (Jal Board)', escalation: 'contamination / total supply failure', icon: '💧', color: '#2563EB' },
        { category: 'Drainage & Flooding', authority: 'Municipal Drainage Cell', escalation: 'flooding / sewage backup', icon: '🌊', color: '#7C3AED' },
        { category: 'Public Safety', authority: 'Traffic Police / Local Police', escalation: 'child/school/hospital risk', icon: '🚨', color: '#DC2626' },
    ];

    return (
        <div className="page-content admin-page">
            <h1 className="page-title">AI Routing Rules</h1>
            <p className="page-subtitle">Authority assignment and escalation rules used by CivicLens AI engine.</p>

            <div className="admin-routing-grid">
                {ROUTING_RULES.map(rule => (
                    <div key={rule.category} className="admin-routing-card" style={{ '--rule-color': rule.color }}>
                        <div className="admin-routing-icon">{rule.icon}</div>
                        <div className="admin-routing-info">
                            <div className="admin-routing-category">{rule.category}</div>
                            <div className="admin-routing-authority">→ {rule.authority}</div>
                            <div className="admin-routing-escalation">
                                <span className="admin-routing-esc-label">Escalation:</span> {rule.escalation}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="admin-routing-legend">
                <h3>Escalation Triggers (Any of the following)</h3>
                <ul>
                    <li>Severe damage level</li>
                    <li>Risk to children, schools, or hospitals</li>
                    <li>Main road blockage</li>
                    <li>Fire hazard or electrocution risk</li>
                    <li>Flooding or sewage overflow</li>
                    <li>Public accident risk</li>
                </ul>
            </div>
        </div>
    );
}
