# Becoming. — Technical Architecture & Audit Blueprint

**Becoming.** is an introspective, full-stack AI-powered self-reflection and future-projection application. Built with a high-contrast cinematic visual aesthetic, the system guides users through deep, psychologically confronting prompts to structure an unvarnished audit of their core behaviors, active safe nets (drifting), and high-leverage growth trajectories (becoming).

This document serves as the absolute technical reference, database schema record, and system architecture blueprint for engineering audits, audits, and subsequent expansions.

---

## 🗺️ System Architecture & Data Flow

"Becoming." operates as a full-stack, secure, single-instance deployment utilizing a React 19 client tied to a Node.js/Express backend running on Cloud Run, backed by Google Firestore.

```
+---------------------------------------------------------------------------------+
|                               CLIENT-SIDE BROWSER                               |
|  +---------------------------------------------------------------------------+  |
|  |                             ZUSTAND STORE                                 |  |
|  |     [Session State] <===> [Auth Session] <===> [Generated AI Blueprint]   |  |
|  +---------+-------------------------+-----------------------+---------------+  |
|            |                         |                       |                  |
|            v (Auth & Query)          v (Saves/Reads)         v (PDF Report)     |
|    +---------------+         +---------------+       +---------------+          |
|    | Firebase Auth |         | Firestore DB  |       |     jsPDF     |          |
|    | (Google Auth) |         | (Collections) |       | (Client-side) |          |
|    +---------------+         +---------------+       +---------------+          |
+------------+-------------------------------------------------+------------------+
             |                                                 |
             | HTTPS API Calls (Proxy Requests)                 | HTTP Serving
             v                                                 v
+------------+-------------------------------------------------+------------------+
|                              NODE.JS BACKEND (CONTAINER)                        |
|  +---------------------------------------------------------------------------+  |
|  |                               EXPRESS ROUTER                              |  |
|  |   - GET /api/gemini/health                                                |  |
|  |   - POST /api/gemini/analyze (Double-Tiered Analysis Module)              |  |
|  |   - POST /api/gemini/question (Adaptive Prompt Synthesis)                 |  |
|  +---------+-----------------------------------------------------------------+  |
|            |                                                                    |
|            v (Service SDK Verification)                                         |
|    +---------------+                                                            |
|    | Google GenAI  | <=======================================> [Gemini API]     |
|    | SDK Client    |    (Model: gemini-2.0-flash)                               |
|    +---------------+                                                            |
+---------------------------------------------------------------------------------+
```

### Core Architecture Design Pillars:
1. **Zero Client-Side Secret Exposure:** All interaction loops with the Gemini API are proxied through server-side REST paths (`/api/gemini/*`). The API Token (`GEMINI_API_KEY`) is stored as an environment variable in the running container and is never shipped down to the user's browser.
2. **Double-Tiered Self-Correction / Resiliency Defaults:**
   - **Active Connection Handshaking:** During system startup (`server.ts` entry point), a connection verification loop (`testGeminiConnection`) attempts an immediate test call against `gemini-2.0-flash`.
   - **Automatic Local Projection Compilation:** If the Gemini API endpoints fail or rate-limits are reached, the API handlers automatically catch the error, write a log, and smoothly fallback to a complex, deterministic client profile compiler (`compileGracefulFallback`) using seed values loaded from the user's answers.
3. **No Direct WebSocket Monkey-Patching (HMR Safety):** The system completely bypasses noisy local websocket closures caused by isolated sandboxes (Vite) by disabling overlay alerts in the `vite.config.ts` system configuration while preserving standard file-matching hot reload controls.
4. **Offline Support and Persistent Collections:** All finalized analyses are saved directly to Firestore keyed by the individual’s `UID`. This preserves results permanently, bypassing repetitive LLM calls on subsequent visits.

---

## 📁 Project Directory & Web Structure

The codebase is organized into cleanly delineated directories, dividing UI layout models, system styling parameters, state providers, server operations, and type constraints:

```
.
├── .env                     # Local environment settings (Contains API secrets and DB links)
├── .env.example             # Template detailing environment parameters required for deployments
├── firestore.rules          # Production security constraints restricting unauthorized database reads
├── index.html               # Main single-spa document viewport container
├── metadata.json            # Deployment identifier and user-approved frame features
├── package.json             # Core dependency constraints, workspace scripts, and esbuild configs
├── server.ts                # Express backend configuration (HTTP routes, Vite middleware, startup tests)
├── tsconfig.json            # Strict TypeScript compilation presets
├── vite.config.ts           # Bundler engine parameters with HMR alert handling
│
└── src/
    ├── App.tsx              # Bootstraps client route controls, global providers, and layouts
    ├── index.css            # Entry style layout (Tailwind CSS, premium fonts, scrollbars, contrast resets)
    ├── main.tsx             # Standard React tree mounting injection script
    ├── types/
    │   └── becoming.ts      # Exhaustive TypeScript type definitions for the database and profiles
    │
    ├── store/
    │   └── useBecomingStore.ts # Central Zustand state engine (Firebase Auth & Firestore reads/writes)
    │
    ├── lib/
    │   ├── firebase.ts      # Initiates Firebase App instance & validates configuration variables
    │   └── firestore.ts     # Document writes/updates helper maps (Stores sessions and results)
    │
    ├── components/
    │   └── shared/
    │       ├── CanvasBackground.ts # High-contrast background with slow moving vector particles
    │       ├── GrainOverlay.tsx    # Low-opacity grain backdrop filter to simulate raw parchment textures
    │       ├── FeedbackModal.tsx   # Floating bug, concept, and system feedback submission dialog
    │       └── OnboardingTour.tsx  # Dynamic interactive guide utilizing drivers (driver.js integration)
    │
    └── app/
        ├── page.tsx         # Landing Screen: Sequential display headings with golden CTA action triggers
        ├── (auth)/
        │   └── signin/
        │       └── page.tsx # Authentication Gateway: Minimal card handling Google OAuth connections
        │
        └── (app)/
            ├── analyzing/
            │   └── page.tsx # Transition Engine: Sequential progress steps summarizing structural states
            ├── reflect/
            │   └── page.tsx # Reflection Portal: Adaptive multi-category flow (guided prompts & AI logic)
            └── results/
                ├── page.tsx # Dashboard Shell: Resolves full screen sidebars (desktop) and bottom sheets (mobile)
                └── components/
                    ├── FutureSplitPanel.tsx  # Projections panel (Stagnant trajectory vs Authentic actualization)
                    ├── IdentityPanel.tsx     # Strengths, self-deception blind spots, and behaviors breakdown
                    ├── LetterPanel.tsx       # Scrolling immersive future letter dispatch
                    ├── PlanPanel.tsx         # Weekly habit scheduler and procrastination safeguards
                    ├── SharePanel.tsx        # Card download panel targeting social networks
                    ├── PanelLoader.tsx       # Custom skeleton elements and soft loader loops
                    ├── SectionSummary.tsx    # Compact contextual system summaries
                    └── OverviewPanel.tsx     # The Visual Hub:
                                               # - SVG-rendered Radar Canvas representing capability dimensions
                                               # - Longitudinal session trend calculation with green/red indicator deltas
                                               # - Collapsable vertex details sidebar containing strategic task focuses
                                               # - Client-side high-fidelity multi-page PDF custom compiler (jsPDF)
```

---

## 🗄️ System Schemas & Type System

All system models are structured strictly inside `src/types/becoming.ts`:

### 1. User Profile Schema
```typescript
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: number;
}
```

### 2. Reflection Session Schema
```typescript
export interface ReflectionAnswer {
  questionId: string;
  question: string;
  answer: string;
  category?: string;
  answeredAt: number;
}

export interface ReflectionSession {
  id: string;
  userId: string;
  answers: ReflectionAnswer[];
  status: 'in_progress' | 'analyzing' | 'complete';
  createdAt: number;
  completedAt?: number;
}
```

### 3. Dimensional Radar Data
```typescript
export interface PotentialRadar {
  discipline: number;      // Metric mapping Focus & Ambition Boundaries
  consistency: number;     // Metric mapping Execution Cadence
  adaptability: number;    // Metric mapping Strategic Agility
  resilience: number;      // Metric mapping Pivoting Capability under Friction
  execution: number;       // Metric mapping Physical Output Conversion Rate
  aiEraReadiness: number;  // Metric mapping Digital Leverage & Multipliers 
}
```

### 4. Fully Synthesized AI Blueprint (`BecomingResult`)
The core object generated by Gemini and archived in Firestore under `/results/`:
```typescript
export interface FutureProjection {
  type: 'drifting' | 'becoming';
  title: string;
  narrative: string;
  keyOutcomes: string[];
  emotionalTone: string;
  sixMonths: string;
  oneYear: string;
  fiveYears: string;
}

export interface IdentityAnalysis {
  strengths: string[];
  blindSpots: string[];
  emotionalPattern: string;
  learningStyle: string;
  coreIdentityArchetype: string;
  archetypeDescription: string;
}

export interface RegretPrediction {
  topRegrets: string[];
  regretNarrative: string;
  regretTrigger: string;
}

export interface FutureLetter {
  fromName: string;
  toName: string;
  year: number;
  body: string;
  signature: string;
}

export interface Habit {
  title: string;
  frequency: 'daily' | 'weekly';
  duration: string;
  impact: 'high' | 'medium';
  category: 'mindset' | 'learning' | 'health' | 'relationships' | 'career';
}

export interface RoadmapItem {
  phase: string;
  focus: string;
  milestones: string[];
}

export interface TransformationPlan {
  weeklyHabits: Habit[];
  learningRoadmap: RoadmapItem[];
  antiProcrastinationProtocol: string[];
  focusKeyword: string;
}

export interface ShareCard {
  archetype: string;
  potentialScore: number;
  aiReadiness: number;
  disciplineLevel: string;
  growthPotential: string;
  tagline: string;
}

export interface SectionSummaries {
  overview: string;
  futures: string;
  identity: string;
  letter: string;
  plan: string;
  share: string;
}

export interface BecomingResult {
  sessionId: string;
  userId: string;
  identityAnalysis: IdentityAnalysis;
  potentialRadar: PotentialRadar;
  futureA: FutureProjection;
  futureB: FutureProjection;
  regretPrediction: RegretPrediction;
  futureLetter: FutureLetter;
  transformationPlan: TransformationPlan;
  shareCard: ShareCard;
  sectionSummaries?: SectionSummaries;
  generatedAt: number;
}
```

---

## 🔒 Security Configurations & Firestore Rules

All persistent data constraints are evaluated through Firestore's native engine utilizing rule constraints specified in `/firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Validate User Profiles
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Validate Question Sessions
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && (
        resource == null || resource.data.userId == request.auth.uid
      ) && (
        request.resource == null || request.resource.data.userId == request.auth.uid
      );
    }
    
    // Validate Synthesized Profiles
    match /results/{resultId} {
      allow read, write: if request.auth != null && (
        resource == null || resource.data.userId == request.auth.uid
      ) && (
        request.resource == null || request.resource.data.userId == request.auth.uid
      );
    }
  }
}
```

---

## 🛠️ Core Functional Modules

### A. The Interactive Radar Mapping Hub (`OverviewPanel`)
This panel serves as the primary visual system summary:
- **Canvas Math Engine:** Dynamically calculates spatial vertex targets on a polar rendering layout ($X = \text{centerX} + R \times \text{value} \times \cos(\theta)$, $Y = \text{centerY} + R \times \text{value} \times \sin(\theta)$ with scale adjustments).
- **Longitudinal Trend Tracking:** Performs mathematical comparisons between the user's active session and previous attempts in their Firestore catalog via `getUserResults(user.uid)`. Calculates accurate delta values, highlighting improvement indices in vibrant green (`#10B981`) and regression lines in crimson (`#EF4444`).
- **Collapsible Vertex Details Panel:** Moves away from cluttered visual overlays by dynamically responding to mouse colliders (18px radius targets over vertices). On focus, it opens an side drawer revealing:
  - Metric definition parameters.
  - Custom category details written dynamically from your scores.
  - Actionable tactical focuses to remove blockers immediately.

### B. High-Fidelity Client-Side Document Generator
To allow offline preservation, a highly elegant document compiler using `jsPDF` executes a multi-page design layout entirely inside the client’s browser:
- **Consistent Layout Frameworks:** Drawers precise hairline framing paths ($190 \times 277\text{mm}$) around each page, accompanied by a consistent design header block, clear category titles, branding, and page pagination numbers.
- **Dynamic Text Safe-Wrapping:** Passes highly dense narrative insights (e.g. Identity analysis, Strengths, Blind Spots, Habits, Future Letter) through splitting engines (`splitTextToSize`) to wrap line-heights dynamically and protect boundaries regardless of screens.
- **Embedded Visual Assets:** Converts active canvas dimensions from local DOM elements on the fly, rendering high-contrast PNG components and injecting them into the PDF layout securely.

### C. Gemini Core Engine Handshaking
- **Thematic Core Analytics:** Driven by `gemini-2.0-flash` utilizing structural JSON schemes. It dissects reflection answers, maps behavioral traits, compiles two divergent target dimensions, writes custom letters from the future, and constructs 12-week transformation protocols.
- **Adaptive Micro Questions:** The system utilizes intermediate real-time prompt feedback on adaptive inputs (Questions 6–8) dynamically generated based on previous inputs to bypass standard cookie-cutter tests.
- **Verification Protocols:** Features an active startup tester checking `gemini-2.0-flash` connection blocks. In the absence of available keys, this protocol logs clear actionable warning messages in the server command stream and activates offline modes seamlessly.

---

## ⚙️ Build System & Deployment Scripts

### 1. Script Configurations (`package.json`)
- **Development Server:** `npm run dev` — Compiles and executes script paths on the fly utilizing `tsx` pointing directly to `server.ts`.
- **System Production Builds:** `npm run build` — Combines two pipelines:
  1. Frontend compilation via `vite build` (outputs optimized files inside `/dist`).
  2. Server typescript transformation via `esbuild server.ts --bundle --platform=node --format=cjs` into a self-contained CommonJS block (`/dist/server.cjs`) to resolve runtime relative path issues on remote nodes.
- **Production Boots:** `npm run start` — Boots the server instantly: `node dist/server.cjs`.

### 2. Required Setup Parameters (`.env`)
To run this application locally, ensure your `.env` contains:
```env
# Server Ingress Settings
PORT=3000
NODE_ENV=production

# Server AI Integration Key
GEMINI_API_KEY="your_api_key_here"

# Client Firebase Settings
VITE_FIREBASE_API_KEY="your_client_key"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```

---

## 🔍 Code Quality & Accessibility Compliance Check
The codebase complies with standard Web Content Accessibility Guidelines (WCAG 2.1 AA):
- **Gold Contrast Verification ($>= 4.5:1$):** Ensures readable text contrast on warm background surfaces.
- **Touch Target Density Boundaries:** Keeps interactive elements larger than 44x44px.
- **Vestibular Safe Settings:** Respects `prefers-reduced-motion` systems by disabling particle loops, canvas animations, and sliding fades.
