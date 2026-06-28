import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useBecomingStore } from './store/useBecomingStore';

import LandingPage from './app/page';
import SignInPage from './app/(auth)/signin/page';
import ReflectPage from './app/(app)/reflect/page';
import AnalyzingPage from './app/(app)/analyzing/page';
import ResultsPage from './app/(app)/results/page';

import { Toaster } from 'react-hot-toast';

import { CanvasBackground } from './components/shared/CanvasBackground';
import { GrainOverlay } from './components/shared/GrainOverlay';
import { CustomCursor } from './components/shared/CustomCursor';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useBecomingStore();
  if (isAuthLoading) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-[var(--text)] animate-spin"></div></div>;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setUser, setAuthLoading, isRateLimited, setRateLimited } = useBecomingStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: Date.now()
        });
        await useBecomingStore.getState().loadUserState();
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setAuthLoading]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {isRateLimited && (
          <div id="rate-limit-banner" className="fixed top-0 left-0 right-0 z-[9999] bg-[#0c0a09eb] border-b border-[#ef444455] backdrop-blur-md px-[1.5rem] py-[0.75rem] text-center flex items-center justify-between gap-4 transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-left">
                <span className="font-mono text-[10px] tracking-widest text-[#ef4444] uppercase font-bold">
                  Capacity Alert
                </span>
                <span className="text-[11px] text-[var(--text)]/80">
                  The AI backend is currently near capacity. Retrying with progressive backoff is active.
                </span>
              </div>
            </div>
            <button 
              onClick={() => setRateLimited(false)}
              className="text-[10px] font-mono hover:text-[#ef4444] uppercase tracking-wider text-[var(--muted)] whitespace-nowrap cursor-pointer transition-colors"
            >
              [Dismiss]
            </button>
          </div>
        )}
        <CanvasBackground />
        <CustomCursor />
        <GrainOverlay />
        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }
          }} 
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          
          <Route path="/reflect" element={<AuthGuard><ReflectPage /></AuthGuard>} />
          <Route path="/analyzing" element={<AuthGuard><AnalyzingPage /></AuthGuard>} />
          <Route path="/results" element={<AuthGuard><ResultsPage /></AuthGuard>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
