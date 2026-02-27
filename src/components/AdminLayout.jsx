// ─── Admin Layout ─────────────────────────────────────────────────────────────
// Wraps admin pages with AdminGuard, sidebar, and admin-specific navigation.
// This layout is used for all /admin/* routes.

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../LanguageContext.jsx';
import { translations } from '../translations.js';
import NotificationBell from './NotificationBell.jsx';
import AdminGuard from './AdminGuard.jsx';

function AdminSidebar({ activePage, onNav }) {
    const navItems = [
        {
            id: 'dashboard', label: 'Dashboard', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            )
        },
        {
            id: 'queue', label: 'Complaint Queue', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            )
        },
        {
            id: 'routing-rules', label: 'Routing Rules', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            )
        },
        {
            id: 'logs', label: 'System Logs', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            )
        },
        {
            id: 'support', label: 'Live Support', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            )
        },
    ];

    return (
        <aside className="sidebar admin-sidebar">
            <div className="sidebar-brand" onClick={() => onNav('dashboard')}>
                <div className="brand-icon admin-brand-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                </div>
                <span className="brand-text">Civic<span className="brand-accent">Lens</span></span>
                <span className="admin-badge-label">ADMIN</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNav(item.id)}
                    >
                        <span className="sidebar-nav-icon">{item.icon}</span>
                        <span className="sidebar-nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer-links">
                <button className="sidebar-nav-item sidebar-citizen-link" onClick={() => onNav('citizen-portal')}>
                    <span className="sidebar-nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    </span>
                    <span className="sidebar-nav-label">Citizen Portal</span>
                </button>
            </div>
        </aside>
    );
}

function AdminTopBar({ user }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const getPageFromPath = () => {
        const path = location.pathname.replace('/admin', '').replace('/', '') || 'dashboard';
        return path;
    };

    return (
        <header className="topbar admin-topbar">
            <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>

            <div className="topbar-admin-title">
                <span className="admin-panel-badge">🔐 Admin Panel</span>
                <span className="admin-page-name">{getPageFromPath().replace('-', ' ')}</span>
            </div>

            <div className="topbar-actions">
                <NotificationBell />
                <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                        elements: {
                            avatarBox: { width: '32px', height: '32px' },
                        },
                    }}
                />
            </div>

            {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}
            <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <div className="sidebar-brand">
                        <div className="brand-icon admin-brand-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                        </div>
                        <span className="brand-text">Civic<span className="brand-accent">Lens</span></span>
                        <span className="admin-badge-label">ADMIN</span>
                    </div>
                    <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <nav className="drawer-nav">
                    {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'queue', label: 'Complaint Queue' },
                        { id: 'routing-rules', label: 'Routing Rules' },
                        { id: 'logs', label: 'System Logs' },
                        { id: 'support', label: 'Live Support' },
                    ].map(item => (
                        <button
                            key={item.id}
                            className={`drawer-nav-item ${getPageFromPath() === item.id ? 'active' : ''}`}
                            onClick={() => { navigate(item.id === 'dashboard' ? '/admin' : `/admin/${item.id}`); setDrawerOpen(false); }}
                        >
                            <span>{item.label}</span>
                        </button>
                    ))}
                    <button className="drawer-nav-item" onClick={() => { navigate('/'); setDrawerOpen(false); }}>
                        <span>↩ Citizen Portal</span>
                    </button>
                </nav>
                <div className="drawer-footer">
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.fullName || user?.firstName || 'Admin'}</div>
                        <div className="sidebar-user-role">System Administrator</div>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default function AdminLayout({ children }) {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const activePage = location.pathname.replace('/admin', '').replace('/', '') || 'dashboard';

    const handleNav = (page) => {
        if (page === 'citizen-portal') {
            navigate('/');
            return;
        }
        navigate(page === 'dashboard' ? '/admin' : `/admin/${page}`);
    };

    return (
        <AdminGuard>
            <div className="app-layout admin-layout">
                <AdminSidebar activePage={activePage} onNav={handleNav} />
                <div className="main-area">
                    <AdminTopBar user={user} />
                    <main className="main-content">
                        {children}
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
