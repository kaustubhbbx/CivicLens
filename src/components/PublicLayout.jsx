import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell.jsx";
import { useLanguage } from "../LanguageContext.jsx";

function getDeviceId() {
    if (typeof window === 'undefined') return null;
    let id = localStorage.getItem('cl_device_id');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cl_device_id', id);
    }
    return id;
}

export default function PublicLayout() {
    const { language, toggleLanguage } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const handleRecordClick = () => {
        if (location.pathname === '/') {
            const el = document.getElementById('report-wizard');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate('/?scroll=report-wizard');
        }
    };

    return (
        <div className="public-layout-root">
            <header className="public-nav-header">
                <div className="public-nav-container">
                    <div className="public-brand" onClick={() => navigate('/')}>
                        <div className="public-brand-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                        </div>
                        <span className="public-brand-text">Civic<span className="public-brand-accent">Lens</span></span>
                    </div>

                    <nav className="public-nav-links">
                        <Link to="/queue" className={location.pathname === '/queue' ? 'active' : ''}>Live Issues</Link>
                        <Link to="/logs" className={location.pathname === '/logs' ? 'active' : ''}>System Logs</Link>
                        <Link to="/points" className={location.pathname === '/points' ? 'active' : ''}>Leaderboard</Link>
                    </nav>

                    <div className="public-nav-actions">
                        <button className="public-lang-btn" onClick={toggleLanguage} title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                            <span>{language === 'en' ? 'EN' : 'हिन्दी'}</span>
                        </button>
                        <div className="public-nav-bell">
                            <NotificationBell explicitIdentifier={getDeviceId()} />
                        </div>
                        <button className="public-record-btn" onClick={handleRecordClick}>
                            Record Complaint
                        </button>
                    </div>
                </div>
            </header>
            <main className="public-main-content">
                <Outlet />
            </main>
        </div>
    );
}
