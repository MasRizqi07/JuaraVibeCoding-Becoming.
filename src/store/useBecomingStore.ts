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

  analysisStep: 'idle' | 'scanning' | 'projecting' | 'generating' | 'retrying' | 'complete';
  analysisProgress: number; // 0-100

  result: BecomingResult | null;
  activeView: 'split' | 'future-a' | 'future-b' | 'letter' | 'plan' | 'share' | 'overview' | 'identity' | 'history';

  // Rate Limiting and Q positioning/bundling states
  isRateLimited: boolean;
  retryAttempt: number;
  retryDelaySec: number;
  retryingMessage: string;
  generatedQuestions: { question: string; category: string }[];

  setUser: (user: UserProfile | null) => void;
  setAuthLoading: (loading: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  
  startSession: () => Promise<void>;
  loadUserState: () => Promise<void>;
  submitAnswer: (answer: string, question: string, category: string) => Promise<void>;
  saveDraftAnswer: (draft: string) => Promise<void>;
  skipQuestion: (question: string, category: string) => Promise<void>;
  triggerAnalysis: () => Promise<void>;
  setActiveView: (view: 'split' | 'future-a' | 'future-b' | 'letter' | 'plan' | 'share' | 'overview' | 'identity' | 'history') => void;
  generateShareCard: () => ShareCard | null;
  resetSession: () => void;
  setSession: (s: ReflectionSession) => void;
  setResult: (r: BecomingResult) => void;
  setRateLimited: (isLimited: boolean) => void;
  setGeneratedQuestions: (questions: { question: string; category: string }[]) => void;
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

  isRateLimited: false,
  retryAttempt: 0,
  retryDelaySec: 0,
  retryingMessage: '',
  generatedQuestions: [],

  setUser: (user) => set({ user, isAuthLoading: false }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  setSession: (s) => set({ currentSession: s, currentQuestionIndex: s.answers.length }),
  setResult: (r) => set({ result: r, analysisStep: 'complete' }),
  setRateLimited: (isLimited) => set({ isRateLimited: isLimited }),
  setGeneratedQuestions: (questions) => set({ generatedQuestions: questions }),

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
    set({ 
      user: null, 
      currentSession: null, 
      result: null, 
      currentQuestionIndex: 0,
      isRateLimited: false,
      retryAttempt: 0,
      retryDelaySec: 0,
      retryingMessage: '',
      generatedQuestions: []
    });
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
    
    const newSession: ReflectionSession = { ...currentSession };
    newSession.answers = [...newSession.answers, {
      questionId: String(currentQuestionIndex),
      question,
      answer,
      category,
      answeredAt: Date.now()
    }];
    newSession.draftAnswer = ''; // Clear draft answer upon successful question commit
    await saveSession(newSession);
    set({ currentSession: newSession, currentQuestionIndex: currentQuestionIndex + 1 });
  },

  saveDraftAnswer: async (draft) => {
    const { currentSession } = get();
    if (!currentSession) return;
    const updated: ReflectionSession = { ...currentSession, draftAnswer: draft };
    await saveSession(updated);
    set({ currentSession: updated });
  },

  skipQuestion: async (question, category) => {
    await get().submitAnswer('', question, category);
  },

  triggerAnalysis: async () => {
    const { currentSession, user, analysisStep } = get();
    if (!currentSession || !user) return;
    if (analysisStep !== 'idle') return;
    
    set({ analysisStep: 'scanning', analysisProgress: 10, retryAttempt: 0, retryDelaySec: 0, retryingMessage: '' });
    
    let attempts = 0;
    const maxAttempts = 5;
    let delay = 2000;
    let analysisData = null;

    while (attempts < maxAttempts) {
      try {
        analysisData = await generateAnalysis(
          currentSession.answers, 
          currentSession.id, 
          user.uid,
          (step, progress) => {
            // Only update step and progress if we are not actively inside a retrying delay block 
            if (get().analysisStep !== 'retrying') {
              set({ analysisStep: step, analysisProgress: progress });
            }
          }
        );
        break; // Successfully got analysis data!
      } catch (err: any) {
        attempts++;
        const isRateLimit = err?.message?.includes("429") || 
                            err?.message?.toLowerCase().includes("quota") || 
                            err?.message?.toLowerCase().includes("exhausted") ||
                            err?.message?.toLowerCase().includes("rate limit");
        
        if (isRateLimit && attempts < maxAttempts) {
          const delaySec = Math.ceil(delay / 1000);
          set({ 
            analysisStep: 'retrying', 
            retryAttempt: attempts,
            retryDelaySec: delaySec,
            isRateLimited: true,
            retryingMessage: `AI overloaded. Initiating backoff retry ${attempts}/${maxAttempts - 1}.`
          });
          
          for (let sec = delaySec; sec > 0; sec--) {
            if (get().analysisStep !== 'retrying') break;
            set({ 
              retryDelaySec: sec,
              retryingMessage: `AI overloaded. Initiating backoff retry ${attempts}/${maxAttempts - 1}. Estimated wait: ${sec}s...`
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          delay *= 2; // Exponential growth
        } else {
          console.error(err);
          set({ analysisStep: 'idle', retryAttempt: 0, retryDelaySec: 0, retryingMessage: '' });
          throw err;
        }
      }
    }
    
    if (!analysisData) {
      throw new Error("Unable to complete analysis after multiple backoff attempts.");
    }
    
    try {
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
        isSessionComplete: true,
        retryAttempt: 0,
        retryDelaySec: 0,
        retryingMessage: ''
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
      activeView: 'overview',
      isRateLimited: false,
      retryAttempt: 0,
      retryDelaySec: 0,
      retryingMessage: '',
      generatedQuestions: []
    });
  }
}));
