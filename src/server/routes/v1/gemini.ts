import { Router, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { AuthenticatedRequest } from "../../middleware/auth";
import { userRateLimiter } from "../../middleware/rateLimit";
import { config } from "../../config/index";
import { logEvent } from "../../utils/logger";
import { addAnalysisJob, clientRegistry } from "../../queue/analysisQueue";
import { authMiddleware } from "../../middleware/auth";
import { z } from "zod";

const router = Router();
const GEMINI_MODEL = "gemini-2.0-flash";

// ─── Zod Body Validation Schemas ─────────────────────────────────────────────
const ReflectionAnswerSchema = z.object({
  questionId: z.string().min(1).max(100),
  question:   z.string().min(1).max(500),
  answer:     z.string().min(0).max(3000),
  category:   z.string().max(100).optional().nullable(),
  answeredAt: z.number().int().positive(),
});

const AnalyzeBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  userId:    z.string().min(1).max(128),
  answers:   z.array(ReflectionAnswerSchema).min(1).max(20),
}).strict();

// Simple validation helper
function validateBody(schema: z.ZodTypeAny) {
  return (req: any, res: Response, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: result.error.issues.map(i => ({
          field: i.path.join("."),
          message: i.message
        }))
      });
    }
    req.body = result.data;
    next();
  };
}

// Lazy Initialize Gemini
let _aiClient: GoogleGenAI | null = null;
function getAI() {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  if (!_aiClient) {
    _aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  }
  return _aiClient;
}

/**
 * POST /api/v1/gemini/analyze
 * Enqueues the introspective analysis task onto BullMQ / Memory Queue
 */
router.post(
  "/analyze",
  authMiddleware,
  userRateLimiter,
  validateBody(AnalyzeBodySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, userId, answers } = req.body;
    
    try {
      logEvent({
        level: "info",
        message: `[V1 Gemini Route] Received analysis request for session ${sessionId}`,
        userId,
        path: req.path,
      });

      // Submit into Redis/BullMQ or clean local async background processor
      const jobId = await addAnalysisJob({
        sessionId,
        userId,
        answers,
        promptVersion: "1.0.0"
      });

      res.status(202).json({
        success: true,
        message: "Analysis job enqueued successfully.",
        sessionId,
        jobId
      });
    } catch (err: any) {
      logEvent({
        level: "error",
        message: `[V1 Gemini Route Error] Failed to launch job: ${err.message}`,
        userId,
        path: req.path,
      });
      res.status(500).json({ error: "Failed to queue analysis task." });
    }
  }
);

/**
 * GET /api/v1/gemini/jobs/:sessionId
 * Establishes an SSE (Server-Sent Events) live subscription to process updates
 * and streams compiled results directly to the browser view on completion.
 */
router.get("/jobs/:sessionId", (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Keep stream persistent

  logEvent({
    level: "info",
    message: `[V1 SSE Jobs] Subscribing client for session events: ${sessionId}`
  });

  // Save the response reference in registry
  clientRegistry.set(sessionId, res);

  // Send initial pending state handshake
  res.write(`event: status\ndata: ${JSON.stringify({ status: "processing", progress: 25 })}\n\n`);

  req.on("close", () => {
    logEvent({
      level: "info",
      message: `[V1 SSE Jobs] Client disconnect for session: ${sessionId}`
    });
    clientRegistry.delete(sessionId);
  });
});

/**
 * POST /api/v1/gemini/follow-up
 */
router.post("/follow-up", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    const { previousAnswers, questionIndex, count = 1 } = req.body;
    
    if (count > 1) {
      const prompt = `
Based on these previous answers from the user: ${JSON.stringify(previousAnswers)},
generate a list of exactly ${count} progressive, emotionally resonant follow-up reflection questions starting from question index #${questionIndex + 1}.
Each question should feel like a wise, empathetic friend is asking it.
Return ONLY a JSON object with schema: { "questions": [ { "question": "string", "category": "string" } ] }
`;
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    category: { type: Type.STRING }
                  },
                  required: ["question", "category"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      let text = response.text || "";
      text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      res.json(JSON.parse(text));
    } else {
      const prompt = `
Based on these previous answers: ${JSON.stringify(previousAnswers)},
generate the next most emotionally resonant reflection question for question #${questionIndex + 1}.
The question should feel like a wise, empathetic friend is asking it.
Return ONLY a JSON object: { "question": "string", "category": "string" }
`;
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["question", "category"]
          }
        }
      });

      let text = response.text || "";
      text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      res.json(JSON.parse(text));
    }
  } catch (err: any) {
    logEvent({
      level: "warn",
      message: `[V1 Follow-Up Error] Falling back: ${err.message}`
    });
    // Hardcoded fallback questions
    const index = req.body.questionIndex || 5;
    const backupQuestions = [
      { question: "What is the single most persistent illusion you keep telling yourself about your habits?", category: "illusion" },
      { question: "If you could look at yourself through the eyes of someone who deeply believes in you, what is the first thing they would tell you to change?", category: "perspective" },
      { question: "What is a major choice you deferred recently, and what is the real name of the fear that caused you to defer it?", category: "fear" }
    ];
    if (req.body.count && req.body.count > 1) {
      res.json({ questions: backupQuestions.slice(0, req.body.count) });
    } else {
      res.json(backupQuestions[(index - 5) % backupQuestions.length] || backupQuestions[0]);
    }
  }
});

/**
 * POST /api/v1/gemini/explain
 */
router.post("/explain", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    const { item, type, context } = req.body;
    const prompt = `
You are an insight generator. The user has the core archetype "${context}".
They have a ${type === "strength" ? "genuine strength" : "self-sabotage pattern"}: "${item}".
Provide a short, punchy, 2-line explanation and actionable advice for this specific trait.
Return ONLY the text. Do not use markdown or quotes.
`;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.7 }
    });
    res.json({ explanation: response.text?.trim() || "Explanation not available." });
  } catch (err: any) {
    logEvent({
      level: "warn",
      message: `[V1 Explain Error] Falling back: ${err.message}`
    });
    const { item, type, context } = req.body;
    const prefix = type === "strength" ? "As a genuine strength," : "As an active self-sabotage pattern,";
    res.json({
      explanation: `${prefix} for archetypes aligned with "${context || "The Catalyst"}", "${item || "this trajectory trait"}" represents a major pivotal lever. Focus on translating this prompt awareness into micro physical actions.`
    });
  }
});

/**
 * POST /api/v1/gemini/taglines
 */
router.post("/taglines", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ai = getAI();
    const { archetype } = req.body;
    const prompt = `
Generate 3 short, punchy (1 sentence each) alternative taglines for the archetype "${archetype}".
They should be emotional and impactful.
Return a JSON array of strings: ["tagline 1", "tagline 2", "tagline 3"].`;
    
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    let text = response.text || "";
    text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    res.json({ taglines: JSON.parse(text) });
  } catch (err: any) {
    logEvent({
      level: "warn",
      message: `[V1 Taglines Error] Falling back: ${err.message}`
    });
    const { archetype } = req.body;
    res.json({
      taglines: [
        `Awakening the silent architect within ${archetype || "The Catalyst"}.`,
        "Breaking free from stagnant comfort loops to claim a customized legacy.",
        "Transforming daily internal resistance into creative propellant."
      ]
    });
  }
});

export default router;
