# Becoming. — Comprehensive Quality Assurance & Test Case Suite

This suite contains diagnostic test plans, unit specifications, integration scenarios, and edge-case assertions designed to keep **Becoming.** resilient, performant, and reliable under any network conditions.

---

## 1. Test Architecture Matrix

```
                        ┌─────────────────────────────────┐
                        │     [BECOMING. TESTS MATRIX]    │
                        └────────────────┬────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
[ Unit Tests ]                 [ Integration Tests ]              [ UI / Canvas Tests ]
- Fallback Heuristics          - API: POST /api/analyze           - Debounced Canvas Resize
- Metric Seed Math             - Rate-Limit Handshakes            - Touch Target Tap Size
- Zod Schema Sanitizers        - Firebase Auth State Locks        - PDF Asset Extraction
```

---

## 2. Unit Testing: Fallback Logic Compiler (`compileGracefulFallback`)

These tests assert that when connectivity to the Google Gemini endpoint is delayed or offline, the backup heuristic compiler executes deterministically.

### Test Code (Jest / TS)

```typescript
// tests/unit/fallbackCompiler.test.ts
import { compileGracefulFallback } from "../../server";

describe("Graceful Heuristic Fallback Strategy Check", () => {
  const mockAnswerSet = [
    {
      questionId: "q1",
      question: "What is your main daily ritual?",
      answer: "I struggle to wake up on time and rarely review goals daily.",
      category: "discipline",
      answeredAt: Date.now()
    },
    {
      questionId: "q2",
      question: "Describe your experience with change.",
      answer: "I am flexible and can pivot fast when projects shift.",
      category: "adaptability",
      answeredAt: Date.now()
    }
  ];

  test("should compile reproducible potential scores seeded off answer text length", () => {
    const session = {
      sessionId: "test-sess-1",
      userId: "user-123",
      answers: mockAnswerSet
    };

    const resultA = compileGracefulFallback(session);
    const resultB = compileGracefulFallback(session);

    // Seed math must be perfectly deterministic for identical strings
    expect(resultA.potentialRadar.discipline).toBe(resultB.potentialRadar.discipline);
    expect(resultA.potentialRadar.adaptability).toBe(resultB.potentialRadar.adaptability);
    
    // Discipline must adjust based on string lengths
    expect(resultA.potentialRadar.discipline).toBeGreaterThanOrEqual(50);
    expect(resultA.potentialRadar.discipline).toBeLessThanOrEqual(95);
  });

  test("should correctly boost adaptability score if answer text contains trigger words", () => {
    const defaultSession = {
      sessionId: "sess-def",
      userId: "user-123",
      answers: [{ questionId: "1", question: "Change?", answer: "Unsure.", answeredAt: Date.now() }]
    };

    const highAdaptabilitySession = {
      sessionId: "sess-adapt",
      userId: "user-123",
      answers: [{ questionId: "1", question: "Change?", answer: "I thrive when things change rapidly.", answeredAt: Date.now() }]
    };

    const resultDefault = compileGracefulFallback(defaultSession);
    const resultAdaptive = compileGracefulFallback(highAdaptabilitySession);

    // 'change' trigger in highAdaptabilitySession triggers a +15 score modifier
    expect(resultAdaptive.potentialRadar.adaptability).toBeGreaterThan(resultDefault.potentialRadar.adaptability);
  });
});
```

---

## 3. Integration Testing: API Core Routing

Focuses on validating payload boundaries, headers, rate limits, and endpoint proxy resolution on Port `3000`.

### HTTP Request Sandbox Definitions

#### 1. Success Path Case: Standard JSON Delivery
* **Endpoint**: `POST /api/gemini/analyze`
* **Assert Status**: `200 OK`
* **Expected Payload**: Matches the unified `BecomingResult` schema containing fully-formed radar metrics, future dual-projection narratives, weekly habit sequences, and a retro share-card branding slogan.

#### 2. Input Validation Protection: Empty Answer Array
* **Endpoint**: `POST /api/gemini/analyze`
* **Assert Status**: `400 Bad Request`
* **Expected Error Object**:
  ```json
  {
    "success": false,
    "error": "Validation failed: answers array must contain at least 1 entry."
  }
  ```

#### 3. Security Check: Block Attempted Key Spoofing
* **Endpoint**: `POST /api/gemini/analyze`
* **Inject Header**: `'X-Gemini-Key-Override': 'MALICIOUS_STRING'`
* **Assert Status**: `400 Bad Request` (or standard `200 OK` returning fallback heuristics without permitting external injection, securing internal tokens).

---

## 4. UI / Front-end Interactive Testing (Testing-Library / Playwright)

Verifies the fluid layout and interaction states of our custom, vector-rendered canvas system.

### Debounced ResizeObserver Verification

```typescript
// src/app/(app)/results/components/OverviewPanel.test.tsx
import { render, screen, act } from "@testing-library/react";
import OverviewPanel from "./OverviewPanel";

jest.mock("../../../../store/useBecomingStore", () => ({
  useBecomingStore: () => ({
    result: {
      potentialRadar: { discipline: 80, consistency: 75, adaptability: 90, resilience: 85, execution: 70, aiEraReadiness: 95 },
      // ...other mock properties
    },
    user: { uid: "user-123" }
  })
}));

describe("OverviewPanel Responsive Layout Checks", () => {
  test("should clamp canvas dimensions to adaptive tablet grid on container scale-downs", async () => {
    const { container } = render(<OverviewPanel />);
    const canvas = container.querySelector("#overview-radar") as HTMLCanvasElement;
    
    expect(canvas).toBeInTheDocument();
    
    // Simulate container ResizeObserver trigger with tablet width
    act(() => {
      const resizeCallback = (global as any).ResizeObserverMockCallback;
      if (resizeCallback) {
        resizeCallback([{
          contentRect: { width: 350, height: 300 }
        }]);
      }
    });

    // Dimensions clamp calculation: Math.max(280, Math.min(420, 350 - 48)) = 302
    // Height aspect: 302 * (36 / 42) = 259
    expect(canvas.width).toBe(302);
    expect(canvas.height).toBe(259);
  });
});
```

---

## 5. Security & Permission Tests: Firestore Security Controls

Specifies checking criteria applied on Firestore databases using the Firebase Emulator suite.

1. **Unauthenticated Read Exclusion**:
   - *Scenario*: Anonymous user queries `/users/user-123/results/study-abc`.
   - *Assertion*: Expected `403 Permission Denied` (or standard emulator denial).
2. **Strict Document Isolation Owner Check**:
   - *Scenario*: Authenticated User `A` attempts to save study outcomes to path `/users/UserB/results/study-xxx`.
   - *Assertion*: Denied. Requests write targets must match the logged-in request scope (`request.auth.uid == userId`).
