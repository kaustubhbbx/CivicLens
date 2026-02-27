import React from 'react';

export function HeroSection({ onRecordClick, onViewIssuesClick }) {
    return (
        <section className="public-hero-section">
            <div className="hero-container">
                <h1 className="hero-headline">
                    Report Civic Issues <br /><span className="hero-headline-accent">Instantly with AI</span>
                </h1>
                <p className="hero-description">
                    Empowering citizens to build better cities. Record a complaint, let our AI categorize and prioritize it, and track it live.
                </p>
                <div className="hero-buttons">
                    <button className="hero-btn-primary" onClick={onRecordClick}>
                        Record Complaint
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                    </button>
                    <button className="hero-btn-secondary" onClick={onViewIssuesClick}>
                        View Live Issues
                    </button>
                </div>
            </div>
        </section>
    );
}
