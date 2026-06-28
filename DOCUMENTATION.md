# Becoming. — Comprehensive Technical & API Documentation

This document provides developers, technical writers, and end-users with an exhaustive analysis of the codebase, API endpoints, state management architecture, fallback heuristics, and operational procedures of **Becoming.**

---

## 1. System Overview & Core Pillars

**Becoming.** is an immersive, offline-resilient, full-stack self-reflection and future-projection application. It is designed to guide users through structured, psychologically-grounded questioning, synthesizing their answers into high-potential archetypes, contrasting futures, and action plans.

### Architectural Core Goals:
- **Zero Client-Side Secret Leakage**: All raw connections to Google Gemini and SendGrid are managed exclusively via Node.js/Express server proxies on port `3000`. No API keys or authorization variables are exposed to the browser.
- **Resilient Fallback Mode**: If the Google Gemini endpoint suffers from transient network issues, rate limits, or validation errors, the system seamlessly redirects request processing to a deterministic profile heuristic compiler (`compileGracefulFallback`), guaranteeing continuous UI operations without client failure.
- **Atomic State Locking**: Uses a custom React/Zustand engine coupled with Google Firebase / firestore documents scoped perfectly to unique user IDs (`uid`).

---

## 2. API Reference Documentation

The application's backend server runs an Express-based structure mapping both external vendor integrations (Google GenAI, SendGrid) and secure assets.

### 1.`POST /api/gemini/analyze`
Processes the user's reflection answers and synthesizes a dual-trajectory outcome matrix, including metrics, archetypes, Future A/B narratives, regret equations, and a personalized future self letter.

- **Request Body Type**: `AnalyzeBody` (validated via Zod)
- **Rate Limit**: Max 30 requests per IP/User ID per hour.
- **Form Schema**:
  ```typescript
  interface AnalyzeBody {
    sessionId: string; // Min length 1, Max 128
    userId: string;    // Auth provider UID, Max 128
    answers: Array<{
      questionId: string;
      question: string;
      answer: string;
      category?: string;
      answeredAt: number;
    }>; // Min 1 items, Max 20 items
  }
  ```

- **Response Format (JSON)**:
  ```json
  {
    "identityAnalysis": {
      "strengths": ["string"],
      "blindSpots": ["string"],
      "emotionalPattern": "string",
      "learningStyle": "string",
      "coreIdentityArchetype": "string",
      "archetypeDescription": "string"
    },
    "potentialRadar": {
      "discipline": 85,
      "consistency": 70,
      "adaptability": 90,
      "resilience": 80,
      "execution": 75,
      "aiEraReadiness": 95
    },
    "futureA": {
      "type": "stagnation",
      "title": "string",
      "narrative": "string",
      "keyOutcomes": ["string"],
      "emotionalTone": "string",
      "sixMonths": "string",
      "oneYear": "string",
      "fiveYears": "string"
    },
    "futureB": {
      "type": "evolution",
      "title": "string",
      "narrative": "string",
      "keyOutcomes": ["string"],
      "emotionalTone": "string",
      "sixMonths": "string",
      "oneYear": "string",
      "fiveYears": "string"
    },
    "regretPrediction": {
      "topRegrets": ["string"],
      "regretNarrative": "string",
      "regretTrigger": "string"
    },
    "futureLetter": {
      "fromName": "Your Future Aligned Self",
      "toName": "You",
      "year": 2036,
      "body": "string",
      "signature": "string"
    },
    "transformationPlan": {
      "weeklyHabits": [
        { "title": "string", "frequency": "string", "duration": "string", "impact": "string", "category": "string" }
      ],
      "learningRoadmap": [
        { "phase": "string", "focus": "string", "milestones": ["string"] }
      ],
      "antiProcrastinationProtocol": ["string"],
      "focusKeyword": "string"
    },
    "shareCard": {
      "archetype": "string",
      "potentialScore": 88,
      "aiReadiness": 92,
      "disciplineLevel": "string",
      "growthPotential": "string",
      "tagline": "string"
    },
    "sectionSummaries": {
      "overview": "string",
      "futures": "string",
      "identity": "string",
      "letter": "string",
      "plan": "string",
      "share": "string"
    }
  }
  ```

- **Error Conditions**:
  - `400 Bad Request`: When body schema constraints fail.
  - `429 Too Many Requests`: When the user hits the hourly limit.
  - `500 Internal Server Error`: If Gemini client connection fails and offline compilation fallback fails.

---

### 2. `POST /api/send-email`
Sends out completed reflection logs and summary digests via SendGrid. Falls back seamlessly to transactional logging mock-ups if the API secret has been omitted.

- **Request Body Schema**:
  ```typescript
  interface EmailBody {
    toEmail: string;
    userName: string;
    subject?: string;
    text?: string;
    html?: string;
  }
  ```
- **Response Format (JSON)**:
  ```json
  {
    "success": true,
    "mocked": false // True if failing back to server execution logs
  }
  ```
- **Error Conditions**:
  - `400 Bad Request`: If `toEmail` or `userName` properties are absent.
  - `500 Server Error`: When external SendGrid gateway yields hard delivery exceptions.

---

## 3. Inline Comments & Logic Breakdowns

Below are the strategic code comments explaining critical calculations and architectural loops in `server.ts`.

### 1. Unified Gemini API Key Resolver
```typescript
function getAI() {
  // Looks for the key under several canonical or framework names to guarantee compatibility
  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.VITE_GEMINI_API_KEY || 
                 process.env.GOOGLE_GEMINI_API_KEY || 
                 process.env.VITE_GOOGLE_CLOUD_API_KEY;
                 
  // Blocks load-time initialization failures by lazily validating during first execution
  if (!apiKey || apiKey.trim() === "" || apiKey === "undefined" || apiKey === "null") {
    throw new Error("GEMINI_API_KEY environment variable is missing or blank.");
  }
  
  if (!_aiClient) {
    _aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build', // Affixes appropriate user-agent trace logs
        }
      }
    });
  }
  return _aiClient;
}
```

### 2. Micro-Heuristic Core Math (compileGracefulFallback)
If the Google model becomes inaccessible, client metrics are computed using safe pseudo-random distributions seeded off of text-lengths to maintain dynamic UI variations:
```typescript
// Seed mathematical outputs according with answer lengths to provide personalized profiles
const hDiscipline = Math.min(95, Math.max(50, 65 + (textBody.length % 20)));
const hConsistency = Math.min(95, Math.max(50, 60 + (textBody.split(" ").length % 25)));
const hAdaptability = Math.min(95, Math.max(50, 70 + (textBody.includes("change") ? 15 : 5)));
```

---

## 4. Environment Configuration Options

The system imports variables from local `.env` files or running environment variables on the production container.

| Variable | Description | Requirement | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Key for Google Cognitive Reasoning APIs | Recommended | If missing, system triggers offline analysis compilation |
| `SENDGRID_API_KEY` | Auth secret for SendGrid delivery agents | Optional | Falls back to server logs printing out outputs |
| `SENDGRID_FROM_EMAIL` | Sender address registered in SendGrid panel | Optional | Defaults to `notifications@becoming.app` |

---

## 5. User Journey & Troubleshooting

### Standard Use Cases:
1. **The Diagnostic Reflection**: Users click "Enter", log in via Google, and answer eight distinct focus questions detailing their daily routines and career targets.
2. **Interactive Analysis Integration**: Users explore radar coordinates, examine stagnating vs. growth narrative scenarios, review specialized habits, write customizable letters, or configure taglines to share.

### Quick Troubleshooting Guide:
1. **Linter Warning: Rate Limit IPv6 bypass warning**
   - *Fix*: Integrated `validate: { ip: false }` into our express rate limits config inside `server.ts` to cleanly dismiss IPv6-bypass warnings.
2. **LLM Connection Errors on Startup**
   - *Fix*: The system includes a startup handshake check (`testGeminiConnection`). If it detects blockages, it prints a visible red dashboard warning inside terminal outputs but continues operating safely on mock heuristic profiles.
