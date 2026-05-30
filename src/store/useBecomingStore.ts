import { create } from 'zustand';
import { UserProfile, ReflectionSession, BecomingResult, ShareCard } from '../types/becoming';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { saveUserProfile, saveSession, saveResult, getLatestIncompleteSession, getResult } from '../lib/firestore';
import { generateAnalysis } from '../lib/gemini';
import { sendSessionCompletionEmail } from '../lib/email';

interface BecomingStore {
  user: UserProfile | null;
  isAuthLoading: boolean;

  currentSession: ReflectionSession | null;
  currentQuestionIndex: number;
  isSessionComplete: boolean;

  analysisStep: 'idle' | 'scanning' | 'projecting' | 'generating' | 'complete';
  analysisProgress: number; // 0-100

  result: BecomingResult | null;
  activeView: 'split' | 'future-a' | 'future-b' | 'letter' | 'plan' | 'share' | 'overview' | 'identity' | 'history';

  setUser: (user: UserProfile | null) => void;
  setAuthLoading: (loading: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  
  startSession: () => Promise<void>;
  loadUserState: () => Promise<void>;
  submitAnswer: (answer: string, question: string, category: string) => Promise<void>;
  skipQuestion: (question: string, category: string) => Promise<void>;
  triggerAnalysis: () => Promise<void>;
  setActiveView: (view: 'split' | 'future-a' | 'future-b' | 'letter' | 'plan' | 'share' | 'overview' | 'identity' | 'history') => void;
  generateShareCard: () => ShareCard | null;
  resetSession: () => void;
  setSession: (s: ReflectionSession) => void;
  setResult: (r: BecomingResult) => void;
}

export const useBecomingStore = create<BecomingStore>((set, get) => ({
  user: null,
  isAuthLoading: true,

  currentSession: null,
  currentQuestionIndex: 0,
  isSessionComplete: false,

  analysisStep: 'idle',
  analysisProgress: 0,

  result: null,
  activeView: 'overview',

  setUser: (user) => set({ user, isAuthLoading: false }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  setSession: (s) => set({ currentSession: s, currentQuestionIndex: s.answers.length }),
  setResult: (r) => set({ result: r, analysisStep: 'complete' }),

  signInWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const profile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: Date.now()
      };
      await saveUserProfile(user.uid, profile);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
  
  signOut: async () => {
    await fbSignOut(auth);
    set({ user: null, currentSession: null, result: null, currentQuestionIndex: 0 });
  },

  startSession: async () => {
    const user = get().user;
    if (!user) return;
    const session: ReflectionSession = {
      id: crypto.randomUUID(),
      userId: user.uid,
      answers: [],
      status: 'in_progress',
      createdAt: Date.now()
    };
    await saveSession(session);
    set({ currentSession: session, currentQuestionIndex: 0, isSessionComplete: false, result: null });
  },

  loadUserState: async () => {
    const user = get().user;
    if (!user) return;
    
    // Check for an incomplete session
    const incompleteSession = await getLatestIncompleteSession(user.uid);
    if (incompleteSession) {
      set({ 
        currentSession: incompleteSession, 
        currentQuestionIndex: incompleteSession.answers.length,
        isSessionComplete: false,
        result: null
      });
    }
  },

  submitAnswer: async (answer, question, category) => {
    const { currentSession, currentQuestionIndex } = get();
    if (!currentSession) return;
    
    const newSession = { ...currentSession };
    newSession.answers = [...newSession.answers, {
      questionId: String(currentQuestionIndex),
      question,
      answer,
      category,
      answeredAt: Date.now()
    }];
    await saveSession(newSession);
    set({ currentSession: newSession, currentQuestionIndex: currentQuestionIndex + 1 });
  },

  skipQuestion: async (question, category) => {
    await get().submitAnswer('', question, category);
  },

  triggerAnalysis: async () => {
    const { currentSession, user, analysisStep } = get();
    if (!currentSession || !user) return;
    if (analysisStep !== 'idle') return;
    
    set({ analysisStep: 'scanning', analysisProgress: 10 });
    
    try {
      // Simulate phases for visual effect
      setTimeout(() => set({ analysisStep: 'projecting', analysisProgress: 40 }), 2000);
      setTimeout(() => set({ analysisStep: 'generating', analysisProgress: 70 }), 4000);
      
      const analysisData = await generateAnalysis(currentSession.answers);
      
      const fullResult: BecomingResult = {
        ...analysisData,
        sessionId: currentSession.id,
        userId: user.uid,
        generatedAt: Date.now()
      };
      
      await saveResult(fullResult);
      
      await saveSession({
        ...currentSession,
        status: 'complete',
        completedAt: Date.now()
      });
      
      set({ 
        analysisStep: 'complete', 
        analysisProgress: 100,
        result: fullResult,
        isSessionComplete: true
      });
      
      // Dispatch email notification in background
      if (user.email) {
        sendSessionCompletionEmail(user.email, user.displayName);
      }
    } catch (err) {
      console.error(err);
      set({ analysisStep: 'idle' });
      throw err;
    }
  },

  setActiveView: (view) => set({ activeView: view }),

  generateShareCard: () => {
    return get().result?.shareCard || null;
  },

  resetSession: () => {
    set({ 
      currentSession: null, 
      currentQuestionIndex: 0, 
      isSessionComplete: false, 
      result: null,
      analysisStep: 'idle',
      analysisProgress: 0,
      activeView: 'overview'
    });
  }
}));
