import { ReflectionAnswer, BecomingResult } from "../types/becoming";
import { auth } from "./firebase";
import { useBecomingStore } from "../store/useBecomingStore";

/**
 * Retreives the active user's ID token from Firebase Auth securely.
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    return "";
  }
  return await user.getIdToken(true);
}

/**
 * Centralized interceptor for API calls that automatically detects service rate limit status
 * code 429 and updates the global isRateLimited state securely.
 */
async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.status === 429) {
      useBecomingStore.getState().setRateLimited(true);
    }
    return response;
  } catch (err: any) {
    const msg = err?.message || "";
    const isRateLimit = msg.includes("429") || 
                        msg.toLowerCase().includes("quota") || 
                        msg.toLowerCase().includes("exhausted") || 
                        msg.toLowerCase().includes("rate limit");
    if (isRateLimit) {
      useBecomingStore.getState().setRateLimited(true);
    }
    throw err;
  }
}

/**
 * Initiates the multi-phase async analysis job queue on the server and streams
 * live pipeline progress via Server-Sent Events (SSE).
 */
export async function generateAnalysis(
  answers: ReflectionAnswer[],
  sessionId: string,
  userId: string,
  onProgress?: (step: 'scanning' | 'projecting' | 'generating' | 'complete', progress: number) => void
): Promise<Omit<BecomingResult, 'sessionId' | 'userId' | 'generatedAt'>> {
  const token = await getAuthToken();

  // 1. Queue the analysis task via POST using apiFetch interceptor
  const response = await apiFetch("/api/v1/gemini/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ answers, sessionId, userId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Failed to initiate analysis job (HTTP ${response.status})`);
  }

  // 2. Establish server connection stream (SSE) to track real-time queue processor state
  return new Promise((resolve, reject) => {
    // Pass authentication token via query parameters as standard EventSource doesn't support custom headers
    const eventSource = new EventSource(`/api/v1/gemini/jobs/${sessionId}?token=${token}`);

    eventSource.addEventListener("status", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "failed") {
          eventSource.close();
          const errorMsg = data.error || "";
          const isRateLimit = errorMsg.includes("429") || 
                              errorMsg.toLowerCase().includes("quota") || 
                              errorMsg.toLowerCase().includes("exhausted") || 
                              errorMsg.toLowerCase().includes("rate limit");
          if (isRateLimit) {
            useBecomingStore.getState().setRateLimited(true);
          }
          reject(new Error(errorMsg || "Analysis job failed on processing server queue."));
          return;
        }

        if (data.status) {
          let step: 'scanning' | 'projecting' | 'generating' | 'complete' = 'scanning';
          if (data.progress >= 70) step = 'generating';
          else if (data.progress >= 40) step = 'projecting';
          
          if (onProgress) {
            onProgress(step, data.progress);
          }
        }
      } catch (e) {
        // Silent catch JSON parsing issues
      }
    });

    eventSource.addEventListener("result", (event: MessageEvent) => {
      try {
        const resultData = JSON.parse(event.data);
        eventSource.close();
        resolve(resultData);
      } catch (err) {
        eventSource.close();
        reject(new Error("Failed to parse final compiled result from state stream."));
      }
    });

    eventSource.addEventListener("error", (err) => {
      eventSource.close();
      reject(new Error("Lost connection with the analysis processing server."));
    });
  });
}

/**
 * Fetches the next emotionally resonant follow-up question
 */
export async function generateFollowUpQuestion(
  previousAnswers: ReflectionAnswer[],
  questionIndex: number,
  userId: string
): Promise<{ question: string; category: string }> {
  const token = await getAuthToken();
  const response = await apiFetch("/api/v1/gemini/follow-up", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ previousAnswers, questionIndex, userId, count: 1 })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches progressive, emotionally resonant follow-up questions in a single bundled payload request
 */
export async function generateFollowUpQuestions(
  previousAnswers: ReflectionAnswer[],
  questionIndex: number,
  userId: string,
  count: number = 3
): Promise<{ questions: { question: string; category: string }[] }> {
  const token = await getAuthToken();
  const response = await apiFetch("/api/v1/gemini/follow-up", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ previousAnswers, questionIndex, userId, count })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Explains a specific psychological insight strength or blindspot
 */
export async function generateExplanation(
  item: string,
  type: "strength" | "blindSpot",
  context: string
): Promise<string> {
  const token = await getAuthToken();
  const response = await apiFetch("/api/v1/gemini/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ item, type, context })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `HTTP error ${response.status}`);
  }

  const data = await response.json();
  return data.explanation;
}

/**
 * Generates alternative taglines for active archetypes
 */
export async function generateTaglines(archetype: string): Promise<string[]> {
  const token = await getAuthToken();
  const response = await apiFetch("/api/v1/gemini/taglines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ archetype })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `HTTP error ${response.status}`);
  }

  const data = await response.json();
  return data.taglines;
}

export default generateAnalysis;
