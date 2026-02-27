import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useLanguage } from '../LanguageContext.jsx';
import { translations } from '../translations.js';
import { useUser } from '@clerk/clerk-react';
import './NotificationBell.css';

export default function NotificationBell({ explicitIdentifier }) {
    const { language } = useLanguage();
    const t = translations[language];
    const { user, isLoaded } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const mode = explicitIdentifier ? 'device' : 'user';
    const identifier = explicitIdentifier || (isLoaded && user ? user.id : null);

    const fetchInitialData = useCallback(async () => {
        if (!identifier) return;

        try {
            const column = mode === 'device' ? 'device_id' : 'user_id';
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq(column, identifier)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (err) {
            console.error('Initial Notifications Fetch Error:', err);
        }
    }, [identifier, mode]);

    useEffect(() => {
        fetchInitialData();
        if (!identifier) return;

        const column = mode === 'device' ? 'device_id' : 'user_id';

        const channel = supabase
            .channel(`notifications_${mode}_${identifier}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `${column}=eq.${identifier}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setNotifications(prev => [payload.new, ...prev]);
                        if (!payload.new.is_read) {
                            setUnreadCount(prev => prev + 1);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setNotifications(prev =>
                            prev.map(n => n.id === payload.new.id ? payload.new : n)
                        );
                        if (payload.new.is_read === true && payload.old.is_read === false) {
                            setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [identifier, mode, fetchInitialData]);

    const markAsRead = async (notification) => {
        if (notification.is_read) return;

        setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await fetch(`http://localhost:5000/api/notifications/${notification.id}/read`, {
                method: 'PATCH',
            });
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'complaint_reported':
            case 'complaint_reported_citizen':
                return '🆕';
            case 'complaint_assigned':
            case 'complaint_assigned_admin':
                return '👷';
            case 'work_started_citizen':
            case 'work_started_admin':
                return '🚧';
            case 'worker_progress_update':
                return '📈';
            case 'worker_completed':
                return '✅';
            case 'complaint_resolved_citizen':
            case 'complaint_resolved_admin':
                return '🎉';
            case 'complaint_escalated':
                return '⚠️';
            case 'chat_escalated':
                return '💬';
            default:
                return '🔔';
        }
    };

    return (
        <div className="notif-wrapper">
            <button className="notif-bell-btn" onClick={() => setIsOpen(!isOpen)}>
                <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>

                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <h4>{t.notificationsTitle || 'Notifications'}</h4>
                        <span className="notif-count-text">
                            {unreadCount} {t.unreadLabel || 'Unread'}
                        </span>
                    </div>

                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <p className="notif-empty">{t.noNotifications || 'No new notifications'}</p>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                    onClick={() => markAsRead(n)}
                                >
                                    <div className="notif-icon">{getIconForType(n.type)}</div>
                                    <div className="notif-content">
                                        <p className="notif-message">{n.message}</p>
                                        <span className="notif-time">
                                            {new Date(n.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

