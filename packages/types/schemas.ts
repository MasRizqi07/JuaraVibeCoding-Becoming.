import { z } from "zod";

// Reflection Answer Schema
export const ReflectionAnswerSchema = z.object({
  questionId: z.string().min(1).max(100),
  question: z.string().min(1).max(500),
  answer: z.string().min(0).max(3000),
  category: z.string().max(100).optional().nullable(),
  answeredAt: z.number().int().positive(),
});

// Analyze Body Schema
export const AnalyzeBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
  answers: z.array(ReflectionAnswerSchema).min(1).max(20),
}).strict();

// Question Body Schema
export const QuestionBodySchema = z.object({
  previousAnswers: z.array(ReflectionAnswerSchema).min(1).max(10),
  category: z.string().min(1).max(100),
  userId: z.string().min(1).max(128),
}).strict();

// Potential Radar Schema
export const PotentialRadarSchema = z.object({
  discipline: z.number().int().min(0).max(100),
  consistency: z.number().int().min(0).max(100),
  adaptability: z.number().int().min(0).max(100),
  resilience: z.number().int().min(0).max(100),
  execution: z.number().int().min(0).max(100),
  aiEraReadiness: z.number().int().min(0).max(100),
});

// Identity Analysis Schema
export const IdentityAnalysisSchema = z.object({
  strengths: z.array(z.string().min(1)).min(1).max(10),
  blindSpots: z.array(z.string().min(1)).min(1).max(10),
  emotionalPattern: z.string().min(1).max(1000),
  learningStyle: z.string().min(1).max(500),
  coreIdentityArchetype: z.string().min(1).max(200),
  archetypeDescription: z.string().min(1).max(2000),
});

// Future Projection Schema
export const FutureProjectionSchema = z.object({
  type: z.enum(["stagnation", "evolution", "drifting", "becoming"]),
  title: z.string().min(1).max(200),
  narrative: z.string().min(1).max(5000),
  keyOutcomes: z.array(z.string().min(1)).min(1).max(10),
  emotionalTone: z.string().min(1).max(200),
  sixMonths: z.string().min(1).max(1000),
  oneYear: z.string().min(1).max(1000),
  fiveYears: z.string().min(1).max(1000),
});

// Regret Prediction Schema
export const RegretPredictionSchema = z.object({
  topRegrets: z.array(z.string().min(1)).min(1).max(10),
  regretNarrative: z.string().min(1).max(2000),
  regretTrigger: z.string().min(1).max(1000),
});

// Future Letter Schema
export const FutureLetterSchema = z.object({
  fromName: z.string().min(1).max(100),
  toName: z.string().min(1).max(100),
  year: z.number().int().positive(),
  body: z.string().min(1).max(10000),
  signature: z.string().min(1).max(200),
});

// Habit Schema
export const HabitSchema = z.object({
  title: z.string().min(1).max(200),
  frequency: z.string().min(1).max(50),
  duration: z.string().min(1).max(100),
  impact: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
});

// Roadmap Item Schema
export const RoadmapItemSchema = z.object({
  phase: z.string().min(1).max(200),
  focus: z.string().min(1).max(500),
  milestones: z.array(z.string().min(1)).min(1).max(10),
});

// Transformation Plan Schema
export const TransformationPlanSchema = z.object({
  weeklyHabits: z.array(HabitSchema).min(1).max(20),
  learningRoadmap: z.array(RoadmapItemSchema).min(1).max(10),
  antiProcrastinationProtocol: z.array(z.string()).min(1).max(20),
  focusKeyword: z.string().min(1).max(100),
});

// Share Card Schema
export const ShareCardSchema = z.object({
  archetype: z.string().min(1).max(200),
  potentialScore: z.number().int().min(0).max(100),
  aiReadiness: z.number().int().min(0).max(100),
  disciplineLevel: z.string().min(1).max(50),
  growthPotential: z.string().min(1).max(50),
  tagline: z.string().min(1).max(500),
});

// Section Summaries Schema
export const SectionSummariesSchema = z.object({
  overview: z.string().min(1).max(500),
  futures: z.string().min(1).max(500),
  identity: z.string().min(1).max(500),
  letter: z.string().min(1).max(500),
  plan: z.string().min(1).max(500),
  share: z.string().min(1).max(500),
});

// Becoming Result Schema
export const BecomingResultSchema = z.object({
  schemaVersion: z.number().int().positive(),
  sessionId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
  identityAnalysis: IdentityAnalysisSchema,
  potentialRadar: PotentialRadarSchema,
  futureA: FutureProjectionSchema,
  futureB: FutureProjectionSchema,
  regretPrediction: RegretPredictionSchema,
  futureLetter: FutureLetterSchema,
  transformationPlan: TransformationPlanSchema,
  shareCard: ShareCardSchema,
  sectionSummaries: SectionSummariesSchema,
  generatedAt: z.number().int().positive().optional(),
});
