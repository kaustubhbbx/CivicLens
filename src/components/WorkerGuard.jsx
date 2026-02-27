import { useState, useEffect } from 'react';
import { useUser, SignIn, useAuth } from '@clerk/clerk-react';
import { checkWorkerRole } from '../lib/requireAdmin.js';
import { useNavigate } from 'react-router-dom';

export default function WorkerGuard({ children }) {
    const { isSignedIn, user, isLoaded: userLoaded } = useUser();
    const { isLoaded: authLoaded } = useAuth();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [isWorker, setIsWorker] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!authLoaded || !userLoaded) return;

        if (!isSignedIn || !user) {
            setChecking(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const result = await checkWorkerRole(user);
                if (cancelled) return;

                if (!result.tableExists) {
                    setError('TABLE_NOT_FOUND');
                } else if (result.isWorker) {
                    setIsWorker(true);
                } else {
                    setError('ACCESS_DENIED');
                }
            } catch (err) {
                if (!cancelled) setError('VERIFICATION_FAILED');
            } finally {
                if (!cancelled) setChecking(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isSignedIn, user, authLoaded, userLoaded]);

    if (!authLoaded || !userLoaded || checking) {
        return (
            <div className="admin-guard-loading">
                <div className="admin-guard-spinner" />
                <p>Verifying worker access...</p>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="admin-guard-signin">
                <div className="admin-guard-signin-card">
                    <div className="admin-guard-header">
                        <div className="admin-guard-icon">🛠️</div>
                        <h2>Worker Access Required</h2>
                        <p>Sign in with your worker account to view assigned civic tasks.</p>
                    </div>
                    <div className="admin-guard-clerk-container">
                        <SignIn
                            routing="hash"
                            afterSignInUrl="/worker"
                        />
                    </div>
                    <button className="admin-guard-back-btn" onClick={() => navigate('/')}>
                        ← Back to CivicLens
                    </button>
                </div>
            </div>
        );
    }

    if (error && !isWorker) {
        return (
            <div className="admin-guard-denied">
                <div className="admin-guard-denied-card">
                    <div className="admin-guard-denied-icon">🚫</div>
                    <h2>Worker Access Denied</h2>
                    <p>Your account does not have worker permissions.</p>
                    <button className="admin-guard-back-btn" onClick={() => navigate('/')}>
                        ← Go to Citizen Portal
                    </button>
                </div>
            </div>
        );
    }

    if (isWorker) {
        return <>{children}</>;
    }

    return null;
}

