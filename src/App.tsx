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

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useBecomingStore();
  if (isAuthLoading) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-[var(--text)] animate-spin"></div></div>;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setUser, setAuthLoading } = useBecomingStore();

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
    <BrowserRouter>
      <CanvasBackground />
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
  );
}
