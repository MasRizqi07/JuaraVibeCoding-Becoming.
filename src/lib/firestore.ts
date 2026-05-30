import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, ReflectionSession, BecomingResult } from '../types/becoming';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Data fetching helpers
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>) {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, { ...profile, uid, createdAt: Date.now() });
    } else {
      // Allow updates if needed
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSession(session: ReflectionSession) {
  const path = `sessions/${session.id}`;
  try {
    const docRef = doc(db, 'sessions', session.id);
    await setDoc(docRef, session, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveResult(result: BecomingResult) {
  const path = `results/${result.sessionId}`;
  try {
    const docRef = doc(db, 'results', result.sessionId);
    await setDoc(docRef, result, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function migrateResultSchema(result: any): BecomingResult {
  if (!result) return result;
  if (!result.schemaVersion || result.schemaVersion < 1) {
    result.schemaVersion = 1;
    if (!result.sectionSummaries) {
      result.sectionSummaries = {
        overview: "A synthesis of your core potential scores, radar capacities, and dynamic trajectory projections.",
        futures: "A direct split between stagnating in comfortable cycles versus choosing actualization.",
        identity: "An audit of your active strengths, unvarnished blind spots, and underlying emotional patterns.",
        letter: "A poetic, cinematic advice dispatched from your potential future self ten years out.",
        plan: "A customized weekly habit blueprint, learning phases, and anti-procrastination rules.",
        share: "A beautifully styled high-contrast summary block optimized for projection and community share."
      };
    }
  }
  return result as BecomingResult;
}

export async function getResult(sessionId: string): Promise<BecomingResult | null> {
  const path = `results/${sessionId}`;
  try {
    const docRef = doc(db, 'results', sessionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return migrateResultSchema(snap.data());
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function getUserSessions(userId: string): Promise<ReflectionSession[]> {
  const path = `sessions`;
  try {
    const q = query(collection(db, 'sessions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const sessions = snap.docs.map(doc => doc.data() as ReflectionSession);
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function getLatestIncompleteSession(userId: string): Promise<ReflectionSession | null> {
  try {
    const sessions = await getUserSessions(userId);
    const incomplete = sessions.filter(s => s.status === 'in_progress');
    if (incomplete.length > 0) {
      return incomplete[0];
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function submitFeedback(userId: string, content: string, type: 'bug' | 'suggestion' | 'general' = 'general') {
  const feedbackId = `${userId}_${Date.now()}`;
  const path = `feedback/${feedbackId}`;
  try {
    const docRef = doc(db, 'feedback', feedbackId);
    await setDoc(docRef, {
      userId,
      content,
      type,
      createdAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserResults(userId: string): Promise<BecomingResult[]> {
  const path = `results`;
  try {
    const q = query(collection(db, 'results'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => migrateResultSchema(doc.data()));
    return results.sort((a, b) => b.generatedAt - a.generatedAt);
  } catch (err) {
    console.error("Failed to fetch user results:", err);
    return [];
  }
}
