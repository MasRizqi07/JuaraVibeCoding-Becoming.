# Becoming. — Professional Systems Debugging & Diagnostics Guide

This manual serves as the definitive reference to diagnose, isolate, and resolve operational issues within the full-stack **Becoming.** system. It provides engineering teams with structured workflows to handle transient network errors, API throttles, and cross-origin state synchronization.

---

## 1. Quick Diagnostic Tree & Common Scenarios

```
                          [ SYSTEM ALIGNMENT HEALTHCHECK ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [ API / Handshake Alert ]                       [ Client / UI Degradation ]
                 │                                               │
  ┌──────────────┴──────────────┐                 ┌──────────────┴──────────────┐
  ▼                             ▼                 ▼                             ▼
Missing Key              Rate Limit          Local Storage                State Sync
(Section 2.1)           (Section 2.3)        (Section 3.1)               (Section 3.2)
```

---

## 2. API & Server-Side Debugging Protocols

### 2.1 `GEMINI_API_KEY` Resolution & Handshaking Failures
* **Symptom**: During server init, log output shows:
  ```bash
  [Gemini Startup Check FAILED] Gemini API handshake encountered issues.
  ```
* **Root Cause**:
  The environment lacks a valid `GEMINI_API_KEY`. The platform's lazyinitializer checks for key presence in sequential order (`process.env.GEMINI_API_KEY`, `process.env.VITE_GEMINI_API_KEY`, etc.).
* **Debugging Strategy**:
  1. Verify the key isn't formatted with trailing quotes or `undefined` string literals.
  2. Test raw connectivity with direct curl request using a temporary key:
     ```bash
     curl -H "Content-Type: application/json" \
          -d '{"contents":[{"parts":[{"text":"Say connected"}]}]}' \
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}"
     ```
* **Resolution**: Ensure the `.env` file contains clean, non-quoted entries. The backend seamlessly falls back to local micro-heuristics compiled via `compileGracefulFallback` if connections fail, so visual charts continue rendering without interruption.

---

### 2.2 Rate limits and Dual-Trajectory Processing Alerts
* **Symptom**: Client console displays `429 Too Many Requests` or rate-limit messages during high-volume analysis.
* **Root Cause**:
  The Express backend limits requests to prevent API abuse. These rate-limit bounds are defined under two independent keys inside `server.ts` (designed for analysis logic proxying and custom query queues).
* **Code Implementation Check**:
  Both the analysis proxy and question rate-limit loops leverage standard `express-rate-limit` configs with client-side IP or User ID key mapping.
  ```typescript
  // Configured with validate to prevent cloud run IPv4/6 validation warnings:
  validate: { ip: false }
  ```
* **Resolution / Tuning**:
  Under staging configurations, you can increase or bypass rate limits based on authenticated `uid` profiles by adjusting properties in `server.ts`.

---

### 2.3 SendGrid Mail Gateway Timed out / Offline Mocks
* **Symptom**: Post logs show mail delivery failures with diagnostic response stating `"SendGrid credentials are missing"`.
* **Root Cause**:
  Missing `SENDGRID_API_KEY` configuration. 
* **Self-Healing Loop**:
  The mailer includes a graceful proxy fallback that diverts SMTP connections to a local console printout if keys are omitted:
  ```typescript
  if (!process.env.SENDGRID_API_KEY) {
    console.log("[MAILER MOCK] Outputting letter to console print logs:", { to, subject });
    return res.json({ success: true, mocked: true });
  }
  ```

---

## 3. Client-Side & React Diagnostics

### 3.1 Radar Canvas Layout Glitches on Viewport Changes
* **Symptom**: Intersecting lines, truncated margins, or blurry vector indicators inside the interactive potential radar mapping canvas.
* **Root Cause**:
  Relying on initial rendering bounds without observing frame modifications.
* **Debugging Strategy**:
  Verify that the `OverviewPanel.tsx` integrates the reactive debounced `ResizeObserver` setup.
* **Resolution Code Pattern**:
  Ensure container resizing triggers standard dimension-clamped bounds properly:
  ```typescript
  const computedWidth = Math.max(280, Math.min(420, width - 48));
  const computedHeight = Math.round(computedWidth * (36 / 42));
  ```
  This guarantees layout fluidity across mobile, tablet, and widescreen layouts while avoiding excessive frame recalculations.

---

### 3.2 State Synchronicities / Auth Session Purging
* **Symptom**: Interactive results or logs are lost or resetting on state refreshes.
* **Root Cause**:
  Session documents lack durable sync configurations against Firestore.
* **Mitigation Protocol**:
  1. Confirm that `firebase-blueprint.json` has provisioned persistent cloud paths in the database.
  2. Inspect state management store in `src/store/useBecomingStore.ts` to ensure session records persist successfully.
