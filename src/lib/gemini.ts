import { ReflectionAnswer, BecomingResult } from "../types/becoming";

export async function generateAnalysis(answers: ReflectionAnswer[]): Promise<Omit<BecomingResult, 'sessionId' | 'userId' | 'generatedAt'>> {
  const response = await fetch("/api/gemini/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ answers })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export async function generateFollowUpQuestion(previousAnswers: ReflectionAnswer[], questionIndex: number): Promise<{question: string, category: string}> {
  const response = await fetch("/api/gemini/follow-up", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ previousAnswers, questionIndex })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export async function generateExplanation(item: string, type: 'strength' | 'blindSpot', context: string): Promise<string> {
  const response = await fetch("/api/gemini/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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

export async function generateTaglines(archetype: string): Promise<string[]> {
  const response = await fetch("/api/gemini/taglines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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
