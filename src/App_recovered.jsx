import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import ChatBot from "./ChatBot";
import { useLanguage } from "./LanguageContext.jsx";
import { translations, CATEGORY_LABEL_KEYS } from "./translations.js";
import { supabase, insertComplaint, checkSupabaseConnection, updateComplaintVotes, updateComplaintStatus, uploadComplaintImage, updateComplaintImageUrl, insertActivityLog, fetchActivityLogs } from "./lib/supabase.js";
import AdminLayout from "./components/AdminLayout.jsx";
import { AdminDashboardPage, AdminQueuePage, AdminLogsPage, AdminRoutingRulesPage } from "./components/AdminPages.jsx";
import { AdminSupportPage } from "./components/AdminSupportPage.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import PublicLayout from "./components/PublicLayout.jsx";
import { HeroSection } from "./components/HeroSection.jsx";

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ API Key Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
// Paste your Groq API key here
const GROQ_API_KEY = "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";

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Constants Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
const CATEGORIES = [
  { id: "roads", label: "Roads & Potholes", icon: "\uD83D\uDEE3\uFE0F", color: "#EA580C", dept: "Public Works Department (PWD)" },
  { id: "sanitation", label: "Sanitation", icon: "\uD83D\uDDD1\uFE0F", color: "#0D9488", dept: "Municipal Sanitation Department" },
  { id: "electricity", label: "Electricity", icon: "\u26A1", color: "#D97706", dept: "State Electricity Board" },
  { id: "water", label: "Water Supply", icon: "\uD83D\uDCA7", color: "#2563EB", dept: "Water Board (Jal Board)" },
  { id: "drainage", label: "Drainage", icon: "\uD83D\uDEBF", color: "#059669", dept: "Municipal Drainage Cell" },
  { id: "safety", label: "Safety & Traffic", icon: "\uD83D\uDEA8", color: "#DC2626", dept: "Traffic Police" },
];

const PRIORITY_COLORS = { Critical: "#DC2626", High: "#EA580C", Medium: "#2563EB", Low: "#059669" };
const DAMAGE_COLORS = { severe: "#DC2626", major: "#EA580C", moderate: "#D97706", minor: "#059669" };
const STATUS_COLORS = { Reported: "#6366F1", "In Progress": "#D97706", Resolved: "#16A34A", Assigned: "#2563EB" };
const SEVERITY_WEIGHT = { minor: 1, moderate: 2, major: 3, severe: 4 };
const PRIORITY_WEIGHT = { Low: 1, Medium: 2, High: 3, Critical: 4 };

const LEVELS = [
  { min: 0, max: 50, name: "Area Watcher", icon: "\uD83D\uDC41\uFE0F" },
  { min: 51, max: 150, name: "Civic Supporter", icon: "\uD83E\uDD1D" },
  { min: 151, max: 300, name: "Civic Warrior", icon: "\u2694\uFE0F" },
  { min: 301, max: Infinity, name: "City Guardian", icon: "\uD83C\uDFDB\uFE0F" },
];

const MOCK_COMPLAINTS = [
  {
    id: "CL-2026-00001", category: "roads",
    description: "Huge pothole on MG Road â vehicle tyre burst, very dangerous",
    location: "MG Road, Ward 12, Nagpur", zone: "Ward 12 â Sitabuldi",
    priority: "Critical", status: "In Progress", votes: 47,
    is_emergency: true, ai_reasoning: "Large hole on main road â danger to vehicles and pedestrians",
    ai_keywords: ["Pothole", "Dangerous", "Tyre"], ai_confidence: 96,
    created_at: "2026-02-26T08:30:00", device_id: "dev_001",
    assigned_dept: "PWD", assigned_unit: "Zone 4 â Dharampeth",
    response_time: 14.2, duplicate_of: null,
  },
  {
    id: "CL-2026-00002", category: "water",
    description: "No water supply for 3 days â entire colony facing issues",
    location: "Laxmi Nagar, Ward 23, Delhi", zone: "Ward 23 â Laxmi Nagar",
    priority: "High", status: "Reported", votes: 31,
    is_emergency: false, ai_reasoning: "Water supply cut for 3 days â affecting multiple households",
    ai_keywords: ["Water", "Supply", "Colony"], ai_confidence: 91,
    created_at: "2026-02-26T09:15:00", device_id: "dev_002",
    assigned_dept: "Water Board", assigned_unit: "Zone 2 â East Delhi",
    response_time: null, duplicate_of: null,
  },
  {
    id: "CL-2026-00003", category: "electricity",
    description: "Street lights out for 2 weeks â pitched dark at night",
    location: "Civil Lines, Ward 8, Nagpur", zone: "Ward 8 â Civil Lines",
    priority: "Medium", status: "Assigned", votes: 18,
    is_emergency: false, ai_reasoning: "Night safety concern but no immediate life threat",
    ai_keywords: ["Lights", "Weeks", "Darkness"], ai_confidence: 87,
    created_at: "2026-02-25T14:00:00", device_id: "dev_003",
    assigned_dept: "Electricity Board", assigned_unit: "Zone 1 â Civil Lines",
    response_time: 22.5, duplicate_of: null,
  },
  {
    id: "CL-2026-00004", category: "sanitation",
    description: "Garbage not collected for 5 days â foul smell and health hazard",
    location: "Dharampeth Colony, Ward 15, Nagpur", zone: "Ward 15 â Dharampeth",
    priority: "High", status: "Resolved", votes: 22,
    is_emergency: false, ai_reasoning: "Unsanitary conditions â risk of disease outbreak",
    ai_keywords: ["Garbage", "Smell", "Health"], ai_confidence: 93,
    created_at: "2026-02-24T11:00:00", device_id: "dev_004",
    assigned_dept: "Sanitation Dept", assigned_unit: "Zone 3 â Dharampeth",
    response_time: 8.7, duplicate_of: null,
  },
  {
    id: "CL-2026-00005", category: "roads",
    description: "Massive pothole near Sadar chowk â bikers falling down",
    location: "Sadar Bazaar, Ward 12, Nagpur", zone: "Ward 12 â Sitabuldi",
    priority: "Critical", status: "Reported", votes: 35,
    is_emergency: true, ai_reasoning: "Similar to existing report CL-2026-00001. AI detected duplicate.",
    ai_keywords: ["Pothole", "Biker", "Chowk"], ai_confidence: 94,
    created_at: "2026-02-26T10:30:00", device_id: "dev_005",
    assigned_dept: "PWD", assigned_unit: "Zone 4 â Dharampeth",
    response_time: null, duplicate_of: "CL-2026-00001",
  },
  {
    id: "CL-2026-00006", category: "drainage",
    description: "Drain overflowing after rain â dirty water on school road",
    location: "Sarojini Nagar, Ward 42, Lucknow", zone: "Ward 42 â Sarojini Nagar",
    priority: "High", status: "Assigned", votes: 28,
    is_emergency: false, ai_reasoning: "Drainage overflow â hazard to public health and hygiene",
    ai_keywords: ["Drain", "Overflow", "Stagnant"], ai_confidence: 89,
    created_at: "2026-02-23T16:00:00", device_id: "dev_006",
    assigned_dept: "Drainage Cell", assigned_unit: "Zone 5 â Sarojini Nagar",
    response_time: 18.3, duplicate_of: null,
  },
  {
    id: "CL-2026-00007", category: "safety",
    description: "No traffic signal in school zone â child safety at risk",
    location: "Pratap Nagar, Ward 31, Jaipur", zone: "Ward 31 â Pratap Nagar",
    priority: "High", status: "Reported", votes: 41,
    is_emergency: false, ai_reasoning: "Missing traffic signal in school zone â child safety concern",
    ai_keywords: ["School", "Signal", "Safety"], ai_confidence: 92,
    created_at: "2026-02-25T07:45:00", device_id: "dev_007",
    assigned_dept: "Traffic Police", assigned_unit: "Zone 3 â Pratap Nagar",
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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Helpers Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
4. Assign priority: severeâCritical, majorâHigh, moderateâMedium, minorâLow
5. Suggest the responsible government authority
6. Decide if escalation is required

Authority Mapping:
- roads â Public Works Department (PWD)
- sanitation â Municipal Sanitation Department
- electricity â State Electricity Board
- water â Water Board (Jal Board)
- drainage â Municipal Drainage Cell
- safety â Traffic Police or Local Police

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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Reusable Components Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬

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

function MiniBarChart({ data, color = "#2563EB", height = 60 }) {
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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Sidebar Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function Sidebar({ page, setPage, navigateTo }) {
  const { language } = useLanguage();
  const t = translations[language];
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

      <div className="sidebar-footer-links">
        <button className="sidebar-nav-item sidebar-admin-link" onClick={() => navigateTo('/admin')}>
          <span className="sidebar-nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
          <span className="sidebar-nav-label">Admin Panel</span>
        </button>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">Ã°Å¸âÂ¤</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{t.citizen || 'Citizen'}</div>
          <div className="sidebar-user-role">{t.nagarNigamAdmin}</div>
        </div>
      </div>
    </aside>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Top Bar Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function TopBar({ searchQuery, setSearchQuery, page, setPage, navigateTo }) {
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { id: "dashboard", labelKey: "dashboard", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
    { id: "routing", labelKey: "routingRules", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
    { id: "workflows", labelKey: "workflows", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> },
    { id: "post", labelKey: "postComplaint", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg> },
    { id: "queue", labelKey: "queue", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
    { id: "logs", labelKey: "logs", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
  ];

  return (
    <>
      <header className="topbar">
        {/* Hamburger â mobile only */}
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>

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
            <span>{language === 'en' ? 'EN' : 'Ã Â¤Â¹Ã Â¤Â¿Ã Â¤âÃ Â¤Â¦Ã Â¥â¬'}</span>
          </button>

          <NotificationBell />

          <button className="topbar-btn topbar-btn-settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="sidebar-brand" onClick={() => { setPage("dashboard"); setDrawerOpen(false); }}>
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            </div>
            <span className="brand-text">Civic<span className="brand-accent">Lens</span></span>
          </div>
          <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <nav className="drawer-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`drawer-nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setDrawerOpen(false); }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{t[item.labelKey]}</span>
            </button>
          ))}
          <button
            className="drawer-nav-item sidebar-admin-link"
            onClick={() => { navigateTo('/admin'); setDrawerOpen(false); }}
          >
            <span className="sidebar-nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
            <span>Admin Panel</span>
          </button>
        </nav>

        <div className="drawer-footer">
// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Dashboard Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
        <span className="breadcrumb-active">{t.dashboardBreadcrumb}</span>
      </div>
      <h1 className="page-title">{t.overviewAnalytics}</h1>
      <p className="page-subtitle">{t.dashboardSubtitle}</p>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard label={t.totalComplaints} value={stats.total} sub={t.fromLastWeek} color="#3B82F6" icon="Ã°Å¸âÅ " />
        <StatCard label={t.activeIssues} value={stats.active} sub={`${stats.emergency} ${t.emergency}`} color="#FF6B35" icon="Ã°Å¸âÂ¥" />
        <StatCard label={t.resolved} value={stats.resolved} sub={t.avgInHours} color="#4ECDC4" icon="Ã¢Åâ¦" />
        <StatCard label={t.aiAccuracy} value="94.2%" sub={t.fromLastMonth} color="#7B2FFF" icon="Ã°Å¸Â§Â " />
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
                      <span>ÃÂ·</span>
                      <span>{c.location}</span>
                      <span>ÃÂ·</span>
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
                  <div className="dept-item-stats">{d.resolved} {t.resolvedLabel} ÃÂ· {d.pending} {t.pendingLabel}</div>
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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Routing Rules Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function RoutingPage({ complaints }) {
  const featured = complaints.find(c => c.duplicate_of) || complaints[0];
  const original = complaints.find(c => c.id === featured?.duplicate_of);
  const cat = CATEGORIES.find(x => x.id === featured?.category);
  const deptStat = DEPT_STATS.find(d => d.dept === featured?.assigned_dept);

  return (
    <div className="page-content">
      <div className="page-breadcrumb">
        <span>ADMIN PANEL</span>
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
        <span className="breadcrumb-active">ROUTING WORKFLOW</span>
      </div>
      <h1 className="page-title">Smart Routing & Dept Workflow</h1>
      <p className="page-subtitle">AI-driven complaint categorization and automatic department assignment Ã¢â¬â ensuring every citizen's voice reaches the correct department instantly.</p>

      {/* AI Notification + Routing Efficiency */}
      <div className="routing-top-grid">
        <div className="card ai-notification-card">
          <div className="ai-notif-header">
            <span className="ai-notif-icon">Ã¢ÅÂ¨</span>
            <span className="ai-notif-title">AI Notification: Duplicate Detected</span>
          </div>
          <p className="ai-notif-desc">
            <strong>Large Pothole</strong> complaint from Sadar Bazaar (ID #{featured?.id}) Ã¢â¬â matches a report received 2 hours ago (ID #{original?.id || "CL-2026-00001"}). AI recommends merging both.
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
            <div className="map-pin">Ã°Å¸âÂ</div>
            <div className="map-radius"></div>
          </div>
        </div>

        <div className="card efficiency-card">
          <div className="efficiency-label">Routing Efficiency</div>
          <div className="efficiency-value">{deptStat?.efficiency || 98.4}%</div>
          <div className="efficiency-bar">
            <div className="efficiency-fill" style={{ width: `${deptStat?.efficiency || 98.4}%` }} />
          </div>
          <div className="efficiency-sub">Ã°Å¸âË +2.1% from last month</div>
        </div>
      </div>

      {/* Visual Routing Pathway */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span style={{ fontSize: "16px" }}>Ã¢ÅÂ¨</span>
            Visual Routing Pathway
          </h3>
          <span className="card-badge live">Ã¢âÂ LIVE FLOW</span>
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
            <div className="pathway-sub">{featured?.assigned_dept} ÃÂ· {featured?.assigned_unit}</div>
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
              <div className="logic-rule-icon">Ã°Å¸âÂ</div>
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
              <div className="logic-rule-icon">Ã°Å¸ââ</div>
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
              <div className="response-time-icon">Ã¢ÂÂ±Ã¯Â¸Â</div>
            </div>
            <MiniBarChart data={[12, 18, 14, 16, 22, 14, 11]} color="#3B82F6" height={80} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Workflows Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Queue Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
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
                    {c.is_emergency && <span className="emergency-tag">Ã°Å¸Å¡Â¨ EMERGENCY</span>}
                    {c.duplicate_of && <span className="duplicate-tag">Ã°Å¸ââ DUPLICATE</span>}
                  </div>
                  <div className="queue-item-title">{c.description}</div>
                  <div className="queue-item-meta">
                    Ã°Å¸âÂ {c.location} ÃÂ· {formatTime(c.created_at)} ÃÂ· {c.assigned_dept}
                  </div>
                  <div className="queue-item-ai">
                    Ã°Å¸Â¤â {c.ai_reasoning} <span className="ai-conf">({c.ai_confidence}% {t.confidence})</span>
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
                        <span className="ci-badge-escalation">Ã¢Å¡Â Ã¯Â¸Â {t.escalationRequired || 'ESCALATION'}</span>
                      )}
                      {c.estimated_resolution_time && (
                        <span className="ci-badge-eta">Ã¢ÂÂ± {c.estimated_resolution_time}</span>
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
                    Ã¢âÂ² {c.votes}
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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Logs Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function LogsPage({ complaints }) {
  const { language } = useLanguage();
  const t = translations[language];
  const logs = [
    { time: "10:32:15", type: "AI", message: `Duplicate detected: ${complaints[4]?.id} matches ${complaints[0]?.id}`, level: "warn" },
    { time: "10:30:22", type: "SYSTEM", message: `New complaint: ${complaints[4]?.id} Ã¢â¬â Large pothole near Sadar chowk`, level: "info" },
    { time: "10:28:05", type: "ROUTE", message: `${complaints[2]?.id} auto-assigned Ã¢â â Electricity Board ÃÂ· Zone 1`, level: "success" },
    { time: "09:45:30", type: "AI", message: `Escalated: ${complaints[1]?.id} now HIGH priority`, level: "warn" },
    { time: "09:15:10", type: "SYSTEM", message: `New complaint: ${complaints[1]?.id} Ã¢â¬â No water for 3 days, Laxmi Nagar`, level: "info" },
    { time: "08:55:00", type: "SLA", message: `SLA Warning: ${complaints[2]?.id} nearing the 24-hour limit`, level: "error" },
    { time: "08:30:45", type: "ROUTE", message: `${complaints[0]?.id} routed Ã¢â â PWD ÃÂ· Zone 4 Dharampeth`, level: "success" },
    { time: "08:30:02", type: "AI", message: `Analysis complete: ${complaints[0]?.id} placed in CRITICAL category`, level: "error" },
    { time: "08:30:00", type: "SYSTEM", message: `New complaint: ${complaints[0]?.id} Ã¢â¬â Large pothole MG Road, Nagpur`, level: "info" },
    { time: "08:15:00", type: "SYSTEM", message: "Daily report ready Ã¢â¬â queued to be sent to the Municipal Commissioner", level: "info" },
    { time: "07:00:00", type: "SYSTEM", message: "System health check: All services operational Ã¢Åâ", level: "success" },
  ];

  const levelColors = { info: "#3B82F6", warn: "#FFE66D", error: "#FF4757", success: "#4ECDC4" };

  return (
    <div className="page-content">
      <div className="page-breadcrumb">
        <span>{t.adminPanel}</span>
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
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
          <span className="card-badge live">Ã¢âÂ {t.live}</span>
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


          <div className="sidebar-user-avatar">Ã°Å¸âÂ¤</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{t.citizen || 'Citizen'}</div>
            <div className="sidebar-user-role">{t.nagarNigamAdmin}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Bottom Nav (Mobile) Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function BottomNav({ page, setPage }) {
  const { language } = useLanguage();
  const t = translations[language];
  const items = [
    { id: "dashboard", labelKey: "dashboard", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
    { id: "post", labelKey: "postComplaint", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg> },
    { id: "queue", labelKey: "queue", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
    { id: "logs", labelKey: "logs", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item ${page === item.id ? 'active' : ''}`}
          onClick={() => setPage(item.id)}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{t[item.labelKey]}</span>
        </button>
      ))}
    </nav>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Dashboard Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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

  // Prepare Daily Data (Mock mapping)
  const weeklyData = [
    { name: t.mon || 'Mon', reports: 65, solved: 40 },
    { name: t.tue || 'Tue', reports: 72, solved: 45 },
    { name: t.wed || 'Wed', reports: 58, solved: 30 },
    { name: t.thu || 'Thu', reports: 81, solved: 60 },
    { name: t.fri || 'Fri', reports: 91, solved: 55 },
    { name: t.sat || 'Sat', reports: 78, solved: 70 },
    { name: t.sun || 'Sun', reports: 85, solved: 65 },
  ];

  // Prepare Category Pie Data
  const pieData = CATEGORIES.map(cat => ({
    name: cat.label,
    value: complaints.filter(c => c.category === cat.id).length || Math.floor(Math.random() * 20) + 5,
    color: cat.color
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="purity-tooltip">
          <p className="purity-tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="purity-tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="purity-page">
      <div className="purity-header">
        <div className="purity-breadcrumb">
          <span>{t.adminPanel}</span>
          <span className="purity-breadcrumb-sep">/</span>
          <span className="purity-breadcrumb-active">{t.dashboardBreadcrumb}</span>
        </div>
        <h1 className="purity-title">{t.overviewAnalytics}</h1>
        <p className="purity-subtitle">{t.dashboardSubtitle}</p>
      </div>

      {/* Stats Grid - Purity UI Style */}
      <div className="purity-stats-grid">
        <div className="purity-stat-card">
          <div className="purity-stat-content">
            <p className="purity-stat-label">{t.totalComplaints}</p>
            <h3 className="purity-stat-value">{stats.total}</h3>
            <span className="purity-stat-sub positive">+12% {t.fromLastWeek}</span>
          </div>
          <div className="purity-stat-icon" style={{ background: "linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)" }}>
            ð
          </div>
        </div>
        <div className="purity-stat-card">
          <div className="purity-stat-content">
            <p className="purity-stat-label">{t.activeIssues}</p>
            <h3 className="purity-stat-value">{stats.active}</h3>
            <span className="purity-stat-sub negative">{stats.emergency} {t.emergency}</span>
          </div>
          <div className="purity-stat-icon" style={{ background: "linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)" }}>
            ð¥
          </div>
        </div>
        <div className="purity-stat-card">
          <div className="purity-stat-content">
            <p className="purity-stat-label">{t.resolved}</p>
            <h3 className="purity-stat-value">{stats.resolved}</h3>
            <span className="purity-stat-sub neutral">{stats.avgResolution}h avg time</span>
          </div>
          <div className="purity-stat-icon" style={{ background: "linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)" }}>
            â
          </div>
        </div>
        <div className="purity-stat-card">
          <div className="purity-stat-content">
            <p className="purity-stat-label">{t.aiAccuracy}</p>
            <h3 className="purity-stat-value">94.2%</h3>
            <span className="purity-stat-sub positive">+2.1% {t.fromLastMonth}</span>
          </div>
          <div className="purity-stat-icon" style={{ background: "linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)" }}>
            ð§ 
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="purity-charts-grid">
        {/* Line Chart */}
        <div className="purity-card chart-card">
          <div className="purity-card-header">
            <div>
              <h3 className="purity-card-title">{t.weeklyReportVolume}</h3>
              <p className="purity-card-subtitle"><span className="positive-text">(+23%)</span> than last week</p>
            </div>
          </div>
          <div className="purity-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#A0AEC0", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#A0AEC0", fontSize: 12 }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="reports" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Reports" />
                <Line type="monotone" dataKey="solved" stroke="#16A34A" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="purity-card chart-card pie-card">
          <div className="purity-card-header">
            <div>
              <h3 className="purity-card-title">Categorization Breakdown</h3>
              <p className="purity-card-subtitle">AI detected complaint distribution</p>
            </div>
          </div>
          <div className="purity-chart-container" style={{ display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="purity-pie-legend">
              {pieData.map((entry, index) => (
                <div key={index} className="purity-legend-item">
                  <span className="purity-legend-dot" style={{ backgroundColor: entry.color }}></span>
                  <p className="purity-legend-text">
                    <span className="purity-legend-name">{entry.name}</span>
                    <span className="purity-legend-value">{entry.value}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Reports and Depts */}
      <div className="purity-bottom-grid">
        <div className="purity-card">
          <div className="purity-card-header flex-between">
            <div>
              <h3 className="purity-card-title">{t.recentReports}</h3>
              <p className="purity-card-subtitle">
                <span className="live-dot"></span>
                <span className="positive-text">{stats.active}</span> active issues remaining
              </p>
            </div>
            <button className="purity-btn-minimal">View All</button>
          </div>
          <div className="purity-table-container">
            <table className="purity-table">
              <thead>
                <tr>
                  <th>ISSUE</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                  <th>LOGGED</th>
                </tr>
              </thead>
              <tbody>
                {recentComplaints.map(c => {
                  const cat = CATEGORIES.find(x => x.id === c.category);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="purity-table-cell flex-cell">
                          <div className="purity-icon-box" style={{ color: cat?.color }}>{cat?.icon}</div>
                          <div className="purity-cell-text">
                            <h6 className="purity-cell-title">{c.description}</h6>
                            <span className="purity-cell-sub">{c.location}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge label={c.priority} color={PRIORITY_COLORS[c.priority]} small />
                      </td>
                      <td>
                        <Badge label={c.status} color={STATUS_COLORS[c.status]} small />
                      </td>
                      <td>
                        <span className="purity-cell-sub">{formatTime(c.created_at)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="purity-card">
          <div className="purity-card-header">
            <h3 className="purity-card-title">{t.deptPerformance}</h3>
            <p className="purity-card-subtitle">Efficiency metrics across all departments</p>
          </div>
          <div className="purity-dept-list">
            {DEPT_STATS.map(d => (
              <div key={d.dept} className="purity-dept-item">
                <div className="purity-dept-info">
                  <h6 className="purity-dept-name">{d.dept}</h6>
                  <span className="purity-dept-stats">{d.resolved} {t.resolvedLabel} Â· {d.pending} {t.pendingLabel}</span>
                </div>
                <div className="purity-dept-progress-wrap">
                  <span className="purity-dept-eff" style={{ color: d.efficiency > 95 ? "#16A34A" : d.efficiency > 90 ? "#D97706" : "#EA580C" }}>
                    {d.efficiency}%
                  </span>
                  <div className="purity-progress-bg">
                    <div className="purity-progress-fill" style={{
                      width: `${d.efficiency}%`,
                      background: d.efficiency > 95 ? "linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)" : d.efficiency > 90 ? "#D97706" : "#EA580C",
                    }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Routing Rules Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function RoutingPage({ complaints }) {
  const featured = complaints.find(c => c.duplicate_of) || complaints[0];
  const original = complaints.find(c => c.id === featured?.duplicate_of);
  const cat = CATEGORIES.find(x => x.id === featured?.category);
  const deptStat = DEPT_STATS.find(d => d.dept === featured?.assigned_dept);

  return (
    <div className="page-content">
      <div className="page-breadcrumb">
        <span>ADMIN PANEL</span>
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
        <span className="breadcrumb-active">ROUTING WORKFLOW</span>
      </div>
      <h1 className="page-title">Smart Routing & Dept Workflow</h1>
      <p className="page-subtitle">AI-driven complaint categorization and automatic department assignment â ensuring every citizen's voice reaches the correct department instantly.</p>

      {/* AI Notification + Routing Efficiency */}
      <div className="routing-top-grid">
        <div className="card ai-notification-card">
          <div className="ai-notif-header">
            <span className="ai-notif-icon">Ã¢ÅÂ¨</span>
            <span className="ai-notif-title">AI Notification: Duplicate Detected</span>
          </div>
          <p className="ai-notif-desc">
            <strong>Large Pothole</strong> complaint from Sadar Bazaar (ID #{featured?.id}) â matches a report received 2 hours ago (ID #{original?.id || "CL-2026-00001"}). AI recommends merging both.
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
            <div className="map-pin">Ã°Å¸âÂ</div>
            <div className="map-radius"></div>
          </div>
        </div>

        <div className="card efficiency-card">
          <div className="efficiency-label">Routing Efficiency</div>
          <div className="efficiency-value">{deptStat?.efficiency || 98.4}%</div>
          <div className="efficiency-bar">
            <div className="efficiency-fill" style={{ width: `${deptStat?.efficiency || 98.4}%` }} />
          </div>
          <div className="efficiency-sub">Ã°Å¸âË +2.1% from last month</div>
        </div>
      </div>

      {/* Visual Routing Pathway */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span style={{ fontSize: "16px" }}>Ã¢ÅÂ¨</span>
            Visual Routing Pathway
          </h3>
          <span className="card-badge live">Ã¢âÂ LIVE FLOW</span>
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
            <div className="pathway-label" style={{ color: "#2563EB" }}>AI Categorized</div>
            <div className="pathway-sub" style={{ color: "#2563EB" }}>HIGH PRIORITY POTHOLE</div>
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
            <div className="pathway-sub">{featured?.assigned_dept} Â· {featured?.assigned_unit}</div>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>
              </div>
              <span className="logic-rule-text">Keywords: "{featured?.ai_keywords?.join('", "')}"</span>
              <Badge label="Active" color="#16A34A" small />
            </div>
            <div className="logic-rule">
              <div className="logic-rule-icon">Ã°Å¸âÂ</div>
              <span className="logic-rule-text">Zone: {featured?.zone || "Downtown Metro 1"}</span>
              <Badge label="Active" color="#16A34A" small />
            </div>
            <div className="logic-rule">
              <div className="logic-rule-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <span className="logic-rule-text">Priority Escalation: {featured?.priority}</span>
              <Badge label="Triggered" color="#D97706" small />
            </div>
            <div className="logic-rule">
              <div className="logic-rule-icon">Ã°Å¸ââ</div>
              <span className="logic-rule-text">Duplicate Detection: Match found</span>
              <Badge label="Active" color="#16A34A" small />
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
              <div className="response-time-icon">Ã¢ÂÂ±Ã¯Â¸Â</div>
            </div>
            <MiniBarChart data={[12, 18, 14, 16, 22, 14, 11]} color="#2563EB" height={80} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Workflows Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function WorkflowsPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const workflows = [
    { nameKey: "wfEmergency", descKey: "wfEmergencyDesc", status: t.active, triggers: 23, lastRun: "2m ago", color: "#DC2626" },
    { nameKey: "wfDuplicate", descKey: "wfDuplicateDesc", status: t.active, triggers: 47, lastRun: "5m ago", color: "#2563EB" },
    { nameKey: "wfWardAssign", descKey: "wfWardAssignDesc", status: t.active, triggers: 156, lastRun: "1m ago", color: "#16A34A" },
    { nameKey: "wfSLA", descKey: "wfSLADesc", status: t.active, triggers: 8, lastRun: "15m ago", color: "#D97706" },
    { nameKey: "wfFeedback", descKey: "wfFeedbackDesc", status: t.paused, triggers: 89, lastRun: "1 hour", color: "#7C3AED" },
    { nameKey: "wfReport", descKey: "wfReportDesc", status: t.active, triggers: 4, lastRun: "2 days", color: "#059669" },
  ];

  return (
    <div className="page-content">
      <div className="page-breadcrumb">
        <span>{t.adminPanel}</span>
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
        <span className="breadcrumb-active">{t.workflowsBreadcrumb}</span>
      </div>
      <h1 className="page-title">{t.automationWorkflows}</h1>
      <p className="page-subtitle">{t.workflowsSubtitle}</p>

      <div className="workflows-grid">
        {workflows.map(w => (
          <div key={w.nameKey} className="card workflow-card">
            <div className="workflow-header">
              <div className="workflow-dot" style={{ background: w.color }} />
              <Badge label={w.status} color={w.status === t.active ? "#16A34A" : "#D97706"} small />
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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Queue Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
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
                    {c.is_emergency && <span className="emergency-tag">ð¨ EMERGENCY</span>}
                    {c.duplicate_of && <span className="duplicate-tag">Ã°Å¸ââ DUPLICATE</span>}
                  </div>
                  <div className="queue-item-title">{c.description}</div>
                  <div className="queue-item-meta">
                    Ã°Å¸âÂ {c.location} Â· {formatTime(c.created_at)} Â· {c.assigned_dept}
                  </div>
                  <div className="queue-item-ai">
                    ð¤ {c.ai_reasoning} <span className="ai-conf">({c.ai_confidence}% {t.confidence})</span>
                  </div>
                  {/* Civic Intelligence badges */}
                  {(c.damage_level || c.risk_type || c.authority) && (
                    <div className="ci-queue-badges">
                      {c.damage_level && (
                        <span className="ci-badge-damage" style={{ color: DAMAGE_COLORS[c.damage_level], borderColor: (DAMAGE_COLORS[c.damage_level] || '#D97706') + '40', background: (DAMAGE_COLORS[c.damage_level] || '#D97706') + '14' }}>
                          {c.damage_level.toUpperCase()}
                        </span>
                      )}
                      {c.escalation_required && (
                        <span className="ci-badge-escalation">Ã¢Å¡Â Ã¯Â¸Â {t.escalationRequired || 'ESCALATION'}</span>
                      )}
                      {c.estimated_resolution_time && (
                        <span className="ci-badge-eta">Ã¢ÂÂ± {c.estimated_resolution_time}</span>
                      )}
                      {c.ai_score && (
                        <span className="ci-badge-score" style={{ color: c.ai_score >= 100 ? '#DC2626' : c.ai_score >= 70 ? '#EA580C' : '#16A34A' }}>
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
                    Ã¢âÂ² {c.votes}
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

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Logs Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
function LogsPage({ complaints }) {
  const { language } = useLanguage();
  const t = translations[language];
  const [dbLogs, setDbLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const FALLBACK_LOGS = [
    { time: "10:32:15", type: "AI", message: `Duplicate detected: ${complaints[4]?.id} matches ${complaints[0]?.id}`, level: "warn" },
    { time: "10:30:22", type: "SYSTEM", message: `New complaint: ${complaints[4]?.id} â Large pothole near Sadar chowk`, level: "info" },
    { time: "10:28:05", type: "ROUTE", message: `${complaints[2]?.id} auto-assigned â Electricity Board Â· Zone 1`, level: "success" },
    { time: "09:45:30", type: "AI", message: `Escalated: ${complaints[1]?.id} now HIGH priority`, level: "warn" },
    { time: "09:15:10", type: "SYSTEM", message: `New complaint: ${complaints[1]?.id} â No water for 3 days, Laxmi Nagar`, level: "info" },
    { time: "08:55:00", type: "SLA", message: `SLA Warning: ${complaints[2]?.id} nearing the 24-hour limit`, level: "error" },
    { time: "08:30:45", type: "ROUTE", message: `${complaints[0]?.id} routed â PWD Â· Zone 4 Dharampeth`, level: "success" },
    { time: "08:30:02", type: "AI", message: `Analysis complete: ${complaints[0]?.id} placed in CRITICAL category`, level: "error" },
    { time: "08:30:00", type: "SYSTEM", message: `New complaint: ${complaints[0]?.id} â Large pothole MG Road, Nagpur`, level: "info" },
    { time: "07:00:00", type: "SYSTEM", message: "System health check: All services operational Ã¢Åâ", level: "success" },
  ];

  useEffect(() => {
    fetchActivityLogs(50).then(result => {
      if (result.success && result.data.length > 0) {
        setDbLogs(result.data.map(log => ({
          time: new Date(log.created_at).toLocaleTimeString('en-IN', { hour12: false }),
          type: log.type,
          message: log.message,
          level: log.level,
        })));
      }
      setLogsLoading(false);
    });
  }, []);

  const logs = dbLogs.length > 0 ? dbLogs : FALLBACK_LOGS;
  const levelColors = { info: "#2563EB", warn: "#D97706", error: "#DC2626", success: "#16A34A" };

  return (
    <div className="page-content">
      <div className="page-breadcrumb">
        <span>{t.adminPanel}</span>
        <span className="breadcrumb-sep">Ã¢â¬Âº</span>
        <span className="breadcrumb-active">{t.systemLogsBreadcrumb}</span>
      </div>
      <h1 className="page-title">{t.systemLogs}</h1>
      <p className="page-subtitle">{t.logsSubtitle}</p>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            {t.activityStream}
          </h3>
          <span className="card-badge live">Ã¢âÂ {t.live}</span>
        </div>
        {logsLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading logs...</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Post Complaint Page Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Audio Recording State Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceAiResult, setVoiceAiResult] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const selectedCat = CATEGORIES.find(c => c.id === category);

  // Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Start / Stop Recording Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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

  // Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Groq Whisper Transcription + LLM Analysis Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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

  // Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Webcam Camera Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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

  const closeCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraOpen(false);
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
    const newId = `CL-2026-${String(Math.floor(Math.random() * 90000 + 10000)).padStart(5, "0")}`;

    // Create optimistic offline complaint for UI update
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
      damage_level: aiResult?.damage_level || "moderate",
      risk_type: aiResult?.risk_type || "General civic concern",
      authority: aiResult?.authority || selectedCat?.dept || "Municipal Corporation",
      escalation_required: aiResult?.escalation_required || false,
      estimated_resolution_time: aiResult?.estimated_resolution_time || "Within 48 hours",
      ai_score: aiResult?.ai_score || calculateAiScore(aiResult?.damage_level || 'moderate', aiResult?.priority || 'Medium'),
    };

    // Update local UI state
    onSubmit(newComplaint);
    addPoints(10);
    setSubmittedId(newId);
    setStep(4);

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
    formData.append('ai_score', aiResult?.ai_score || calculateAiScore(aiResult?.damage_level || 'moderate', aiResult?.priority || 'Medium'));
    formData.append('ai_reasoning', aiResult?.reasoning || 'Standard civic complaint');

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      console.log('[Frontend] Submitting to backend API...');
      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        console.log('[Backend] Upload and creation successful:', result.complaint);

        // Log local activities 
        insertActivityLog('SYSTEM', `New complaint submitted: ${newId} â ${description.slice(0, 60)}...`, newId, 'info');
        insertActivityLog('AI', `AI analysis: ${aiResult?.priority || 'Medium'} priority, ${aiResult?.damage_level || 'moderate'} damage â ${aiResult?.authority || 'Municipal Corporation'}`, newId, aiResult?.escalation_required ? 'error' : 'success');
      } else {
        console.error('[Backend] Submission failed:', result.message);
        // Optionally could alert the user, but we've already optimistic updated.
        // In a real app we'd roll back the optimistic update
      }
    } catch (err) {
      console.error('[Frontend] Network or Parse Error:', err);
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
    closeCamera();
  }, []);

  const pts = getPoints();
  const lvl = getLevel(pts);

  return (
    <div className="clean-public-wizard" id="report-wizard">
      <div className="post-complaint-wrapper public-centered">
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
              <div className="post-gami-points">{pts} {t.points} Â· {t.plusForPosting}</div>
            </div>
          </div>
          <div className="post-gami-bar-wrap">
            <div className="post-gami-bar" style={{ width: `${Math.min((pts / (lvl.max === Infinity ? 500 : lvl.max)) * 100, 100)}%` }} />
          </div>
        </div>

        {/* Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Step 1: Category Selection Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
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

        {/* Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Step 2: Details Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
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

              {/* Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Voice Recording Section Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
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
                        <span className="ci-escalation-icon">Ã¢Å¡Â Ã¯Â¸Â</span>
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
                        <span className="voice-ai-item-value" style={{ color: PRIORITY_COLORS[voiceAiResult.priority] || '#2563EB' }}>
                          {voiceAiResult.priority}
                        </span>
                      </div>
                      <div className="voice-ai-item">
                        <span className="voice-ai-item-label">{t.damageLevel}</span>
                        <span className="voice-ai-item-value" style={{ color: DAMAGE_COLORS[voiceAiResult.damage_level] || '#D97706' }}>
                          {voiceAiResult.damage_level?.charAt(0).toUpperCase() + voiceAiResult.damage_level?.slice(1)}
                        </span>
                      </div>
                      <div className="voice-ai-item">
                        <span className="voice-ai-item-label">{t.authorityLabel}</span>
                        <span className="voice-ai-item-value" style={{ color: '#2563EB' }}>
                          {voiceAiResult.authority}
                        </span>
                      </div>
                    </div>
                    <div className="voice-ai-reasoning">
                      <span className="voice-ai-reasoning-icon">ð¤</span>
                      <span>{voiceAiResult.reasoning}</span>
                    </div>
                    {/* CI footer badges */}
                    <div className="ci-queue-badges" style={{ marginTop: '10px' }}>
                      {voiceAiResult.estimated_resolution_time && (
                        <span className="ci-badge-eta">Ã¢ÂÂ± {voiceAiResult.estimated_resolution_time}</span>
                      )}
                      <span className="ci-badge-score" style={{ color: (voiceAiResult.ai_score || 0) >= 100 ? '#DC2626' : (voiceAiResult.ai_score || 0) >= 70 ? '#EA580C' : '#16A34A' }}>
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
              <div className="post-form-row">
                <div className="post-field">
                  <label className="post-field-label">{t.locationLandmark} <span className="post-required">*</span></label>
                  <div className="post-input-icon">
                    <span className="post-input-icon-left">Ã°Å¸âÂ</span>
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
                    <span className="post-input-icon-left">Ã°Å¸ÂâºÃ¯Â¸Â</span>
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
                      <button type="button" className="camera-cancel-btn" onClick={closeCamera}>Ã¢Åâ¢ Cancel</button>
                      <button type="button" className="camera-capture-btn" onClick={capturePhoto}>
                        <span className="camera-capture-ring" />
                      </button>
                      <div style={{ width: '80px' }} />
                    </div>
                  </div>
                )}

                {!cameraOpen && imagePreview ? (
                  <div className="post-upload-preview-container">
                    <div className="post-upload-preview">
                      <img src={imagePreview} alt="Preview" className="post-upload-img" />
                      <button className="post-upload-remove" onClick={(e) => { e.stopPropagation(); removeImage(); }}>Ã¢Åâ¢</button>
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
                  <span className="post-emergency-icon">ð¨</span>
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

        {/* Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Step 3: AI Review Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
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
                        <div className="post-review-cat-dept">â {selectedCat?.dept}</div>
                      </div>
                    </div>
                    <Badge label={aiResult.priority} color={PRIORITY_COLORS[aiResult.priority]} />
                  </div>
                  <div className="post-review-desc">"{description}"</div>
                  <div className="post-review-meta">
                    <span>Ã°Å¸âÂ {location}</span>
                    {zone && <><span>Â·</span><span>Ã°Å¸ÂâºÃ¯Â¸Â {zone}</span></>}
                    {isEmergency && <span className="emergency-tag">ð¨ EMERGENCY</span>}
                  </div>
                </div>

                {/* AI Insights â Civic Intelligence Engine */}
                <div className="post-ai-insights">
                  <h3 className="post-ai-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" /><path d="M12 6v6l4 2" /></svg>
                    {t.aiDetermination}
                  </h3>

                  {/* Escalation Banner */}
                  {aiResult.escalation_required && (
                    <div className="ci-escalation-banner">
                      <span className="ci-escalation-icon">Ã¢Å¡Â Ã¯Â¸Â</span>
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
                      <div className="post-ai-item-value" style={{ color: DAMAGE_COLORS[aiResult.damage_level] || '#D97706' }}>
                        {aiResult.damage_level?.charAt(0).toUpperCase() + aiResult.damage_level?.slice(1)}
                      </div>
                    </div>
                    <div className="post-ai-item">
                      <div className="post-ai-item-label">{t.confidenceLabel}</div>
                      <div className="post-ai-item-value" style={{ color: '#16A34A' }}>{aiResult.confidence}%</div>
                    </div>
                    <div className="post-ai-item">
                      <div className="post-ai-item-label">{t.department}</div>
                      <div className="post-ai-item-value" style={{ color: '#2563EB' }}>{aiResult.authority || selectedCat?.dept}</div>
                    </div>
                    <div className="post-ai-item">
                      <div className="post-ai-item-label">{t.riskType || 'RISK TYPE'}</div>
                      <div className="post-ai-item-value ci-risk-value">{aiResult.risk_type || 'N/A'}</div>
                    </div>
                    <div className="post-ai-item">
                      <div className="post-ai-item-label">{t.estResolution || 'EST. RESOLUTION'}</div>
                      <div className="post-ai-item-value" style={{ color: '#059669' }}>{aiResult.estimated_resolution_time || 'N/A'}</div>
                    </div>
                    <div className="post-ai-item">
                      <div className="post-ai-item-label">{t.aiScoreLabel || 'AI SCORE'}</div>
                      <div className="post-ai-item-value" style={{ color: (aiResult.ai_score || 0) >= 100 ? '#DC2626' : (aiResult.ai_score || 0) >= 70 ? '#EA580C' : '#16A34A' }}>
                        {aiResult.ai_score || 0}
                      </div>
                    </div>
                    <div className="post-ai-item">
                      <div className="post-ai-item-label">{t.status}</div>
                      <div className="post-ai-item-value" style={{ color: '#D97706' }}>{t.readyToSubmit}</div>
                    </div>
                  </div>
                  <div className="post-ai-reasoning">
                    <span className="post-ai-reasoning-icon">ð¤</span>
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
              <div className="post-actions">
                <button className="post-back-btn" onClick={() => setStep(2)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                  {t.makeChanges}
                </button>
                <button className="btn-primary post-submit-btn" onClick={handleSubmit}>
                  Ã¢Åâ¦ {t.submitComplaintBtn}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Step 4: Success Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
        {step === 4 && (
          <div className="post-step-content post-success-step" key="step4">
            <div className="post-success-card">
              <div className="post-success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <span className="post-success-points-icon">Ã¢Â­Â</span>
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

ï¿½ï¿½// %%% Landing Page %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function LandingPage({ onSubmit }) {
  const navigate = useNavigate();
  return (
    <div className="landing-page-flow">
      <HeroSection
        onRecordClick={() => {
          document.getElementById('report-wizard')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onViewIssuesClick={() => navigate('/queue')}
      />
      <div className="standalone-wizard">
        <PostComplaintPage onSubmit={onSubmit} setPage={(p) => navigate(/)} />
      </div>
    </div>
  );
}

// %%% Legacy App Root %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function LegacyAppRoot({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const page = location.pathname.replace('/', '') || 'dashboard';
    const setPage = (p) => navigate(/);
    
    const [searchQuery, setSearchQuery] = useState("");
    
    return (
        <div className="app-layout">
            <Sidebar page={page} setPage={setPage} navigateTo={navigate} />
            <div className="main-area">
                <TopBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

// %%% App %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
export default function App() {
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);

  function handleVote(id) {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, votes: c.votes + 1 } : c));
    const complaint = complaints.find(c => c.id === id);
    if (complaint) {
      updateComplaintVotes(id, (complaint.votes || 0) + 1);
      insertActivityLog('VOTE', Vote cast on  (now  votes), id, 'info');
    }
  }

  function handleUpdate(id, updates) {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (updates.status) {
      updateComplaintStatus(id, updates.status);
      insertActivityLog('STATUS', ${id} status changed to , id, 'info');
    }
  }

  return (
    <>
      <Routes>
        {/* %%% Public Routes (Landing Page) %%% */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage onSubmit={(c) => setComplaints(prev => [c, ...prev])} />} />
          <Route path="/report" element={<LandingPage onSubmit={(c) => setComplaints(prev => [c, ...prev])} />} />
        </Route>

        {/* %%% Admin Routes (Admin Layout) %%% */}
        <Route path="/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
        <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
        <Route path="/admin/queue" element={<AdminLayout><AdminQueuePage /></AdminLayout>} />
        <Route path="/admin/logs" element={<AdminLayout><AdminLogsPage /></AdminLayout>} />
        <Route path="/admin/routing-rules" element={<AdminLayout><AdminRoutingRulesPage /></AdminLayout>} />
        <Route path="/admin/support" element={<AdminLayout><AdminSupportPage /></AdminLayout>} />

        {/* %%% Citizen Portal Routes (Legacy Layout) %%% */}
        <Route path="/points" element={<LegacyAppRoot><div className="page-content">Leaderboard / Points Dashboard Placeholder</div></LegacyAppRoot>} />
        <Route path="/queue" element={<LegacyAppRoot><QueuePage complaints={complaints} onVote={handleVote} onUpdate={handleUpdate} /></LegacyAppRoot>} />
        <Route path="/logs" element={<LegacyAppRoot><LogsPage complaints={complaints} /></LegacyAppRoot>} />
        <Route path="/routing" element={<LegacyAppRoot><RoutingPage complaints={complaints} /></LegacyAppRoot>} />
        <Route path="/workflows" element={<LegacyAppRoot><WorkflowsPage /></LegacyAppRoot>} />
        <Route path="*" element={<LegacyAppRoot><DashboardPage complaints={complaints} /></LegacyAppRoot>} />
      </Routes>
      <ChatBot apiKey={GROQ_API_KEY} />
    </>
  );
}
