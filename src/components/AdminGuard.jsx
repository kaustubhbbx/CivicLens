// ─── Admin Route Guard Component ──────────────────────────────────────────────
// Wraps admin routes. Requires Clerk auth + admin role in Supabase.
// If not signed in → shows sign-in prompt.
// If signed in but not admin → shows access denied.
// If users table missing → shows setup instructions.
// If signed in and admin → renders children.

import { useState, useEffect } from 'react';
import { useUser, SignIn, useAuth, useClerk } from '@clerk/clerk-react';
import { checkAdminRole } from '../lib/requireAdmin.js';
import { useNavigate } from 'react-router-dom';

export default function AdminGuard({ children }) {
    const { isSignedIn, user, isLoaded: userLoaded } = useUser();
    const { isLoaded: authLoaded } = useAuth();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        if (!authLoaded || !userLoaded) return;

        if (!isSignedIn || !user) {
            setChecking(false);
            return;
        }

        // Sync user and verify admin role
        let cancelled = false;
        (async () => {
            try {
                console.log('[AdminGuard] User signed in:', user.id, '— checking admin role...');
                const result = await checkAdminRole(user);

                if (cancelled) return;

                console.log('[AdminGuard] Role check result:', result);

                // Table doesn't exist
                if (!result.tableExists || result.error === 'TABLE_NOT_FOUND') {
                    console.error('[AdminGuard] Users table not found in Supabase');
                    setDebugInfo('The "users" table does not exist in your Supabase database.');
                    setError('TABLE_NOT_FOUND');
                    setChecking(false);
                    return;
                }

                if (result.isAdmin) {
                    setIsAdmin(true);
                } else if (result.error) {
                    setDebugInfo(result.error);
                    setError('VERIFICATION_FAILED');
                } else {
                    setDebugInfo(`Your role is "${result.user?.role || 'unknown'}". Admin role required.`);
                    setError('ACCESS_DENIED');
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('[AdminGuard] Error:', err);
                    setDebugInfo(err.message || 'Unknown error');
                    setError('VERIFICATION_FAILED');
                }
            } finally {
                if (!cancelled) setChecking(false);
            }
        })();

        return () => { cancelled = true; };
    }, [isSignedIn, user, authLoaded, userLoaded]);

    // Loading state
    if (!authLoaded || !userLoaded || checking) {
        return (
            <div className="admin-guard-loading">
                <div className="admin-guard-spinner" />
                <p>Verifying admin access...</p>
            </div>
        );
    }

    // Not signed in → show Clerk sign-in
    if (!isSignedIn) {
        return (
            <div className="admin-guard-signin">
                <div className="admin-guard-signin-card">
                    <div className="admin-guard-header">
                        <div className="admin-guard-icon">🔐</div>
                        <h2>Admin Access Required</h2>
                        <p>Sign in with your administrator credentials to access the CivicLens admin panel.</p>
                    </div>
                    <div className="admin-guard-clerk-container">
                        <SignIn
                            routing="hash"
                            afterSignInUrl="/admin"
                            appearance={{
                                elements: {
                                    rootBox: { width: '100%' },
                                    card: { boxShadow: 'none', border: 'none', backgroundColor: 'transparent' },
                                },
                            }}
                        />
                    </div>
                    <button className="admin-guard-back-btn" onClick={() => navigate('/')}>
                        ← Back to CivicLens
                    </button>
                </div>
            </div>
        );
    }

    // Table not found → show setup instructions
    if (error === 'TABLE_NOT_FOUND') {
        return (
            <div className="admin-guard-denied">
                <div className="admin-guard-denied-card">
                    <div className="admin-guard-denied-icon">🗄️</div>
                    <h2>Database Setup Required</h2>
                    <p>
                        The <code>users</code> table doesn't exist in your Supabase database yet.
                        Run the following SQL in your <strong>Supabase Dashboard → SQL Editor</strong>:
                    </p>
                    <div className="admin-setup-code">
                        <code>{`CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'citizen'
    CHECK (role IN ('citizen', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read" ON public.users
  FOR SELECT USING (true);
CREATE POLICY "allow_insert" ON public.users
  FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update" ON public.users
  FOR UPDATE USING (true);`}</code>
                    </div>
                    <p style={{ marginTop: '12px', fontSize: '0.78rem' }}>
                        After running the SQL, click <strong>Retry</strong>. The first user to sign in will automatically get <em>admin</em> role.
                    </p>
                    <div className="admin-guard-denied-actions">
                        <button className="admin-guard-retry-btn" onClick={() => window.location.reload()}>
                            Retry
                        </button>
                        <button className="admin-guard-back-btn" onClick={() => navigate('/')}>
                            ← Go to Citizen Portal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Signed in but access denied
    if (error === 'ACCESS_DENIED') {
        return (
            <div className="admin-guard-denied">
                <div className="admin-guard-denied-card">
                    <div className="admin-guard-denied-icon">🚫</div>
                    <h2>Access Denied</h2>
                    <p>
                        Your account <strong>{user?.primaryEmailAddress?.emailAddress || user?.phoneNumbers?.[0]?.phoneNumber || user?.id}</strong> does not have
                        administrator privileges.
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {debugInfo}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        To grant admin access, run in Supabase SQL Editor:<br />
                        <code style={{ color: 'var(--accent)' }}>UPDATE users SET role = 'admin' WHERE clerk_id = '{user?.id}';</code>
                    </p>
                    <div className="admin-guard-denied-actions">
                        <button className="admin-guard-retry-btn" onClick={() => window.location.reload()}>
                            Retry After Granting
                        </button>
                        <button className="admin-guard-back-btn" onClick={() => { signOut(); navigate('/'); }}>
                            Sign Out & Return Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Verification failed
    if (error === 'VERIFICATION_FAILED') {
        return (
            <div className="admin-guard-denied">
                <div className="admin-guard-denied-card">
                    <div className="admin-guard-denied-icon">⚠️</div>
                    <h2>Verification Failed</h2>
                    <p>Could not verify your admin role. This usually means the database isn't configured correctly.</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Debug: {debugInfo}
                    </p>
                    <div className="admin-guard-denied-actions">
                        <button className="admin-guard-retry-btn" onClick={() => window.location.reload()}>
                            Retry
                        </button>
                        <button className="admin-guard-back-btn" onClick={() => navigate('/')}>
                            ← Go to Citizen Portal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Admin verified — render children
    if (isAdmin) {
        return <>{children}</>;
    }

    return null;
}
