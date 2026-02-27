import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import ChatBot from "./ChatBot";
import { useLanguage } from "./LanguageContext.jsx";
import { translations, CATEGORY_LABEL_KEYS } from "./translations.js";
import { updateComplaintVotes, updateComplaintStatus, insertActivityLog, insertComplaint, uploadComplaintImage } from "./lib/supabase.js";
import AdminLayout from "./components/AdminLayout.jsx";
import { AdminDashboardPage, AdminQueuePage, AdminLogsPage, AdminRoutingRulesPage } from "./components/AdminPages.jsx";
import { AdminSupportPage } from "./components/AdminSupportPage.jsx";
import DashboardPro from "./components/DashboardPro.jsx";
import WorkerNotifications from "./components/WorkerNotifications.jsx";
import LocationPickerMap from "./components/LocationPickerMap.jsx";

// ─── API Key ──────────────────────────────────────────────────────────────────
// Paste your Groq API key here
const GROQ_API_KEY = "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";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: "roads", label: "Roads & Potholes", icon: "🛣️", color: "#FF6B35", dept: "Public Works Department (PWD)" },
    { id: "sanitation", label: "Sanitation", icon: "🗑️", color: "#4ECDC4", dept: "Municipal Sanitation Department" },
    { id: "electricity", label: "Electricity", icon: "⚡", color: "#FFE66D", dept: "State Electricity Board" },
    { id: "water", label: "Water Supply", icon: "💧", color: "#45B7D1", dept: "Water Board (Jal Board)" },
    { id: "drainage", label: "Drainage", icon: "🚿", color: "#96CEB4", dept: "Municipal Drainage Cell" },
    { id: "safety", label: "Safety & Traffic", icon: "🚨", color: "#FF4757", dept: "Traffic Police" },
];

const PRIORITY_COLORS = { Critical: "#FF4757", High: "#FF6B35", Medium: "#3B82F6", Low: "#96CEB4" };
const DAMAGE_COLORS = { severe: "#FF4757", major: "#FF6B35", moderate: "#FFE66D", minor: "#96CEB4" };
const STATUS_COLORS = { Reported: "#8B9FDE", "In Progress": "#FFE66D", Resolved: "#4ECDC4", Assigned: "#3B82F6" };
const SEVERITY_WEIGHT = { minor: 1, moderate: 2, major: 3, severe: 4 };
const PRIORITY_WEIGHT = { Low: 1, Medium: 2, High: 3, Critical: 4 };

const LEVELS = [
    { min: 0, max: 50, name: "Area Watcher", icon: "👁️" },
    { min: 51, max: 150, name: "Civic Supporter", icon: "🤝" },
    { min: 151, max: 300, name: "Civic Warrior", icon: "⚔️" },
    { min: 301, max: Infinity, name: "City Guardian", icon: "🏛️" },
];

const MOCK_COMPLAINTS = [
    {
        id: "CL-2026-00001", category: "roads",
        description: "Huge pothole on MG Road — vehicle tyre burst, very dangerous",
        location: "MG Road, Ward 12, Nagpur", zone: "Ward 12 — Sitabuldi",
        priority: "Critical", status: "In Progress", votes: 47,
        is_emergency: true, ai_reasoning: "Large hole on main road — danger to vehicles and pedestrians",
        ai_keywords: ["Pothole", "Dangerous", "Tyre"], ai_confidence: 96,
        created_at: "2026-02-26T08:30:00", device_id: "dev_001",
        assigned_dept: "PWD", assigned_unit: "Zone 4 — Dharampeth",
        response_time: 14.2, duplicate_of: null,
    },
    {
        id: "CL-2026-00002", category: "water",
        description: "No water supply for 3 days — entire colony facing issues",
        location: "Laxmi Nagar, Ward 23, Delhi", zone: "Ward 23 — Laxmi Nagar",
        priority: "High", status: "Reported", votes: 31,
        is_emergency: false, ai_reasoning: "Water supply cut for 3 days — affecting multiple households",
        ai_keywords: ["Water", "Supply", "Colony"], ai_confidence: 91,
        created_at: "2026-02-26T09:15:00", device_id: "dev_002",
        assigned_dept: "Water Board", assigned_unit: "Zone 2 — East Delhi",
        response_time: null, duplicate_of: null,
    },
    {
        id: "CL-2026-00003", category: "electricity",
        description: "Street lights out for 2 weeks — pitched dark at night",
        location: "Civil Lines, Ward 8, Nagpur", zone: "Ward 8 — Civil Lines",
        priority: "Medium", status: "Assigned", votes: 18,
        is_emergency: false, ai_reasoning: "Night safety concern but no immediate life threat",
        ai_keywords: ["Lights", "Weeks", "Darkness"], ai_confidence: 87,
        created_at: "2026-02-25T14:00:00", device_id: "dev_003",
        assigned_dept: "Electricity Board", assigned_unit: "Zone 1 — Civil Lines",
        response_time: 22.5, duplicate_of: null,
    },
    {
        id: "CL-2026-00004", category: "sanitation",
        description: "Garbage not collected for 5 days — foul smell and health hazard",
        location: "Dharampeth Colony, Ward 15, Nagpur", zone: "Ward 15 — Dharampeth",
        priority: "High", status: "Resolved", votes: 22,
        is_emergency: false, ai_reasoning: "Unsanitary conditions — risk of disease outbreak",
        ai_keywords: ["Garbage", "Smell", "Health"], ai_confidence: 93,
        created_at: "2026-02-24T11:00:00", device_id: "dev_004",
        assigned_dept: "Sanitation Dept", assigned_unit: "Zone 3 — Dharampeth",
        response_time: 8.7, duplicate_of: null,
    },
    {
        id: "CL-2026-00005", category: "roads",
        description: "Massive pothole near Sadar chowk — bikers falling down",
        location: "Sadar Bazaar, Ward 12, Nagpur", zone: "Ward 12 — Sitabuldi",
        priority: "Critical", status: "Reported", votes: 35,
        is_emergency: true, ai_reasoning: "Similar to existing report CL-2026-00001. AI detected duplicate.",
        ai_keywords: ["Pothole", "Biker", "Chowk"], ai_confidence: 94,
        created_at: "2026-02-26T10:30:00", device_id: "dev_005",
        assigned_dept: "PWD", assigned_unit: "Zone 4 — Dharampeth",
        response_time: null, duplicate_of: "CL-2026-00001",
    },
    {
        id: "CL-2026-00006", category: "drainage",
        description: "Drain overflowing after rain — dirty water on school road",
        location: "Sarojini Nagar, Ward 42, Lucknow", zone: "Ward 42 — Sarojini Nagar",
        priority: "High", status: "Assigned", votes: 28,
        is_emergency: false, ai_reasoning: "Drainage overflow — hazard to public health and hygiene",
        ai_keywords: ["Drain", "Overflow", "Stagnant"], ai_confidence: 89,
        created_at: "2026-02-23T16:00:00", device_id: "dev_006",
        assigned_dept: "Drainage Cell", assigned_unit: "Zone 5 — Sarojini Nagar",
        response_time: 18.3, duplicate_of: null,
    },
    {
        id: "CL-2026-00007", category: "safety",
        description: "No traffic signal in school zone — child safety at risk",
        location: "Pratap Nagar, Ward 31, Jaipur", zone: "Ward 31 — Pratap Nagar",
        priority: "High", status: "Reported", votes: 41,
        is_emergency: false, ai_reasoning: "Missing traffic signal in school zone — child safety concern",
        ai_keywords: ["School", "Signal", "Safety"], ai_confidence: 92,
        created_at: "2026-02-25T07:45:00", device_id: "dev_007",
        assigned_dept: "Traffic Police", assigned_unit: "Zone 3 — Pratap Nagar",
        response_time: null, duplicate_of: null,
        damage_level: "major", risk_type: "Child safety risk near school zone",
        authority: "Traffic Police", escalation_required: true,
        estimated_resolution_time: "Within 24 hours", ai_score: 105,
    },
];

const DEPT_STATS = [
    { dept: "Public Works Dept (PWD)", avgTime: 14.2, resolved: 128, pending: 23, efficiency: 98.4 },
    { dept: "Water Board (Jal Board)", avgTime: 18.6, resolved: 96, pending: 14, efficiency: 95.1 },
    { dept: "Electricity Board", avgTime: 22.5, resolved: 74, pending: 11, efficiency: 92.8 },
    { dept: "Sanitation Department", avgTime: 8.7, resolved: 152, pending: 19, efficiency: 97.2 },
    { dept: "Municipal Drainage Cell", avgTime: 28.3, resolved: 65, pending: 12, efficiency: 90.5 },
    { dept: "Traffic Police", avgTime: 6.1, resolved: 67, pending: 5, efficiency: 99.1 },
];

const WEEKLY_DATA = [65, 72, 58, 81, 91, 78, 85];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDeviceId() {
    let id = localStorage.getItem("cl_device_id");
    if (!id) { id = "dev_" + Math.random().toString(36).substr(2, 9); localStorage.setItem("cl_device_id", id); }
    return id;
}
function getPoints() { return parseInt(localStorage.getItem("cl_points") || "0"); }
function addPoints(n) { localStorage.setItem("cl_points", getPoints() + n); }
function getLevel(pts) { return LEVELS.find((l) => pts >= l.min && pts <= l.max) || LEVELS[0]; }
function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000 / 60 / 60;
    if (diff < 1) return `${Math.floor(diff * 60)}m ago`;
    if (diff < 24) return `${Math.floor(diff)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function calculateAiScore(damageLevel, priority) {
    const sw = SEVERITY_WEIGHT[damageLevel] || 2;
    const pw = PRIORITY_WEIGHT[priority] || 2;
    return sw * 25 + pw * 10;
}

const CIVIC_SYSTEM_PROMPT = `You are an AI Civic Intelligence Engine for Indian municipal complaint systems.

Your responsibilities:
1. Categorize the complaint into one of: roads, sanitation, electricity, water, drainage, safety
2. Evaluate severity of damage: minor (inconvenience only), moderate (service disruption), major (infrastructure damage), severe (life-threatening / high public risk)
3. Determine risk to public safety
4. Assign priority: severe→Critical, major→High, moderate→Medium, minor→Low
5. Suggest the responsible government authority
6. Decide if escalation is required

Authority Mapping:
- roads → Public Works Department (PWD)
- sanitation → Municipal Sanitation Department
- electricity → State Electricity Board
- water → Water Board (Jal Board)
- drainage → Municipal Drainage Cell
- safety → Traffic Police or Local Police

Escalation is required if ANY of these apply:
- severe damage level
- risk to children, school, or hospital
- main road blockage
- fire hazard or electrocution risk
- flooding or sewage overflow
- public accident risk

Return ONLY a valid JSON object with exactly these fields:
{
  "category": "roads | sanitation | electricity | water | drainage | safety",
  "damage_level": "minor | moderate | major | severe",
  "priority": "Low | Medium | High | Critical",
  "risk_type": "short description of risk",
  "authority": "official department name",
  "estimated_resolution_time": "time estimate string",
  "escalation_required": true or false,
  "confidence": number 0-100,
  "reasoning": "clear explanation"
}

No markdown. No extra text. Only valid JSON.`;

async function classifyCivicComplaint(complaintText, lang = 'en', retryCount = 0) {
    const langInstruction = lang === 'hi' ? 'Write the reasoning field in Hindi.' : 'Write the reasoning field in English.';

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: CIVIC_SYSTEM_PROMPT },
                { role: 'user', content: `Analyze this civic complaint and return JSON only. ${langInstruction}\n\nComplaint: "${complaintText}"` },
            ],
            temperature: 0,
            max_tokens: 400,
        }),
    });

    if (!res.ok) throw new Error(`AI classification failed: ${res.status}`);

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
        if (retryCount < 1) {
            return classifyCivicComplaint(complaintText, lang, retryCount + 1);
        }
        return null;
    }

    const validCategories = ['roads', 'sanitation', 'electricity', 'water', 'drainage', 'safety'];
    const validDamage = ['minor', 'moderate', 'major', 'severe'];
    const validPriority = ['Low', 'Medium', 'High', 'Critical'];

    if (!validCategories.includes(parsed.category)) parsed.category = 'roads';
    if (!validDamage.includes(parsed.damage_level)) parsed.damage_level = 'moderate';
    if (!validPriority.includes(parsed.priority)) {
        const damageMap = { minor: 'Low', moderate: 'Medium', major: 'High', severe: 'Critical' };
        parsed.priority = damageMap[parsed.damage_level] || 'Medium';
    }
    if (typeof parsed.confidence !== 'number') parsed.confidence = 85;
    if (typeof parsed.escalation_required !== 'boolean') parsed.escalation_required = parsed.damage_level === 'severe';

    parsed.ai_score = calculateAiScore(parsed.damage_level, parsed.priority);

    return parsed;
}

// ─── Reusable Components ─────────────────────────────────────────────────────

function Badge({ label, color, small }) {
    return (
        <span className={`badge ${small ? 'badge-sm' : ''}`} style={{
            background: color + "18", border: `1px solid ${color}40`,
            color,
        }}>{label}</span>
    );
}

function StatCard({ label, value, sub, color, icon }) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <span className="stat-card-label">{label}</span>
                {icon && <span className="stat-card-icon" style={{ color }}>{icon}</span>}
            </div>
            <div className="stat-card-value" style={{ color }}>{value}</div>
            {sub && <div className="stat-card-sub">{sub}</div>}
        </div>
    );
}

function MiniBarChart({ data, color = "#3B82F6", height = 60 }) {
    const max = Math.max(...data);
    return (
        <div className="mini-bar-chart" style={{ height }}>
            {data.map((v, i) => (
                <div key={i} className="mini-bar" style={{
                    height: `${(v / max) * 100}%`,
                    background: i === data.length - 2 ? color : `${color}55`,
                }} />
            ))}
        </div>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage }) {
    const { language } = useLanguage();
    const t = translations[language];
    const navigate = useNavigate();
    const navItems = [
        {
            id: "dashboard", labelKey: "dashboard", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            )
        },
        {
            id: "routing", labelKey: "routingRules", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            )
        },
        {
            id: "workflows", labelKey: "workflows", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
            )
        },
        {
            id: "post", labelKey: "postComplaint", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
            )
        },
        {
            id: "queue", labelKey: "queue", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            )
        },
        {
            id: "logs", labelKey: "logs", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            )
        },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand" onClick={() => setPage("dashboard")}>
                <div className="brand-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                </div>
                <span className="brand-text">Civic<span className="brand-accent">Lens</span></span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-nav-item ${page === item.id ? 'active' : ''}`}
                        onClick={() => setPage(item.id)}
                    >
                        <span className="sidebar-nav-icon">{item.icon}</span>
                        <span className="sidebar-nav-label">{t[item.labelKey]}</span>
                    </button>
                ))}
            </nav>

            {/* Admin Panel Link */}
            <div style={{ padding: '8px 12px', marginTop: 'auto' }}>
                <button
                    className="sidebar-nav-item"
                    onClick={() => navigate('/admin')}
                    style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, rgba(123,47,255,0.12), rgba(59,130,246,0.12))',
                        border: '1px solid rgba(123,47,255,0.25)',
                        borderRadius: '8px',
                    }}
                >
                    <span className="sidebar-nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B2FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </span>
                    <span className="sidebar-nav-label" style={{ color: '#7B2FFF', fontWeight: 600 }}>Admin Panel</span>
                </button>
            </div>

            <div className="sidebar-user">
                <div className="sidebar-user-avatar">RS</div>
                <div className="sidebar-user-info">
                    <div className="sidebar-user-name">Rahul Sharma</div>
                    <div className="sidebar-user-role">{t.nagarNigamAdmin}</div>
                </div>
            </div>
        </aside>
    );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ searchQuery, setSearchQuery }) {
    const { language, toggleLanguage } = useLanguage();
    const t = translations[language];
    return (
        <header className="topbar">
            <div className="topbar-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="topbar-actions">
                <button className="lang-toggle-btn" onClick={toggleLanguage} title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    <span>{language === 'en' ? 'EN' : 'हिंदी'}</span>
                </button>
                <button className="topbar-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                    <span className="topbar-badge-dot"></span>
                </button>
                <button className="topbar-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                </button>
            </div>
        </header>
    );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ complaints }) {
    const { language } = useLanguage();
    const t = translations[language];
    const stats = {
        total: complaints.length,
        active: complaints.filter(c => c.status !== "Resolved").length,
        resolved: complaints.filter(c => c.status === "Resolved").length,
        emergency: complaints.filter(c => c.is_emergency).length,
        avgResolution: "16.8",
    };

    const recentComplaints = [...complaints].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    return (
        <div className="page-content">
            <div className="page-breadcrumb">
                <span>{t.adminPanel}</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-active">{t.dashboardBreadcrumb}</span>
            </div>
            <h1 className="page-title">{t.overviewAnalytics}</h1>
            <p className="page-subtitle">{t.dashboardSubtitle}</p>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard label={t.totalComplaints} value={stats.total} sub={t.fromLastWeek} color="#3B82F6" icon="📊" />
                <StatCard label={t.activeIssues} value={stats.active} sub={`${stats.emergency} ${t.emergency}`} color="#FF6B35" icon="🔥" />
                <StatCard label={t.resolved} value={stats.resolved} sub={t.avgInHours} color="#4ECDC4" icon="✅" />
                <StatCard label={t.aiAccuracy} value="94.2%" sub={t.fromLastMonth} color="#7B2FFF" icon="🧠" />
            </div>

            {/* Two column layout */}
            <div className="dashboard-cols">
                {/* Recent Reports */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            {t.recentReports}
                        </h3>
                        <span className="card-badge live">{t.live}</span>
                    </div>
                    <div className="report-list">
                        {recentComplaints.map(c => {
                            const cat = CATEGORIES.find(x => x.id === c.category);
                            return (
                                <div key={c.id} className="report-item">
                                    <div className="report-item-icon" style={{ background: cat?.color + "18", color: cat?.color }}>
                                        {cat?.icon}
                                    </div>
                                    <div className="report-item-content">
                                        <div className="report-item-title">{c.description}</div>
                                        <div className="report-item-meta">
                                            <span>{c.id}</span>
                                            <span>·</span>
                                            <span>{c.location}</span>
                                            <span>·</span>
                                            <span>{formatTime(c.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="report-item-badges">
                                        <Badge label={c.priority} color={PRIORITY_COLORS[c.priority]} small />
                                        <Badge label={c.status} color={STATUS_COLORS[c.status]} small />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Department Performance */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ECDC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            {t.deptPerformance}
                        </h3>
                    </div>
                    <div className="dept-list">
                        {DEPT_STATS.map(d => (
                            <div key={d.dept} className="dept-item">
                                <div className="dept-item-info">
                                    <div className="dept-item-name">{d.dept}</div>
                                    <div className="dept-item-stats">{d.resolved} {t.resolvedLabel} · {d.pending} {t.pendingLabel}</div>
                                </div>
                                <div className="dept-item-efficiency">
                                    <div className="dept-eff-value" style={{ color: d.efficiency > 95 ? "#4ECDC4" : d.efficiency > 90 ? "#FFE66D" : "#FF6B35" }}>
                                        {d.efficiency}%
                                    </div>
                                    <div className="dept-eff-bar">
                                        <div className="dept-eff-fill" style={{
                                            width: `${d.efficiency}%`,
                                            background: d.efficiency > 95 ? "#4ECDC4" : d.efficiency > 90 ? "#FFE66D" : "#FF6B35",
                                        }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Weekly Activity Chart */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B2FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                        {t.weeklyReportVolume}
                    </h3>
                    <span className="card-badge">{t.last7Days}</span>
                </div>
                <div className="weekly-chart">
                    {dayKeys.map((dayKey, i) => (
                        <div key={dayKey} className="weekly-bar-col">
                            <div className="weekly-bar-wrap">
                                <div className="weekly-bar" style={{
                                    height: `${(WEEKLY_DATA[i] / Math.max(...WEEKLY_DATA)) * 100}%`,
                                    background: i === 4 ? "#3B82F6" : "rgba(59,130,246,0.3)",
                                }} />
                            </div>
                            <span className="weekly-bar-label">{t[dayKey]}</span>
                            <span className="weekly-bar-value">{WEEKLY_DATA[i]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Routing Rules Page ───────────────────────────────────────────────────────
function RoutingPage({ complaints }) {
    const featured = complaints.find(c => c.duplicate_of) || complaints[0];
    const original = complaints.find(c => c.id === featured?.duplicate_of);
    const cat = CATEGORIES.find(x => x.id === featured?.category);
    const deptStat = DEPT_STATS.find(d => d.dept === featured?.assigned_dept);

    return (
        <div className="page-content">
            <div className="page-breadcrumb">
                <span>ADMIN PANEL</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-active">ROUTING WORKFLOW</span>
            </div>
            <h1 className="page-title">Smart Routing & Dept Workflow</h1>
            <p className="page-subtitle">AI-driven complaint categorization and automatic department assignment — ensuring every citizen's voice reaches the correct department instantly.</p>

            {/* AI Notification + Routing Efficiency */}
            <div className="routing-top-grid">
                <div className="card ai-notification-card">
                    <div className="ai-notif-header">
                        <span className="ai-notif-icon">✨</span>
                        <span className="ai-notif-title">AI Notification: Duplicate Detected</span>
                    </div>
                    <p className="ai-notif-desc">
                        <strong>Large Pothole</strong> complaint from Sadar Bazaar (ID #{featured?.id}) — matches a report received 2 hours ago (ID #{original?.id || "CL-2026-00001"}). AI recommends merging both.
                    </p>
                    <button className="btn-primary">
                        View Original Report
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    </button>
                </div>

                <div className="card location-preview-card">
                    <div className="location-preview-label">LOCATION PREVIEW</div>
                    <div className="location-map">
                        <div className="map-grid"></div>
                        <div className="map-pin">📍</div>
                        <div className="map-radius"></div>
                    </div>
                </div>

                <div className="card efficiency-card">
                    <div className="efficiency-label">Routing Efficiency</div>
                    <div className="efficiency-value">{deptStat?.efficiency || 98.4}%</div>
                    <div className="efficiency-bar">
                        <div className="efficiency-fill" style={{ width: `${deptStat?.efficiency || 98.4}%` }} />
                    </div>
                    <div className="efficiency-sub">📈 +2.1% from last month</div>
                </div>
            </div>

            {/* Visual Routing Pathway */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <span style={{ fontSize: "16px" }}>✨</span>
                        Visual Routing Pathway
                    </h3>
                    <span className="card-badge live">● LIVE FLOW</span>
                </div>
                <div className="routing-pathway">
                    <div className="pathway-step">
                        <div className="pathway-icon reported">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <div className="pathway-label">Report Filed</div>
                        <div className="pathway-sub">Pothole @ Sadar Bazaar</div>
                    </div>
                    <div className="pathway-connector">
                        <div className="pathway-line"></div>
                        <div className="pathway-dot"></div>
                        <div className="pathway-dot"></div>
                        <div className="pathway-dot"></div>
                    </div>
                    <div className="pathway-step active">
                        <div className="pathway-icon categorized">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <div className="pathway-label" style={{ color: "#3B82F6" }}>AI Categorized</div>
                        <div className="pathway-sub" style={{ color: "#3B82F6" }}>HIGH PRIORITY POTHOLE</div>
                    </div>
                    <div className="pathway-connector">
                        <div className="pathway-line faded"></div>
                        <div className="pathway-dot faded"></div>
                        <div className="pathway-dot faded"></div>
                        <div className="pathway-dot faded"></div>
                    </div>
                    <div className="pathway-step">
                        <div className="pathway-icon assigned">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        </div>
                        <div className="pathway-label">Sent to Dept</div>
                        <div className="pathway-sub">{featured?.assigned_dept} · {featured?.assigned_unit}</div>
                    </div>
                </div>
            </div>

            {/* Logic Rules + Response Time */}
            <div className="routing-bottom-grid">
                <div className="card">
                    <h3 className="card-section-title">APPLIED LOGIC RULES</h3>
                    <div className="logic-rules">
                        <div className="logic-rule">
                            <div className="logic-rule-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>
                            </div>
                            <span className="logic-rule-text">Keywords: "{featured?.ai_keywords?.join('", "')}"</span>
                            <Badge label="Active" color="#4ECDC4" small />
                        </div>
                        <div className="logic-rule">
                            <div className="logic-rule-icon">📍</div>
                            <span className="logic-rule-text">Zone: {featured?.zone || "Downtown Metro 1"}</span>
                            <Badge label="Active" color="#4ECDC4" small />
                        </div>
                        <div className="logic-rule">
                            <div className="logic-rule-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFE66D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <span className="logic-rule-text">Priority Escalation: {featured?.priority}</span>
                            <Badge label="Triggered" color="#FFE66D" small />
                        </div>
                        <div className="logic-rule">
                            <div className="logic-rule-icon">🔄</div>
                            <span className="logic-rule-text">Duplicate Detection: Match found</span>
                            <Badge label="Active" color="#4ECDC4" small />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="card-section-title">DEPARTMENT RESPONSE TIME</h3>
                    <div className="response-time-content">
                        <div className="response-time-header">
                            <div>
                                <div className="response-time-label">AVG. {featured?.assigned_dept?.toUpperCase()} TTR</div>
                                <div className="response-time-value">{deptStat?.avgTime || 14.2} Hours</div>
                            </div>
                            <div className="response-time-icon">⏱️</div>
                        </div>
                        <MiniBarChart data={[12, 18, 14, 16, 22, 14, 11]} color="#3B82F6" height={80} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Workflows Page ─────────────────────────────────────────────────────────
function WorkflowsPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const workflows = [
        { nameKey: "wfEmergency", descKey: "wfEmergencyDesc", status: t.active, triggers: 23, lastRun: "2m ago", color: "#FF4757" },
        { nameKey: "wfDuplicate", descKey: "wfDuplicateDesc", status: t.active, triggers: 47, lastRun: "5m ago", color: "#3B82F6" },
        { nameKey: "wfWardAssign", descKey: "wfWardAssignDesc", status: t.active, triggers: 156, lastRun: "1m ago", color: "#4ECDC4" },
        { nameKey: "wfSLA", descKey: "wfSLADesc", status: t.active, triggers: 8, lastRun: "15m ago", color: "#FFE66D" },
        { nameKey: "wfFeedback", descKey: "wfFeedbackDesc", status: t.paused, triggers: 89, lastRun: "1 hour", color: "#7B2FFF" },
        { nameKey: "wfReport", descKey: "wfReportDesc", status: t.active, triggers: 4, lastRun: "2 days", color: "#96CEB4" },
    ];

    return (
        <div className="page-content">
            <div className="page-breadcrumb">
                <span>{t.adminPanel}</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-active">{t.workflowsBreadcrumb}</span>
            </div>
            <h1 className="page-title">{t.automationWorkflows}</h1>
            <p className="page-subtitle">{t.workflowsSubtitle}</p>

            <div className="workflows-grid">
                {workflows.map(w => (
                    <div key={w.nameKey} className="card workflow-card">
                        <div className="workflow-header">
                            <div className="workflow-dot" style={{ background: w.color }} />
                            <Badge label={w.status} color={w.status === t.active ? "#4ECDC4" : "#FFE66D"} small />
                        </div>
                        <h3 className="workflow-name">{t[w.nameKey]}</h3>
                        <p className="workflow-desc">{t[w.descKey]}</p>
                        <div className="workflow-stats">
                            <div className="workflow-stat">
                                <span className="workflow-stat-val">{w.triggers}</span>
                                <span className="workflow-stat-label">{t.triggers}</span>
                            </div>
                            <div className="workflow-stat">
                                <span className="workflow-stat-val">{w.lastRun}</span>
                                <span className="workflow-stat-label">{t.lastRun}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Queue Page ───────────────────────────────────────────────────────────────
function QueuePage({ complaints, onVote, onUpdate }) {
    const { language } = useLanguage();
    const t = translations[language];
    const [filter, setFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const voted = JSON.parse(localStorage.getItem("cl_voted") || "{}");

    function handleVote(id) {
        if (voted[id]) return;
        voted[id] = true;
        localStorage.setItem("cl_voted", JSON.stringify(voted));
        addPoints(2);
        onVote(id);
    }

    const sorted = [...complaints]
        .filter(c => filter === "all" || c.category === filter)
        .filter(c => statusFilter === "all" || c.status === statusFilter)
        .sort((a, b) => {
            if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
            if ((b.ai_score || 0) !== (a.ai_score || 0)) return (b.ai_score || 0) - (a.ai_score || 0);
            const pw = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            if (pw[b.priority] !== pw[a.priority]) return pw[b.priority] - pw[a.priority];
            return b.votes - a.votes;
        });

    return (
        <div className="page-content">
            <div className="page-breadcrumb">
                <span>{t.adminPanel}</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-active">{t.queueBreadcrumb}</span>
            </div>
            <h1 className="page-title">{t.complaintQueue}</h1>
            <p className="page-subtitle">{t.queueSubtitle}</p>

            {/* Filters */}
            <div className="queue-filters">
                <div className="filter-group">
                    {["all", ...CATEGORIES.map(c => c.id)].map(f => (
                        <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {f === "all" ? t.all : CATEGORIES.find(c => c.id === f)?.icon + " " + (CATEGORY_LABEL_KEYS[f] ? t[CATEGORY_LABEL_KEYS[f].label] : f)}
                        </button>
                    ))}
                </div>
                <div className="filter-group">
                    {["all", "Reported", "In Progress", "Assigned", "Resolved"].map(s => (
                        <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                            {s === "all" ? t.allStatus : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Queue List */}
            <div className="queue-list">
                {sorted.map(c => {
                    const cat = CATEGORIES.find(x => x.id === c.category);
                    const hasVoted = voted[c.id];
                    return (
                        <div key={c.id} className={`card queue-item ${c.is_emergency ? 'emergency' : ''}`}>
                            <div className="queue-item-main">
                                <div className="queue-item-icon" style={{ background: cat?.color + "18", borderColor: cat?.color + "40" }}>
                                    {cat?.icon}
                                </div>
                                <div className="queue-item-content">
                                    <div className="queue-item-top">
                                        <span className="queue-item-id">{c.id}</span>
                                        {c.is_emergency && <span className="emergency-tag">🚨 EMERGENCY</span>}
                                        {c.duplicate_of && <span className="duplicate-tag">🔄 DUPLICATE</span>}
                                    </div>
                                    <div className="queue-item-title">{c.description}</div>
                                    <div className="queue-item-meta">
                                        📍 {c.location} · {formatTime(c.created_at)} · {c.assigned_dept}
                                    </div>
                                    <div className="queue-item-ai">
                                        🤖 {c.ai_reasoning} <span className="ai-conf">({c.ai_confidence}% {t.confidence})</span>
                                    </div>
                                    {/* Civic Intelligence badges */}
                                    {(c.damage_level || c.risk_type || c.authority) && (
                                        <div className="ci-queue-badges">
                                            {c.damage_level && (
                                                <span className="ci-badge-damage" style={{ color: DAMAGE_COLORS[c.damage_level], borderColor: (DAMAGE_COLORS[c.damage_level] || '#FFE66D') + '40', background: (DAMAGE_COLORS[c.damage_level] || '#FFE66D') + '14' }}>
                                                    {c.damage_level.toUpperCase()}
                                                </span>
                                            )}
                                            {c.escalation_required && (
                                                <span className="ci-badge-escalation">⚠️ {t.escalationRequired || 'ESCALATION'}</span>
                                            )}
                                            {c.estimated_resolution_time && (
                                                <span className="ci-badge-eta">⏱ {c.estimated_resolution_time}</span>
                                            )}
                                            {c.ai_score && (
                                                <span className="ci-badge-score" style={{ color: c.ai_score >= 100 ? '#FF4757' : c.ai_score >= 70 ? '#FF6B35' : '#4ECDC4' }}>
                                                    Score: {c.ai_score}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="queue-item-actions">
                                <div className="queue-item-badges">
                                    <Badge label={c.priority} color={PRIORITY_COLORS[c.priority]} />
                                    <Badge label={c.status} color={STATUS_COLORS[c.status]} />
                                </div>
                                <div className="queue-item-controls">
                                    <button className={`vote-btn ${hasVoted ? 'voted' : ''}`} onClick={() => handleVote(c.id)} disabled={hasVoted}>
                                        ▲ {c.votes}
                                    </button>
                                    <select value={c.status} onChange={e => onUpdate(c.id, { status: e.target.value })} className="status-select">
                                        <option>Reported</option>
                                        <option>In Progress</option>
                                        <option>Assigned</option>
                                        <option>Resolved</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Logs Page ────────────────────────────────────────────────────────────────
function LogsPage({ complaints }) {
    const { language } = useLanguage();
    const t = translations[language];
    const logs = [
        { time: "10:32:15", type: "AI", message: `Duplicate detected: ${complaints[4]?.id} matches ${complaints[0]?.id}`, level: "warn" },
        { time: "10:30:22", type: "SYSTEM", message: `New complaint: ${complaints[4]?.id} — Large pothole near Sadar chowk`, level: "info" },
        { time: "10:28:05", type: "ROUTE", message: `${complaints[2]?.id} auto-assigned → Electricity Board · Zone 1`, level: "success" },
        { time: "09:45:30", type: "AI", message: `Escalated: ${complaints[1]?.id} now HIGH priority`, level: "warn" },
        { time: "09:15:10", type: "SYSTEM", message: `New complaint: ${complaints[1]?.id} — No water for 3 days, Laxmi Nagar`, level: "info" },
        { time: "08:55:00", type: "SLA", message: `SLA Warning: ${complaints[2]?.id} nearing the 24-hour limit`, level: "error" },
        { time: "08:30:45", type: "ROUTE", message: `${complaints[0]?.id} routed → PWD · Zone 4 Dharampeth`, level: "success" },
        { time: "08:30:02", type: "AI", message: `Analysis complete: ${complaints[0]?.id} placed in CRITICAL category`, level: "error" },
        { time: "08:30:00", type: "SYSTEM", message: `New complaint: ${complaints[0]?.id} — Large pothole MG Road, Nagpur`, level: "info" },
        { time: "08:15:00", type: "SYSTEM", message: "Daily report ready — queued to be sent to the Municipal Commissioner", level: "info" },
        { time: "07:00:00", type: "SYSTEM", message: "System health check: All services operational ✓", level: "success" },
    ];

    const levelColors = { info: "#3B82F6", warn: "#FFE66D", error: "#FF4757", success: "#4ECDC4" };

    return (
        <div className="page-content">
            <div className="page-breadcrumb">
                <span>{t.adminPanel}</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-active">{t.systemLogsBreadcrumb}</span>
            </div>
            <h1 className="page-title">{t.systemLogs}</h1>
            <p className="page-subtitle">{t.logsSubtitle}</p>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        {t.activityStream}
                    </h3>
                    <span className="card-badge live">● {t.live}</span>
                </div>
                <div className="logs-list">
                    {logs.map((log, i) => (
                        <div key={i} className="log-entry">
                            <span className="log-time">{log.time}</span>
                            <span className="log-type-badge" style={{ background: levelColors[log.level] + "18", color: levelColors[log.level], borderColor: levelColors[log.level] + "40" }}>
                                {log.type}
                            </span>
                            <span className="log-message">{log.message}</span>
                            <span className="log-level-dot" style={{ background: levelColors[log.level] }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Post Complaint Page ──────────────────────────────────────────────────────
function PostComplaintPage({ onSubmit, setPage }) {
    const { language } = useLanguage();
    const t = translations[language];
    const [step, setStep] = useState(1); // 1=Category, 2=Details, 3=Review, 4=Success
    const [category, setCategory] = useState(null);
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [zone, setZone] = useState("");
    const [isEmergency, setIsEmergency] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [submittedId, setSubmittedId] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const [cameraOpen, setCameraOpen] = useState(false);

    // ─── Audio Recording State ───
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [voiceAiResult, setVoiceAiResult] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);

    const selectedCat = CATEGORIES.find(c => c.id === category);

    // ─── Start / Stop Recording ───
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                clearInterval(recordingTimerRef.current);
                setRecordingTime(0);

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (audioBlob.size < 1000) {
                    alert("Recording too short. Please try again.");
                    return;
                }
                await transcribeAndAnalyze(audioBlob);
            };

            mediaRecorder.start(250);
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Microphone access is required. Please allow microphone permissions in your browser.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    // ─── Groq Whisper Transcription + LLM Analysis ───
    const transcribeAndAnalyze = useCallback(async (audioBlob) => {
        setIsTranscribing(true);
        setVoiceAiResult(null);

        try {
            // Step 1: Whisper transcription via Groq
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-large-v3');
            formData.append('language', 'hi'); // Supports Hindi & English
            formData.append('response_format', 'json');

            const transcriptionRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
                body: formData,
            });

            if (!transcriptionRes.ok) {
                const errText = await transcriptionRes.text();
                console.error('Whisper error:', transcriptionRes.status, errText);
                throw new Error(`Transcription failed: ${transcriptionRes.status}`);
            }

            const transcriptionData = await transcriptionRes.json();
            const transcribedText = transcriptionData.text?.trim();

            if (!transcribedText) {
                alert("Could not transcribe audio. Please speak clearly and try again.");
                setIsTranscribing(false);
                return;
            }

            // Auto-fill description
            setDescription(transcribedText);

            // Step 2: Civic Intelligence Engine classification
            const ciResult = await classifyCivicComplaint(transcribedText, language);

            if (ciResult && ciResult.category && CATEGORIES.find(c => c.id === ciResult.category)) {
                setCategory(ciResult.category);
            }

            setVoiceAiResult({
                detectedCategory: ciResult?.category || category || 'roads',
                priority: ciResult?.priority || 'Medium',
                reasoning: ciResult?.reasoning || 'AI analysis completed based on voice input.',
                confidence: ciResult?.confidence || 85,
                transcribedText,
                damage_level: ciResult?.damage_level || 'moderate',
                risk_type: ciResult?.risk_type || 'General civic concern',
                authority: ciResult?.authority || 'Municipal Corporation',
                escalation_required: ciResult?.escalation_required || false,
                estimated_resolution_time: ciResult?.estimated_resolution_time || 'Within 48 hours',
                ai_score: ciResult?.ai_score || 50,
            });

        } catch (error) {
            console.error('Voice processing error:', error);
            alert('Error processing voice input. Please try again or type your complaint manually.');
        } finally {
            setIsTranscribing(false);
        }
    }, [category, language]);

    const handleImageChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    }, []);

    const removeImage = useCallback(() => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
    }, []);

    const openCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            cameraStreamRef.current = stream;
            setCameraOpen(true);
            // Attach stream to video element after render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (err) {
            console.error('Camera access error:', err);
            // Fallback to file input if camera not available
            cameraInputRef.current?.click();
        }
    }, []);

    const closeCamera = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => track.stop());
            cameraStreamRef.current = null;
        }
        setCameraOpen(false);
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                setImageFile(file);
                setImagePreview(canvas.toDataURL('image/jpeg', 0.9));
            }
            closeCamera();
        }, 'image/jpeg', 0.9);
    }, []);

    const goToReview = useCallback(async () => {
        setStep(3);
        setIsAnalyzing(true);
        try {
            const result = await classifyCivicComplaint(description, language);
            if (result) {
                if (result.category && CATEGORIES.find(c => c.id === result.category)) {
                    setCategory(result.category);
                }
                setAiResult(result);
            } else {
                setAiResult({
                    priority: 'Medium', damage_level: 'moderate', reasoning: 'AI analysis completed.',
                    confidence: 80, risk_type: 'General civic issue', authority: selectedCat?.dept || 'Municipal Corporation',
                    escalation_required: false, estimated_resolution_time: 'Within 48 hours', ai_score: 50,
                });
            }
        } catch (err) {
            console.error('AI Review error:', err);
            setAiResult({
                priority: 'Medium', damage_level: 'moderate', reasoning: 'Analysis completed with limited data.',
                confidence: 70, risk_type: 'General civic concern', authority: selectedCat?.dept || 'Municipal Corporation',
                escalation_required: false, estimated_resolution_time: 'Within 48 hours', ai_score: 50,
            });
        } finally {
            setIsAnalyzing(false);
        }
    }, [category, description, language, selectedCat]);

    const handleSubmit = useCallback(async () => {
        setIsSubmitting(true);
        setValidationError(null);

        const newId = `CL-2026-${String(Math.floor(Math.random() * 90000 + 10000)).padStart(5, "0")}`;

        // Build FormData for backend (validation + storage)
        const formData = new FormData();
        formData.append('id', newId);
        formData.append('text', description);
        formData.append('category', category || '');
        formData.append('location', location || 'Location not specified');
        formData.append('zone', zone || 'Not specified');
        formData.append('device_id', getDeviceId());
        formData.append('risk_type', aiResult?.risk_type || 'General civic concern');
        formData.append('damage_level', aiResult?.damage_level || 'moderate');
        formData.append('authority', aiResult?.authority || selectedCat?.dept || 'Municipal Corporation');
        formData.append('priority', aiResult?.priority || 'Medium');
        formData.append('ai_score', String(aiResult?.ai_score || calculateAiScore(aiResult?.damage_level || 'moderate', aiResult?.priority || 'Medium')));
        formData.append('ai_reasoning', aiResult?.reasoning || 'Standard civic complaint');
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            console.log('[Frontend] Submitting to backend for AI validation...');
            const response = await fetch('http://localhost:5000/api/complaints', { method: 'POST', body: formData });
            const result = await response.json();

            // REJECTED by AI Validation Layer
            if (result.status === 'rejected') {
                console.warn('[Validation] Complaint rejected. Risk score:', result.risk_score);
                setValidationError({
                    message: result.message || 'Complaint appears invalid or inconsistent.',
                    riskScore: result.risk_score || 0
                });
                setIsSubmitting(false);
                return; // Do NOT proceed to success step
            }

            // SUCCESS — complaint passed validation and was stored
            if (response.ok && result.status === 'success') {
                console.log('[Backend] Complaint validated & created:', result.complaint);
                const newComplaint = {
                    id: newId,
                    category,
                    description,
                    location: location || "Location not specified",
                    zone: zone || "Not specified",
                    priority: aiResult?.priority || "Medium",
                    status: "Reported",
                    votes: 0,
                    is_emergency: isEmergency || aiResult?.escalation_required || false,
                    ai_reasoning: aiResult?.reasoning || "Standard civic complaint",
                    ai_keywords: description.split(" ").slice(0, 3),
                    ai_confidence: aiResult?.confidence || 85,
                    created_at: new Date().toISOString(),
                    device_id: getDeviceId(),
                    assigned_dept: aiResult?.authority || selectedCat?.dept || "General",
                    assigned_unit: zone || "Auto-assigned",
                    response_time: null,
                    duplicate_of: null,
                    image_url: result.image_url || null,
                    damage_level: aiResult?.damage_level || "moderate",
                    risk_type: aiResult?.risk_type || "General civic concern",
                    authority: aiResult?.authority || selectedCat?.dept || "Municipal Corporation",
                    escalation_required: aiResult?.escalation_required || false,
                    estimated_resolution_time: aiResult?.estimated_resolution_time || "Within 48 hours",
                    ai_score: aiResult?.ai_score || calculateAiScore(aiResult?.damage_level || 'moderate', aiResult?.priority || 'Medium'),
                };
                onSubmit(newComplaint);
                addPoints(10);
                setSubmittedId(newId);
                setStep(4);
                insertActivityLog('SYSTEM', `Complaint submitted: ${newId}`, newId, 'info');
            } else {
                // Other server error
                setValidationError({
                    message: result.message || 'Server error during submission.',
                    riskScore: 0
                });
            }
        } catch (err) {
            console.error('[Frontend] Backend unreachable, saving directly to Supabase:', err.message);

            // Upload image directly to Supabase Storage
            let directImageUrl = null;
            if (imageFile) {
                try {
                    const uploadResult = await uploadComplaintImage(imageFile, newId);
                    if (uploadResult.success) {
                        directImageUrl = uploadResult.url;
                        console.log('[Frontend] Image uploaded to Supabase Storage:', directImageUrl);
                    } else {
                        console.warn('[Frontend] Image upload failed:', uploadResult.error);
                    }
                } catch (uploadErr) {
                    console.warn('[Frontend] Image upload error:', uploadErr);
                }
            }

            // Build complaint object
            const newComplaint = {
                id: newId,
                category,
                description,
                location: location || "Location not specified",
                zone: zone || "Not specified",
                priority: aiResult?.priority || "Medium",
                status: "Reported",
                votes: 0,
                is_emergency: isEmergency || aiResult?.escalation_required || false,
                ai_reasoning: aiResult?.reasoning || "Standard civic complaint",
                ai_keywords: description.split(" ").slice(0, 3),
                ai_confidence: aiResult?.confidence || 85,
                created_at: new Date().toISOString(),
                device_id: getDeviceId(),
                assigned_dept: aiResult?.authority || selectedCat?.dept || "General",
                assigned_unit: zone || "Auto-assigned",
                image_url: directImageUrl,
                damage_level: aiResult?.damage_level || "moderate",
                risk_type: aiResult?.risk_type || "General civic concern",
                authority: aiResult?.authority || selectedCat?.dept || "Municipal Corporation",
                escalation_required: aiResult?.escalation_required || false,
                estimated_resolution_time: aiResult?.estimated_resolution_time || "Within 48 hours",
                ai_score: aiResult?.ai_score || calculateAiScore(aiResult?.damage_level || 'moderate', aiResult?.priority || 'Medium'),
            };

            // Save directly to Supabase DB
            const dbResult = await insertComplaint(newComplaint);
            if (dbResult.success) {
                console.log('[Frontend] Complaint saved to Supabase directly:', newId);
            } else {
                console.error('[Frontend] Direct Supabase insert failed:', dbResult.error);
            }

            onSubmit(newComplaint);
            addPoints(10);
            setSubmittedId(newId);
            setStep(4);
            insertActivityLog('SYSTEM', `Complaint submitted: ${newId}`, newId, 'info');
        } finally {
            setIsSubmitting(false);
        }
    }, [category, description, location, zone, isEmergency, aiResult, selectedCat, onSubmit, imageFile]);

    const resetForm = useCallback(() => {
        setStep(1);
        setCategory(null);
        setDescription("");
        setLocation("");
        setZone("");
        setIsEmergency(false);
        setImageFile(null);
        setImagePreview(null);
        setAiResult(null);
        setSubmittedId(null);
        setVoiceAiResult(null);
        setValidationError(null);
    }, []);

    const pts = getPoints();
    const lvl = getLevel(pts);

    return (
        <div className="page-content">
            <div className="post-complaint-wrapper">
                <div className="page-breadcrumb">
                    <span>{t.citizenPortal}</span>
                    <span className="breadcrumb-sep">›</span>
                    <span className="breadcrumb-active">{t.submitComplaintBreadcrumb}</span>
                </div>
                <h1 className="page-title">{t.submitComplaint}</h1>
                <p className="page-subtitle">{t.submitSubtitle}</p>

                {/* Progress Steps */}
                <div className="post-progress">
                    {[t.chooseCategory, t.fillDetails, t.aiReview, t.success].map((label, i) => (
                        <div key={i} className={`post-progress-step ${step > i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
                            <div className="post-progress-dot">
                                {step > i + 1 ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : (
                                    <span>{i + 1}</span>
                                )}
                            </div>
                            <span className="post-progress-label">{label}</span>
                            {i < 3 && <div className={`post-progress-line ${step > i + 1 ? 'done' : ''}`} />}
                        </div>
                    ))}
                </div>

                {/* Gamification Banner */}
                <div className="post-gamification">
                    <div className="post-gami-left">
                        <span className="post-gami-icon">{lvl.icon}</span>
                        <div>
                            <div className="post-gami-level">{lvl.name}</div>
                            <div className="post-gami-points">{pts} {t.points} · {t.plusForPosting}</div>
                        </div>
                    </div>
                    <div className="post-gami-bar-wrap">
                        <div className="post-gami-bar" style={{ width: `${Math.min((pts / (lvl.max === Infinity ? 500 : lvl.max)) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* ─── Step 1: Category Selection ─── */}
                {step === 1 && (
                    <div className="post-step-content" key="step1">
                        <h2 className="post-step-title">{t.chooseCategoryTitle}</h2>
                        <p className="post-step-desc">{t.chooseCategoryDesc}</p>
                        <div className="post-category-grid">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`post-category-card ${category === cat.id ? 'selected' : ''}`}
                                    onClick={() => setCategory(cat.id)}
                                    style={{ '--cat-color': cat.color }}
                                >
                                    <div className="post-cat-icon">{cat.icon}</div>
                                    <div className="post-cat-label">{CATEGORY_LABEL_KEYS[cat.id] ? t[CATEGORY_LABEL_KEYS[cat.id].label] : cat.label}</div>
                                    <div className="post-cat-dept">{CATEGORY_LABEL_KEYS[cat.id] ? t[CATEGORY_LABEL_KEYS[cat.id].dept] : cat.dept}</div>
                                    {category === cat.id && (
                                        <div className="post-cat-check">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="post-actions">
                            <button className="btn-primary post-next-btn" disabled={!category} onClick={() => setStep(2)}>
                                {t.nextStep}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Details ─── */}
                {step === 2 && (
                    <div className="post-step-content" key="step2">
                        <h2 className="post-step-title">{t.complaintDetailsTitle}</h2>
                        <p className="post-step-desc" dangerouslySetInnerHTML={{ __html: t.complaintDetailsDesc }} />

                        {/* Selected Category Badge */}
                        <div className="post-selected-cat">
                            <span className="post-selected-cat-icon" style={{ background: selectedCat?.color + '18', color: selectedCat?.color }}>{selectedCat?.icon}</span>
                            <span className="post-selected-cat-name">{CATEGORY_LABEL_KEYS[category] ? t[CATEGORY_LABEL_KEYS[category].label] : selectedCat?.label}</span>
                            <button className="post-change-btn" onClick={() => setStep(1)}>{t.change}</button>
                        </div>

                        <div className="post-form">
                            <h3 className="post-section-title">{t.problemSection}</h3>

                            {/* ──── Voice Recording Section ──── */}
                            <div className="voice-record-section">
                                <div className="voice-record-header">
                                    <span className="voice-record-label">{t.voiceComplaint}</span>
                                    <span className="voice-record-hint">{language === 'hi' ? t.hindiMode : t.speakHint}</span>
                                </div>
                                <div className="voice-record-controls">
                                    {!isRecording && !isTranscribing && (
                                        <button className="voice-record-btn" onClick={startRecording}>
                                            <div className="voice-record-btn-inner">
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                    <line x1="12" y1="19" x2="12" y2="23" />
                                                    <line x1="8" y1="23" x2="16" y2="23" />
                                                </svg>
                                            </div>
                                            <span>{t.tapToRecord}</span>
                                        </button>
                                    )}
                                    {isRecording && (
                                        <button className="voice-record-btn recording" onClick={stopRecording}>
                                            <div className="voice-record-btn-inner recording">
                                                <div className="voice-pulse-ring" />
                                                <div className="voice-pulse-ring delay" />
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                                </svg>
                                            </div>
                                            <span className="voice-recording-label">
                                                <span className="voice-rec-dot" /> {t.recording} {recordingTime}s
                                            </span>
                                        </button>
                                    )}
                                    {isTranscribing && (
                                        <div className="voice-transcribing">
                                            <div className="voice-transcribing-spinner" />
                                            <div className="voice-transcribing-text">
                                                <span className="voice-transcribing-title">{t.aiProcessing}</span>
                                                <span className="voice-transcribing-sub">{t.transcribingAudio}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Voice AI Result Card */}
                                {voiceAiResult && !isTranscribing && (
                                    <div className="voice-ai-result">
                                        <div className="voice-ai-result-header">
                                            <span className="voice-ai-result-badge">{t.aiAnalysisComplete}</span>
                                            <span className="voice-ai-confidence">{voiceAiResult.confidence}% {t.confident}</span>
                                        </div>

                                        {/* Escalation warning */}
                                        {voiceAiResult.escalation_required && (
                                            <div className="ci-escalation-banner" style={{ marginTop: '10px' }}>
                                                <span className="ci-escalation-icon">⚠️</span>
                                                <div className="ci-escalation-text">
                                                    <strong>{t.escalationRequired}</strong>
                                                    <span>{voiceAiResult.risk_type}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="voice-ai-result-grid">
                                            <div className="voice-ai-item">
                                                <span className="voice-ai-item-label">{t.detectedCategory}</span>
                                                <span className="voice-ai-item-value">
                                                    {CATEGORIES.find(c => c.id === voiceAiResult.detectedCategory)?.icon}{' '}
                                                    {CATEGORIES.find(c => c.id === voiceAiResult.detectedCategory)?.label || voiceAiResult.detectedCategory}
                                                </span>
                                            </div>
                                            <div className="voice-ai-item">
                                                <span className="voice-ai-item-label">{t.priority}</span>
                                                <span className="voice-ai-item-value" style={{ color: PRIORITY_COLORS[voiceAiResult.priority] || '#3B82F6' }}>
                                                    {voiceAiResult.priority}
                                                </span>
                                            </div>
                                            <div className="voice-ai-item">
                                                <span className="voice-ai-item-label">{t.damageLevel}</span>
                                                <span className="voice-ai-item-value" style={{ color: DAMAGE_COLORS[voiceAiResult.damage_level] || '#FFE66D' }}>
                                                    {voiceAiResult.damage_level?.charAt(0).toUpperCase() + voiceAiResult.damage_level?.slice(1)}
                                                </span>
                                            </div>
                                            <div className="voice-ai-item">
                                                <span className="voice-ai-item-label">{t.authorityLabel}</span>
                                                <span className="voice-ai-item-value" style={{ color: '#3B82F6' }}>
                                                    {voiceAiResult.authority}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="voice-ai-reasoning">
                                            <span className="voice-ai-reasoning-icon">🤖</span>
                                            <span>{voiceAiResult.reasoning}</span>
                                        </div>
                                        {/* CI footer badges */}
                                        <div className="ci-queue-badges" style={{ marginTop: '10px' }}>
                                            {voiceAiResult.estimated_resolution_time && (
                                                <span className="ci-badge-eta">⏱ {voiceAiResult.estimated_resolution_time}</span>
                                            )}
                                            <span className="ci-badge-score" style={{ color: (voiceAiResult.ai_score || 0) >= 100 ? '#FF4757' : (voiceAiResult.ai_score || 0) >= 70 ? '#FF6B35' : '#4ECDC4' }}>
                                                Score: {voiceAiResult.ai_score || 0}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="post-field">
                                <label className="post-field-label">{t.complaintDescription} <span className="post-required">*</span></label>
                                <textarea
                                    className={`post-textarea ${voiceAiResult ? 'voice-filled' : ''}`}
                                    placeholder={t.descriptionPlaceholder}
                                    rows={4}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    maxLength={500}
                                />
                                <div className="post-field-hint">
                                    <span>{description.length}/500 {t.characters}</span>
                                    {voiceAiResult && <span className="post-hint-voice">{t.voiceTranscribed}</span>}
                                    {description.length >= 20 && <span className="post-hint-ok">{t.goodDescription}</span>}
                                </div>
                            </div>

                            {/* Location */}
                            {/* Location Display */}
                            <div className="post-field" style={{ marginBottom: '20px' }}>
                                <label className="post-field-label">📍 {t.locationLandmark} <span className="post-required">*</span></label>
                                <div style={{ marginBottom: '12px' }}>
                                    <LocationPickerMap
                                        initialAddress={location}
                                        onLocationChange={({ address, zone: newZone }) => {
                                            setLocation(address);
                                            if (newZone) setZone(newZone);
                                        }}
                                    />
                                    <div className="post-field-hint" style={{ marginTop: '8px' }}>
                                        Drag the marker, click the map, or use the GPS button to set your exact location.
                                    </div>
                                </div>
                            </div>

                            <div className="post-form-row">
                                <div className="post-field">
                                    <label className="post-field-label">Address Details</label>
                                    <div className="post-input-icon">
                                        <span className="post-input-icon-left">📍</span>
                                        <input
                                            type="text"
                                            className="post-input"
                                            placeholder={t.locationPlaceholder}
                                            value={location}
                                            onChange={e => setLocation(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="post-field">
                                    <label className="post-field-label">{t.wardZone}</label>
                                    <div className="post-input-icon">
                                        <span className="post-input-icon-left">🏛️</span>
                                        <input
                                            type="text"
                                            className="post-input"
                                            placeholder={t.wardPlaceholder}
                                            value={zone}
                                            onChange={e => setZone(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div className="post-field">
                                <label className="post-field-label">{t.photoImage}</label>

                                {/* Live Camera Viewfinder */}
                                {cameraOpen && (
                                    <div className="camera-viewfinder">
                                        <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
                                        <div className="camera-controls">
                                            <button type="button" className="camera-cancel-btn" onClick={closeCamera}>
                                                Cancel
                                            </button>
                                            <button type="button" className="camera-capture-btn" onClick={capturePhoto}>
                                                <span className="camera-capture-ring" />
                                                <span className="camera-capture-label">Capture</span>
                                            </button>
                                            <div style={{ width: '80px' }} />
                                        </div>
                                    </div>
                                )}

                                {!cameraOpen && imagePreview ? (
                                    <div className="post-upload-preview-container">
                                        <div className="post-upload-preview">
                                            <img src={imagePreview} alt="Preview" className="post-upload-img" />
                                            <button className="post-upload-remove" onClick={(e) => { e.stopPropagation(); removeImage(); }}>✕</button>
                                        </div>
                                    </div>
                                ) : !cameraOpen && (
                                    <div className="post-upload-options">
                                        <button type="button" className="post-upload-button camera" onClick={openCamera}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                            <span>{t.takePhoto}</span>
                                        </button>
                                        <button type="button" className="post-upload-button gallery" onClick={() => fileInputRef.current?.click()}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            <span>{t.gallery}</span>
                                        </button>
                                    </div>
                                )}

                                {/* Hidden Inputs */}
                                <canvas ref={canvasRef} style={{ display: 'none' }} />
                                <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* Emergency Toggle */}
                            <div className="post-emergency-toggle">
                                <div className="post-emergency-info">
                                    <span className="post-emergency-icon">🚨</span>
                                    <div>
                                        <div className="post-emergency-label">{t.emergencyUrgent}</div>
                                        <div className="post-emergency-desc">{t.emergencyDesc}</div>
                                    </div>
                                </div>
                                <button
                                    className={`post-toggle ${isEmergency ? 'active' : ''}`}
                                    onClick={() => setIsEmergency(!isEmergency)}
                                >
                                    <div className="post-toggle-knob" />
                                </button>
                            </div>
                        </div>

                        <div className="post-actions">
                            <button className="post-back-btn" onClick={() => setStep(1)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                {t.goBack}
                            </button>
                            <button className="btn-primary post-next-btn" disabled={!description.trim() || description.length < 10 || !location.trim()} onClick={goToReview}>
                                {t.reviewWithAI}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Step 3: AI Review ─── */}
                {step === 3 && (
                    <div className="post-step-content" key="step3">
                        <h2 className="post-step-title">{t.aiAnalysisTitle}</h2>
                        <p className="post-step-desc">{t.aiAnalysisDesc}</p>

                        {isAnalyzing ? (
                            <div className="post-analyzing">
                                <div className="post-analyzing-spinner">
                                    <div className="post-spinner" />
                                </div>
                                <div className="post-analyzing-text">{t.analysisInProgress}</div>
                                <div className="post-analyzing-sub">{t.categorizingChecking}</div>
                            </div>
                        ) : aiResult && (
                            <div className="post-review-content">
                                {/* Summary Card */}
                                <div className="post-review-card">
                                    <div className="post-review-header">
                                        <div className="post-review-cat">
                                            <span style={{ fontSize: '1.4rem' }}>{selectedCat?.icon}</span>
                                            <div>
                                                <div className="post-review-cat-name">{selectedCat?.label}</div>
                                                <div className="post-review-cat-dept">→ {selectedCat?.dept}</div>
                                            </div>
                                        </div>
                                        <Badge label={aiResult.priority} color={PRIORITY_COLORS[aiResult.priority]} />
                                    </div>
                                    <div className="post-review-desc">"{description}"</div>
                                    <div className="post-review-meta">
                                        <span>📍 {location}</span>
                                        {zone && <><span>·</span><span>🏛️ {zone}</span></>}
                                        {isEmergency && <span className="emergency-tag">🚨 EMERGENCY</span>}
                                    </div>
                                </div>

                                {/* AI Insights — Civic Intelligence Engine */}
                                <div className="post-ai-insights">
                                    <h3 className="post-ai-title">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B2FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" /><path d="M12 6v6l4 2" /></svg>
                                        {t.aiDetermination}
                                    </h3>

                                    {/* Escalation Banner */}
                                    {aiResult.escalation_required && (
                                        <div className="ci-escalation-banner">
                                            <span className="ci-escalation-icon">⚠️</span>
                                            <div className="ci-escalation-text">
                                                <strong>{t.escalationRequired || 'ESCALATION REQUIRED'}</strong>
                                                <span>{aiResult.risk_type}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="post-ai-grid ci-grid-expanded">
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.priority}</div>
                                            <div className="post-ai-item-value" style={{ color: PRIORITY_COLORS[aiResult.priority] }}>{aiResult.priority}</div>
                                        </div>
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.damageLevel || 'DAMAGE LEVEL'}</div>
                                            <div className="post-ai-item-value" style={{ color: DAMAGE_COLORS[aiResult.damage_level] || '#FFE66D' }}>
                                                {aiResult.damage_level?.charAt(0).toUpperCase() + aiResult.damage_level?.slice(1)}
                                            </div>
                                        </div>
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.confidenceLabel}</div>
                                            <div className="post-ai-item-value" style={{ color: '#4ECDC4' }}>{aiResult.confidence}%</div>
                                        </div>
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.department}</div>
                                            <div className="post-ai-item-value" style={{ color: '#3B82F6' }}>{aiResult.authority || selectedCat?.dept}</div>
                                        </div>
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.riskType || 'RISK TYPE'}</div>
                                            <div className="post-ai-item-value ci-risk-value">{aiResult.risk_type || 'N/A'}</div>
                                        </div>
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.estResolution || 'EST. RESOLUTION'}</div>
                                            <div className="post-ai-item-value" style={{ color: '#96CEB4' }}>{aiResult.estimated_resolution_time || 'N/A'}</div>
                                        </div>
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.aiScoreLabel || 'AI SCORE'}</div>
                                            <div className="post-ai-item-value" style={{ color: (aiResult.ai_score || 0) >= 100 ? '#FF4757' : (aiResult.ai_score || 0) >= 70 ? '#FF6B35' : '#4ECDC4' }}>
                                                {aiResult.ai_score || 0}
                                            </div>
                                        </div>
                                        <div className="post-ai-item">
                                            <div className="post-ai-item-label">{t.status}</div>
                                            <div className="post-ai-item-value" style={{ color: '#FFE66D' }}>{t.readyToSubmit}</div>
                                        </div>
                                    </div>
                                    <div className="post-ai-reasoning">
                                        <span className="post-ai-reasoning-icon">🤖</span>
                                        <span>{aiResult.reasoning}</span>
                                    </div>
                                </div>

                                {imagePreview && (
                                    <div className="post-review-image">
                                        <div className="post-review-image-label">{t.attachedPhoto}</div>
                                        <img src={imagePreview} alt="Attached" className="post-review-img" />
                                    </div>
                                )}
                            </div>
                        )}

                        {!isAnalyzing && aiResult && (
                            <div className="post-actions" style={{ flexDirection: 'column', gap: '12px' }}>
                                {/* Validation Rejection Banner */}
                                {validationError && (
                                    <div style={{
                                        width: '100%',
                                        padding: '14px 18px',
                                        background: 'linear-gradient(135deg, #fff0f0, #ffe8e8)',
                                        border: '1px solid #fca5a5',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                    }}>
                                        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🚫</span>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.9rem', marginBottom: '4px' }}>
                                                Complaint Rejected by AI Validation
                                            </div>
                                            <div style={{ fontSize: '0.82rem', color: '#7f1d1d' }}>
                                                {validationError.message}
                                            </div>
                                            {validationError.riskScore > 0 && (
                                                <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '6px', opacity: 0.8 }}>
                                                    Risk Score: {validationError.riskScore}/100
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    <button className="post-back-btn" onClick={() => { setStep(2); setValidationError(null); }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                        {t.makeChanges}
                                    </button>
                                    <button
                                        className="btn-primary post-submit-btn"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        style={{ opacity: isSubmitting ? 0.7 : 1, position: 'relative' }}
                                    >
                                        {isSubmitting ? (
                                            <><span className="post-analyzing-spinner" style={{ width: 16, height: 16, marginRight: 8 }} /> Validating...</>
                                        ) : (
                                            <>✅ {t.submitComplaintBtn}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Step 4: Success ─── */}
                {step === 4 && (
                    <div className="post-step-content post-success-step" key="step4">
                        <div className="post-success-card">
                            <div className="post-success-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ECDC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h2 className="post-success-title">{t.successTitle}</h2>
                            <p className="post-success-sub">{t.successSub}</p>

                            <div className="post-success-id">
                                <div className="post-success-id-label">{t.trackingId}</div>
                                <div className="post-success-id-value">{submittedId}</div>
                            </div>

                            <div className="post-success-details">
                                <div className="post-success-detail">
                                    <span>{t.category}</span>
                                    <span>{selectedCat?.icon} {CATEGORY_LABEL_KEYS[category] ? t[CATEGORY_LABEL_KEYS[category].label] : selectedCat?.label}</span>
                                </div>
                                <div className="post-success-detail">
                                    <span>{t.departmentLabel}</span>
                                    <span>{CATEGORY_LABEL_KEYS[category] ? t[CATEGORY_LABEL_KEYS[category].dept] : selectedCat?.dept}</span>
                                </div>
                                <div className="post-success-detail">
                                    <span>{t.priorityLabel}</span>
                                    <Badge label={aiResult?.priority || 'Medium'} color={PRIORITY_COLORS[aiResult?.priority || 'Medium']} small />
                                </div>
                                <div className="post-success-detail">
                                    <span>{t.statusLabel}</span>
                                    <Badge label={t.reported} color={STATUS_COLORS.Reported} small />
                                </div>
                            </div>

                            <div className="post-success-points">
                                <span className="post-success-points-icon">⭐</span>
                                <span>{t.earnedPoints} {getPoints()} {t.pointsSuffix}</span>
                            </div>

                            <div className="post-success-actions">
                                <button className="btn-primary" onClick={resetForm}>
                                    {t.submitAnother}
                                </button>
                                <button className="post-back-btn" onClick={() => setPage('queue')}>
                                    {t.viewQueue}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Citizen Layout (Sidebar + TopBar wrapper) ───────────────────────────────
function CitizenLayout({ complaints, setComplaints, handleVote, handleUpdate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState("");

    // Derive active page from URL path
    const page = location.pathname.replace('/', '') || 'dashboard';
    const setPage = (p) => navigate(p === 'dashboard' ? '/' : '/' + p);

    return (
        <div className="app-layout">
            <Sidebar page={page} setPage={setPage} />
            <div className="main-area">
                <TopBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                <main className="main-content">
                    {page === "dashboard" && <DashboardPro complaints={complaints} />}
                    {page === "routing" && <RoutingPage complaints={complaints} />}
                    {page === "workflows" && <WorkflowsPage />}
                    {page === "post" && <PostComplaintPage onSubmit={(c) => { setComplaints(prev => [c, ...prev]); }} setPage={setPage} />}
                    {page === "queue" && <QueuePage complaints={complaints} onVote={handleVote} onUpdate={handleUpdate} />}
                    {page === "logs" && <LogsPage complaints={complaints} />}
                    {page === "points" && <div className="page-content"><h1 className="page-title">Points & Leaderboard</h1><p className="page-subtitle">Device-based gamification system — earn points for civic participation.</p></div>}
                </main>
            </div>
            <ChatBot apiKey={GROQ_API_KEY} />
        </div>
    );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
    const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);

    function handleVote(id) {
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, votes: c.votes + 1 } : c));
        const complaint = complaints.find(c => c.id === id);
        if (complaint) {
            updateComplaintVotes(id, (complaint.votes || 0) + 1);
            insertActivityLog('VOTE', `Vote cast on ${id}`, id, 'info');
        }
    }

    function handleUpdate(id, updates) {
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        if (updates.status) {
            updateComplaintStatus(id, updates.status);
            insertActivityLog('STATUS', `${id} status changed to ${updates.status}`, id, 'info');
        }
    }

    return (
        <Routes>
            {/* ─── LAYER 2: Admin Routes (Clerk Protected) ─── */}
            <Route path="/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
            <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
            <Route path="/admin/queue" element={<AdminLayout><AdminQueuePage /></AdminLayout>} />
            <Route path="/admin/logs" element={<AdminLayout><AdminLogsPage /></AdminLayout>} />
            <Route path="/admin/routing-rules" element={<AdminLayout><AdminRoutingRulesPage /></AdminLayout>} />
            <Route path="/admin/support" element={<AdminLayout><AdminSupportPage /></AdminLayout>} />
            <Route path="/worker" element={<WorkerNotifications />} />

            {/* ─── LAYER 1: Public Citizen Routes (No Auth) ─── */}
            <Route path="/*" element={
                <CitizenLayout
                    complaints={complaints}
                    setComplaints={setComplaints}
                    handleVote={handleVote}
                    handleUpdate={handleUpdate}
                />
            } />
        </Routes>
    );
}
