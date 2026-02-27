import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase.js';
import WorkerGuard from './WorkerGuard.jsx';
import NotificationBell from './NotificationBell.jsx';

function WorkerNotificationsInner() {
    const { user } = useUser();
    const [complaints, setComplaints] = useState([]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('complaints')
                    .select('*')
                    .eq('assigned_worker_id', user.id)
                    .order('created_at', { ascending: false });
                if (!error && data) setComplaints(data);
            } catch (err) {
                console.error('[Worker] Failed to load assigned complaints:', err);
            }
        })();
    }, [user]);

    return (
        <div className="page-content admin-page">
            <div className="page-breadcrumb">
                <span>Worker</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-active">Tasks & Notifications</span>
            </div>
            <h1 className="page-title">Assigned Complaints</h1>
            <p className="page-subtitle">View tasks assigned to you and track updates in real time.</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <NotificationBell />
            </div>

            <div className="admin-queue-layout">
                <div className="admin-queue-list">
                    {complaints.map(c => (
                        <div key={c.uid || c.id} className="admin-queue-card">
                            <div className="admin-queue-card-header">
                                <span className="admin-queue-card-id">{c.uid || c.id}</span>
                                <span className="admin-table-badge" style={{ background: '#2563EB22', color: '#2563EB' }}>
                                    {c.status}
                                </span>
                            </div>
                            <div className="admin-queue-card-desc">
                                {c.description}
                            </div>
                            <div className="admin-queue-card-meta">
                                <span>📍 {c.location || '—'}</span>
                                <span>·</span>
                                <span>{c.category}</span>
                            </div>
                        </div>
                    ))}
                    {complaints.length === 0 && (
                        <div className="admin-queue-empty">No complaints assigned yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function WorkerNotifications() {
    return (
        <WorkerGuard>
            <WorkerNotificationsInner />
        </WorkerGuard>
    );
}

