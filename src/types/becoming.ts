/**
 * @file becoming.ts
 * @description Comprehensive core schema and TypeScript interface definitions for Becoming.
 * Defines structure, ranges, schemas, and descriptors for self-reflection results,
 * AI identity analysis, and dynamic 12-week evolutionary roadmaps.
 */

/**
 * Represents the authenticated user profile details persisted from firestore/auth.
 */
export interface UserProfile {
  /** The unique identifier assigned to the user by Firebase Authentication. */
  uid: string;
  /** The full display name from Google or customized identity controls. */
  displayName: string;
  /** Primary contact and notification email used to send aligned future digests. */
  email: string;
  /** Optional URL of the authenticated profile photo. Null if omitted. */
  photoURL: string | null;
  /** Milliseconds epoch timestamp representing when the account was first created. */
  createdAt: number;
}

/**
 * Captures an individual question query and corresponding unvarnished answer response string.
 */
export interface ReflectionAnswer {
  /** Anchor lookup key linking the answer back to its original prompt block. */
  questionId: string;
  /** The exact prompt text posed to the user during the diagnostic walkthrough. */
  question: string;
  /** The user's typed qualitative input. Seeding math relies on the density of this field. */
  answer: string;
  /** Structural category mapping e.g., 'discipline', 'vision', 'mindset'. */
  category?: string;
  /** Epoch timestamp representing exactly when the user submitted their answer. */
  answeredAt: number;
}

/**
 * Holds progress tracking states for an active alignment diagnostic session.
 */
export interface ReflectionSession {
  /** Auto-generated unique identification hash representing the active diagnostic process. */
  id: string;
  /** The user ID initiating and editing details inside this analysis document. */
  userId: string;
  /** List of reflection answers logged throughout the user walk-through. */
  answers: ReflectionAnswer[];
  /** Operational state: drafting, calculating/synthesizing, or ready for results dashboard. */
  status: 'in_progress' | 'analyzing' | 'complete';
  /** Epoch millisecond record marking when this reflection list was started. */
  createdAt: number;
  /** Optional epoch millisecond record marking final transition to complete status. */
  completedAt?: number;
  /** Periodic unsaved text draft representing the currently typed response to prevent refresh loss. */
  draftAnswer?: string;
}

/**
 * Dual prospective trajectories mapping contrasting pathways of human alignment.
 */
export interface FutureProjection {
  /** Scenario category: 'drifting' (complacent, static) or 'becoming' (aligned, proactive). */
  type: 'drifting' | 'becoming';
  /** Compelling thematic title framing the respective career or personal projection. */
  title: string;
  /** Immersive narrative detailing daily habits, professional environments, and long-term trajectory. */
  narrative: string;
  /** High-value strategic takeaways or distinct warnings reflecting this pathway. */
  keyOutcomes: string[];
  /** Underlying psychological tone of the projection (e.g. "complacency and regret"). */
  emotionalTone: string;
  /** Micro milestone mapping where the user lands under this paradigm after 180 days. */
  sixMonths: string;
  /** Macro milestone detailing trajectory status after 365 days of active or inactive drift. */
  oneYear: string;
  /** Ultimate destination mapping long-term transformation or compounding loss after 5 years. */
  fiveYears: string;
}

/**
 * Psychological analysis compiling underlying personality and habit traits.
 */
export interface IdentityAnalysis {
  /** Top three distinct strengths derived through text-mining and cognitive models. */
  strengths: string[];
  /** Core self-sabotaging constructs, blind spots, or cognitive distortions. */
  blindSpots: string[];
  /** Detailed assessment outlining primary cognitive and emotional responses to stress or uncertainty. */
  emotionalPattern: string;
  /** Single-sentence summary describing the optimal method for acquiring complex modern skills. */
  learningStyle: string;
  /** Structural role identifier or title clarifying the user's primary behavior archetype. */
  coreIdentityArchetype: string;
  /** Deep qualitative exploration mapping the strengths and shortfalls of the archetype. */
  archetypeDescription: string;
}

/**
 * Numerical scores populating the central interactive radar tracking quadrant.
 * All integers are clamped strictly between [0, 100].
 */
export interface PotentialRadar {
  /** Core metrics assessing structured focus, task completion, and execution rules. Range: 0-100. */
  discipline: number;
  /** Tracks consistent effort across recurring long-term timeframes. Range: 0-100. */
  consistency: number;
  /** Evaluates reactive flexibility when navigating fast-changing external conditions. Range: 0-100. */
  adaptability: number;
  /** Measures recovery velocity when answering adverse setbacks or internal blockages. Range: 0-100. */
  resilience: number;
  /** Evaluates conversion of high-level intentions into tangible outcomes. Range: 0-100. */
  execution: number;
  /** Captures tech fluid orientation and prompt engineering fluency. Range: 0-100. */
  aiEraReadiness: number;
}

/**
 * Detailed regrets models pointing out key areas of self-actualization failure.
 */
export interface RegretPrediction {
  /** Top three concrete regrets likely to occur if the user defaults to drifting. */
  topRegrets: string[];
  /** Evocative prediction narrative written to stir immediate correction. */
  regretNarrative: string;
  /** The singular root cause or trigger leading to systemic alignment failures. */
  regretTrigger: string;
}

/**
 * A highly personalized communication from the user's aligned future counterpart.
 */
export interface FutureLetter {
  /** Addressed from (e.g. "Your Aligned Future Counterpart"). */
  fromName: string;
  /** Addressed to the recipient's present state name. */
  toName: string;
  /** target dispatch year. Typically calculated as current calendar year + 10. */
  year: number;
  /** Immersive narrative reflecting on high-leverage adjustments the user initiated today. */
  body: string;
  /** Personalized encouragement lock-up or signature. */
  signature: string;
}

/**
 * Actionable micro-habits populated inside week-by-week evolutionary guidelines.
 */
export interface Habit {
  /** Clear, actionable title describing the programmatic micro-task. */
  title: string;
  /** Recurrent frequency pacing: daily loops or weekly review milestones. */
  frequency: 'daily' | 'weekly';
  /** Estimated time required per session (e.g., "15 minutes", "45 minutes"). */
  duration: string;
  /** Estimated compound impact weighting: high-leverage vs low-overhead maintenance. */
  impact: 'high' | 'medium' | 'low';
  /** Target zone mapping: mindset, learning, health, relationships, or career. */
  category: 'mindset' | 'learning' | 'health' | 'relationships' | 'career';
}

/**
 * Targeted learning schedules outlining technical milestones.
 */
export interface RoadmapItem {
  /** Time frame bounds of the phase (e.g. "Weeks 1-4: Foundation Setup"). */
  phase: string;
  /** Primary conceptual skill priority or focal area of study. */
  focus: string;
  /** Definitive tangible targets pointing out completion of the phase. */
  milestones: string[];
}

/**
 * The ultimate blueprint containing strategic guidelines to execute alignment goals.
 */
export interface TransformationPlan {
  /** Specific daily/weekly items to maintain behavioral velocity. */
  weeklyHabits: Habit[];
  /** Sequential, structured step-by-step technological study roadmap. */
  learningRoadmap: RoadmapItem[];
  /** Specific cognitive guidelines designed to short-circuit instant gratification blocks. */
  antiProcrastinationProtocol: string[];
  /** Single core focal metric or anchor word directing the user's focus. */
  focusKeyword: string;
}

/**
 * Brief overview profiles summarizing metrics for quick-sharing or presentation cards.
 */
export interface ShareCard {
  /** The identified archetypal title. */
  archetype: string;
  /** Weighted global index tracking active analytical performance. Range: 0-100. */
  potentialScore: number;
  /** Estimated degree of synergy with automation frameworks. Range: 0-100. */
  aiReadiness: number;
  /** Qualitative categorical ranking representing discipline capacity. */
  disciplineLevel: "Low" | "Developing" | "High" | "Elite";
  /** Categorical indicator denoting growth trajectory momentum. */
  growthPotential: "Dormant" | "Emerging" | "Accelerating" | "Unstoppable";
  /** Single concise, high-impact branding sentence capturing the transformation's theme. */
  tagline: string;
}

/**
 * Brief overview summaries describing each section in the results dashboard.
 */
export interface SectionSummaries {
  /** Description summarizing central performance indexes and identity metrics. */
  overview: string;
  /** Summation comparing future scenarios (stagnating vs becoming trajectories). */
  futures: string;
  /** Key points from identity strengths, blind spots, and learning archetypes. */
  identity: string;
  /** Core themes discussed inside the letter from the future. */
  letter: string;
  /** Summary outlining the weekly habit metrics and studies. */
  plan: string;
  /** Card tagline summary. */
  share: string;
}

/**
 * The consolidated model encapsulating completed diagnostic outputs and strategic audits.
 */
export interface BecomingResult {
  /** Incremental schema version identifier tracking model updates. */
  schemaVersion: number;
  /** The original session identification hash which initiated the analysis loop. */
  sessionId: string;
  /** Owner user ID mapped back to firebase-blueprint data boundaries. */
  userId: string;
  /** Core psychological profiles, blind spots, and diagnostic metrics. */
  identityAnalysis: IdentityAnalysis;
  /** Absolute metrics mapped on the interactive radar chart. */
  potentialRadar: PotentialRadar;
  /** The drifting projection outlining outcomes if alignment is ignored. */
  futureA: FutureProjection;
  /** The becoming trajectory illustrating high-velocity actualization. */
  futureB: FutureProjection;
  /** Regrets details highlighting systemic failures to steer actualization. */
  regretPrediction: RegretPrediction;
  /** Personal message dispatched from the user's legacy state. */
  futureLetter: FutureLetter;
  /** Step-by-step study roadmaps and dynamic anti-procrastination loops. */
  transformationPlan: TransformationPlan;
  /** Card profiles suited for portfolio views or sharing pipelines. */
  shareCard: ShareCard;
  /** Overview descriptions explaining separate section goals. */
  sectionSummaries: SectionSummaries;
  /** Milliseconds epoch record marking when the study document was compiled. */
  generatedAt: number;
}
