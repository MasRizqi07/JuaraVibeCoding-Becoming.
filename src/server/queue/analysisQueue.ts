import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { GoogleGenAI, Type } from "@google/genai";
import admin from "firebase-admin";
import { config } from "../config/index";
import { logEvent } from "../utils/logger";
import { sanitizeUserInput } from "../utils/sanitize";
import { compileGracefulFallback } from "../utils/fallbackCompiler";
import { validateAndNormalizeAIOutput } from "../utils/validateAIOutput";

// ─── Constants ───────────────────────────────────────────────────────────────
const QUEUE_NAME = "analysis-queue";
const GEMINI_MODEL = "gemini-2.0-flash";

// ─── Active Connections & State ──────────────────────────────────────────────
let redisConnection: Redis | null = null;
let analysisQueue: Queue | null = null;
let queueEvents: QueueEvents | null = null;
let bullWorker: Worker | null = null;
let isRedisActive = false;

// Dynamic SSE/Websocket clients registry to push results on run completions
export const clientRegistry = new Map<string, any>(); // Map sessionId -> SSE response reference

// Initialize Redis and BullMQ lazily with connection bounds
try {
  redisConnection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 2000,
    retryStrategy(times) {
      // Stop retrying quickly to fallback clean and avoid flooding logs
      if (times > 1) {
        return null;
      }
      return 1000; // Wait 1 second before retrying once
    }
  });

  redisConnection.on("connect", () => {
    isRedisActive = true;
    logEvent({
      level: "info",
      message: `[BullMQ Queue] Connected to Redis. Initializing distributed queues and worker threads...`
    });
    initializeBullMQ();
  });

  redisConnection.on("error", (err) => {
    isRedisActive = false;
    logEvent({
      level: "warn",
      message: `[BullMQ Queue] Redis connection error: ${err.message}. Enabling transparent in-memory local queue processor fallback.`
    });
  });
} catch (err: any) {
  logEvent({
    level: "warn",
    message: `[BullMQ Queue] Lazy init failed: ${err.message}. Using inline asynchronous pipeline.`
  });
}

function initializeBullMQ() {
  if (!redisConnection) return;
  
  analysisQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      }
    }
  });

  queueEvents = new QueueEvents(QUEUE_NAME, { connection: redisConnection as any });

  // Dedicated worker configuration with robust concurrency control
  bullWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      logEvent({
        level: "info",
        message: `[BullWorker] Commencing job processing for job id: ${job.id}`,
        userId: job.data.userId,
      });
      return await executeAnalysisTask(job.data);
    },
    {
      connection: redisConnection as any,
      concurrency: 5,
    }
  );

  bullWorker.on("completed", (job, result) => {
    logEvent({
      level: "info",
      message: `[BullWorker SUCCESS] Job ${job.id} completed successfully for user ${job.data.userId}`
    });
    // Stream results directly to the active client SSE session for native low latency updates
    if (job?.data?.sessionId) {
      pushResultToClient(job.data.sessionId, "complete", result);
    }
  });

  bullWorker.on("failed", (job, err) => {
    logEvent({
      level: "error",
      message: `[BullWorker FAILURE] Job ${job?.id} failed: ${err.message}`,
      meta: { err }
    });
    if (job?.data?.sessionId) {
      pushResultToClient(job.data.sessionId, "failed", { error: err.message });
    }
  });
}

// ─── Inline Asynchronous Processor Fallback ──────────────────────────────────
/**
 * In memory fallback processor when Redis is offline.
 * Executes on next tick, ensuring non-blocking operations.
 */
async function triggerInMemoryProcessing(jobData: any) {
  logEvent({
    level: "info",
    message: `[InMemory Queue] Simulating queue delays for session: ${jobData.sessionId}`
  });
  
  // Stagger execution slightly to emulate asynchronous pipeline perfectly
  setImmediate(async () => {
    try {
      const result = await executeAnalysisTask(jobData);
      // Dispatch SSE to active consumer if connected
      pushResultToClient(jobData.sessionId, "complete", result);
    } catch (err: any) {
      logEvent({
        level: "error",
        message: `[InMemory Queue FAILED] Error processing in memory: ${err.message}`
      });
      pushResultToClient(jobData.sessionId, "failed", { error: err.message });
    }
  });
}

// ─── Core Compilation & API Handlers (Shared Worker) ─────────────────────────
async function executeAnalysisTask(jobData: any): Promise<any> {
  const { sessionId, userId, answers } = jobData;
  
  // 1. Sanitize and structure user answers to protect against prompt injection
  const sanitizedAnswers = answers.map((a: any) => ({
    ...a,
    answer: sanitizeUserInput(a.answer || "")
  }));

  const firestoreDb = admin.firestore();

  // Lazy Initialize Gemini
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    logEvent({
      level: "warn",
      message: "No GEMINI_API_KEY available. Skipping Gemini API and generating high-contrast offline fallback."
    });
    const fallbackVal = compileGracefulFallback(answers, sessionId, userId);
    await saveResultToFirestore(firestoreDb, sessionId, userId, fallbackVal);
    return fallbackVal;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });

  const prompt = `
You are an AI psychologist, future strategist, and life coach.
Based on the following deeply personal reflection answers from a young person (18–27),
generate a comprehensive self-projection analysis.

USER REFLECTION ANSWERS:
${sanitizedAnswers.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}

CRITICAL RULES:
- Be emotionally specific, NOT generic
- Reference actual things the user said in their answers
- Write like a gifted author, not a corporate chatbot
- Future A must feel real and sobering, not mean
- Future B must feel achievable and inspiring, not fantasy
- The letter must feel like it was written BY this specific person TO themselves
- Provide a short 1-3 sentence high-level summary for each main section so the user can quickly grasp the key insights.
`;

  // Function to execute Gemini model call
  const executeCall = async () => {
    logEvent({
      level: "info",
      message: `[Gemini Model Call] Contacting Gemini for user: ${userId}, Model: ${GEMINI_MODEL}`,
      userId,
    });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identityAnalysis: { type: Type.OBJECT, properties: { strengths: { type: Type.ARRAY, items: { type: Type.STRING } }, blindSpots: { type: Type.ARRAY, items: { type: Type.STRING } }, emotionalPattern: { type: Type.STRING }, learningStyle: { type: Type.STRING }, coreIdentityArchetype: { type: Type.STRING }, archetypeDescription: { type: Type.STRING } }, required: ["strengths", "blindSpots", "emotionalPattern", "learningStyle", "coreIdentityArchetype", "archetypeDescription"] },
            potentialRadar: { type: Type.OBJECT, properties: { discipline: { type: Type.INTEGER }, consistency: { type: Type.INTEGER }, adaptability: { type: Type.INTEGER }, resilience: { type: Type.INTEGER }, execution: { type: Type.INTEGER }, aiEraReadiness: { type: Type.INTEGER } }, required: ["discipline", "consistency", "adaptability", "resilience", "execution", "aiEraReadiness"] },
            futureA: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, title: { type: Type.STRING }, narrative: { type: Type.STRING }, keyOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } }, emotionalTone: { type: Type.STRING }, sixMonths: { type: Type.STRING }, oneYear: { type: Type.STRING }, fiveYears: { type: Type.STRING } }, required: ["type", "title", "narrative", "keyOutcomes", "emotionalTone", "sixMonths", "oneYear", "fiveYears"] },
            futureB: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, title: { type: Type.STRING }, narrative: { type: Type.STRING }, keyOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } }, emotionalTone: { type: Type.STRING }, sixMonths: { type: Type.STRING }, oneYear: { type: Type.STRING }, fiveYears: { type: Type.STRING } }, required: ["type", "title", "narrative", "keyOutcomes", "emotionalTone", "sixMonths", "oneYear", "fiveYears"] },
            regretPrediction: { type: Type.OBJECT, properties: { topRegrets: { type: Type.ARRAY, items: { type: Type.STRING } }, regretNarrative: { type: Type.STRING }, regretTrigger: { type: Type.STRING } }, required: ["topRegrets", "regretNarrative", "regretTrigger"] },
            futureLetter: { type: Type.OBJECT, properties: { fromName: { type: Type.STRING }, toName: { type: Type.STRING }, year: { type: Type.INTEGER }, body: { type: Type.STRING }, signature: { type: Type.STRING } }, required: ["fromName", "toName", "year", "body", "signature"] },
            transformationPlan: { type: Type.OBJECT, properties: { weeklyHabits: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, frequency: { type: Type.STRING }, duration: { type: Type.STRING }, impact: { type: Type.STRING }, category: { type: Type.STRING } }, required: ["title", "frequency", "duration", "impact", "category"] } }, learningRoadmap: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { phase: { type: Type.STRING }, focus: { type: Type.STRING }, milestones: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["phase", "focus", "milestones"] } }, antiProcrastinationProtocol: { type: Type.ARRAY, items: { type: Type.STRING } }, focusKeyword: { type: Type.STRING } }, required: ["weeklyHabits", "learningRoadmap", "antiProcrastinationProtocol", "focusKeyword"] },
            shareCard: { type: Type.OBJECT, properties: { archetype: { type: Type.STRING }, potentialScore: { type: Type.INTEGER }, aiReadiness: { type: Type.INTEGER }, disciplineLevel: { type: Type.STRING }, growthPotential: { type: Type.STRING }, tagline: { type: Type.STRING } }, required: ["archetype", "potentialScore", "aiReadiness", "disciplineLevel", "growthPotential", "tagline"] },
            sectionSummaries: { type: Type.OBJECT, properties: { overview: { type: Type.STRING }, futures: { type: Type.STRING }, identity: { type: Type.STRING }, letter: { type: Type.STRING }, plan: { type: Type.STRING }, share: { type: Type.STRING } }, required: ["overview", "futures", "identity", "letter", "plan", "share"] }
          },
          required: ["identityAnalysis", "potentialRadar", "futureA", "futureB", "regretPrediction", "futureLetter", "transformationPlan", "shareCard", "sectionSummaries"]
        }
      }
    });
    return response.text || "";
  };

  let initialJson = "";
  let initialCallSuccess = true;
  try {
    initialJson = await executeCall();
  } catch (err: any) {
    logEvent({
      level: "warn",
      message: `[Analysis Queue ERROR] Initial Gemini call failed with error: ${err.message}. Seamlessly switching to local fallback compilation.`
    });
    initialCallSuccess = false;
  }

  const fallbackCompilerFn = () => compileGracefulFallback(answers, sessionId, userId);
  
  // 2. Validate Gemini Output against Zod schema and retry / compile fallback as container guard
  const validatedData = initialCallSuccess 
    ? await validateAndNormalizeAIOutput(initialJson, executeCall, fallbackCompilerFn)
    : fallbackCompilerFn();

  // 3. Save standard final compiled result into Firestore
  await saveResultToFirestore(firestoreDb, sessionId, userId, validatedData);

  // 4. Mark session as complete in Firestore
  await firestoreDb.collection("sessions").doc(sessionId).set({
    status: "complete",
    completedAt: Date.now()
  }, { merge: true });

  logEvent({
    level: "info",
    message: `[Analysis Queue COMPLETED] Successfully compiled and verified results for session: ${sessionId}`,
    userId
  });

  return validatedData;
}

async function saveResultToFirestore(db: any, sessionId: string, userId: string, resultData: any) {
  try {
    const docRef = db.collection("results").doc(sessionId);
    await docRef.set({
      ...resultData,
      sessionId,
      userId,
      generatedAt: Date.now()
    });
    logEvent({
      level: "info",
      message: `Stored result document for session: ${sessionId} in Firestore successfully`,
      userId
    });
  } catch (err: any) {
    logEvent({
      level: "error",
      message: `Failed to save result to Firestore for session ${sessionId}: ${err.message}`,
      userId
    });
  }
}

// Push SSE updates to subscribed client targets
function pushResultToClient(sessionId: string, status: string, payload: any) {
  const clientResponse = clientRegistry.get(sessionId);
  if (clientResponse) {
    clientResponse.write(`event: status\ndata: ${JSON.stringify({ status, progress: status === "complete" ? 100 : 50 })}\n\n`);
    if (status === "complete") {
      clientResponse.write(`event: result\ndata: ${JSON.stringify(payload)}\n\n`);
      clientResponse.write("event: end\ndata: {}\n\n");
      clientRegistry.delete(sessionId);
    }
  }
}

// ─── API / Event Functions ───────────────────────────────────────────────────
/**
 * Adds a new analysis job to the execution queue (either BullMQ or local memory queue).
 */
export async function addAnalysisJob(jobData: {
  sessionId: string;
  userId: string;
  answers: any[];
  promptVersion?: string;
}): Promise<string> {
  logEvent({
    level: "info",
    message: `[Add Queue Job] Registering analyze task for user: ${jobData.userId}`,
    userId: jobData.userId
  });

  if (isRedisActive && analysisQueue) {
    try {
      const job = await analysisQueue.add("ai-analysis", jobData, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 }
      });
      return job.id || "bull_job";
    } catch (err: any) {
      logEvent({
        level: "warn",
        message: `BullMQ insert threw error: ${err.message}. Defaulting to in-memory trigger.`
      });
    }
  }

  // Fallback to in-memory processing
  await triggerInMemoryProcessing(jobData);
  return "local_memory_job";
}

export default addAnalysisJob;
