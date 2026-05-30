export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  createdAt: number
}

export interface ReflectionAnswer {
  questionId: string
  question: string
  answer: string
  category?: string
  answeredAt: number
}

export interface ReflectionSession {
  id: string
  userId: string
  answers: ReflectionAnswer[]
  status: 'in_progress' | 'analyzing' | 'complete'
  createdAt: number
  completedAt?: number
}

export interface FutureProjection {
  type: 'drifting' | 'becoming'
  title: string
  narrative: string           // 3-5 paragraphs, emotionally written
  keyOutcomes: string[]       // 4-6 bullet points
  emotionalTone: string       // e.g. "regret and stagnation" | "growth and fulfillment"
  sixMonths: string
  oneYear: string
  fiveYears: string
}

export interface IdentityAnalysis {
  strengths: string[]         // top 3 genuine strengths detected
  blindSpots: string[]        // top 3 self-sabotage patterns
  emotionalPattern: string    // 2-3 sentences
  learningStyle: string       // 1 sentence
  coreIdentityArchetype: string  // e.g. "The Hesitant Builder"
  archetypeDescription: string   // 2 sentences
}

export interface PotentialRadar {
  discipline: number          // 0-100
  consistency: number
  adaptability: number
  resilience: number
  execution: number
  aiEraReadiness: number
}

export interface RegretPrediction {
  topRegrets: string[]        // 3 regrets if nothing changes
  regretNarrative: string     // emotional paragraph
  regretTrigger: string       // the single root cause
}

export interface FutureLetter {
  fromName: string            // "Future [UserName]"
  toName: string              // "[UserName]"
  year: number                // current year + 5
  body: string                // 4-6 paragraphs, deeply personal letter
  signature: string           // e.g. "The version of you that made it."
}

export interface Habit {
  title: string
  frequency: 'daily' | 'weekly'
  duration: string            // e.g. "20 minutes"
  impact: 'high' | 'medium' | 'low'
  category: 'mindset' | 'learning' | 'health' | 'relationships' | 'career'
}

export interface RoadmapItem {
  phase: string               // e.g. "Month 1-2"
  focus: string
  milestones: string[]
}

export interface TransformationPlan {
  weeklyHabits: Habit[]
  learningRoadmap: RoadmapItem[]
  antiProcrastinationProtocol: string[]  // 3 specific tactics
  focusKeyword: string        // single word: e.g. "CONSISTENCY"
}

export interface ShareCard {
  archetype: string           // e.g. "The Hesitant Builder"
  potentialScore: number      // 0-100
  aiReadiness: number         // 0-100
  disciplineLevel: string     // "Low" | "Developing" | "High" | "Elite"
  growthPotential: string     // "Dormant" | "Emerging" | "Accelerating" | "Unstoppable"
  tagline: string             // 1 emotional sentence
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
  schemaVersion: number
  sessionId: string
  userId: string
  identityAnalysis: IdentityAnalysis
  potentialRadar: PotentialRadar
  futureA: FutureProjection   // Drifting
  futureB: FutureProjection   // Becoming
  regretPrediction: RegretPrediction
  futureLetter: FutureLetter
  transformationPlan: TransformationPlan
  shareCard: ShareCard
  sectionSummaries: SectionSummaries
  generatedAt: number
}
