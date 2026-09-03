// Route guard: forces new/incomplete users through onboarding before they
// can access the rest of the app. Used to wrap the protected Layout route.

import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { profileApi } from './api';
import { isProfileComplete } from './validation';
import type { UserProfile } from './types';

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'incomplete' | 'complete' | 'error'>(
    'loading',
  );
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    profileApi
      .get()
      .then((data: UserProfile) => {
        if (cancelled) return;
        setStatus(isProfileComplete(data) ? 'complete' : 'incomplete');
      })
      .catch((err: { status?: number; message?: string }) => {
        if (cancelled) return;
        if (err.status === 404) {
          setStatus('incomplete');
        } else {
          setError(err.message || 'Failed to check profile');
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // While checking, render a minimal loader (no chrome, no Layout)
  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          position: 'relative',
          zIndex: 5,
        }}
      >
        Loading...
      </div>
    );
  }

  // If something went wrong other than 404, let the protected content render
  // (better UX than blocking the entire app for a transient network error)
  if (status === 'error') {
    return <>{children}</>;
  }

  // If profile is incomplete and the user is NOT already on /onboarding,
  // redirect them there. No infinite loop because /onboarding is OUTSIDE
  // this gate.
  if (status === 'incomplete' && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
