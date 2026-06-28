import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import sgMail from "@sendgrid/mail";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Remediated imports
import { authMiddleware, AuthenticatedRequest } from "./src/server/middleware/auth";
import { userRateLimiter } from "./src/server/middleware/rateLimit";
import { sanitizeUserInput } from "./src/server/utils/sanitize";
import { compileGracefulFallback } from "./src/server/utils/fallbackCompiler";
import healthRouter from "./src/server/routes/health";
import geminiV1Router from "./src/server/routes/v1/gemini";
import pdfRouter from "./src/server/routes/pdf";
import { config } from "./src/server/config/index";

const GEMINI_MODEL = "gemini-2.0-flash";

// ─── Validation schemas ──────────────────────────────────────────────────────

const ReflectionAnswerSchema = z.object({
  questionId: z.string().min(1).max(100),
  question:   z.string().min(1).max(500),
  answer:     z.string().min(0).max(3000), // Note: skipped questions might have empty answers
  category:   z.string().max(100).optional().nullable(),
  answeredAt: z.number().int().positive(),
});

const AnalyzeBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  userId:    z.string().min(1).max(128),
  answers:   z.array(ReflectionAnswerSchema).min(1).max(20),
}).strict();

const QuestionBodySchema = z.object({
  previousAnswers: z.array(ReflectionAnswerSchema).min(1).max(10),
  category:        z.string().min(1).max(100),
  userId:          z.string().min(1).max(128),
}).strict();

// ─── Validation middleware factory ───────────────────────────────────────────

function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error:   'Invalid request body',
        details: result.error.issues.map(i => ({
          field:   i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

// ─── Rate limiters ────────────────────────────────────────────────────────────

const analyzeLimiter = rateLimit({
  windowMs:       60 * 60 * 1000,   // 1-hour window
  max:            30,                 // 30 analyze calls per user per hour
  keyGenerator:   (req) => req.body?.userId ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders:  false,
  validate: { ip: false },
  message: {
    error:      'Rate limit exceeded — too many analysis requests.',
    retryAfter: 3600,
  },
  handler: (req, res, _next, options) => {
    console.warn(`[RateLimit] analyze blocked: ${req.body?.userId ?? req.ip}`);
    res.status(429).json(options.message);
  },
});

const questionLimiter = rateLimit({
  windowMs:       10 * 60 * 1000,   // 10-minute window
  max:            100,                // 100 question calls per user per 10 minutes
  keyGenerator:   (req) => req.body?.userId ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders:  false,
  validate: { ip: false },
  message: {
    error: 'Rate limit exceeded — too many question requests.',
  },
});

// Lazy init SendGrid
let _sgClientInitialized = false;
let _sgClientAttempted = false;

function getSendGrid() {
  if (!_sgClientAttempted) {
    _sgClientAttempted = true;
    const key = process.env.SENDGRID_API_KEY;
    if (key && key.startsWith("SG.")) {
      sgMail.setApiKey(key);
      _sgClientInitialized = true;
    } else {
      console.warn("SendGrid API key is missing or invalid. Falling back to mock email mode.");
    }
  }
  return _sgClientInitialized ? sgMail : null;
}

// Lazy init Gemini
let _aiClient: GoogleGenAI | null = null;
function getAI() {
  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY environment variable is missing or blank. Please configure a valid GEMINI_API_KEY to enable full AI-assisted insight synthesis.");
  }
  if (!_aiClient) {
    _aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return _aiClient;
}

// Simple test to verify connection to the Gemini API upon server startup
async function testGeminiConnection() {
  try {
    const ai = getAI();
    console.log(`[Gemini Startup Check] Contacting model '${GEMINI_MODEL}'...`);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "Respond with only one word: Connected",
    });
    console.log(`\x1b[32m[Gemini Startup Check SUCCESS]\x1b[0m Gemini API handshaked successfully. Received response: "${response.text?.trim()}"`);
  } catch (err: any) {
    console.error("\n\x1b[31m======================================================================\x1b[0m");
    console.error(`\x1b[31m[Gemini Startup Check ERROR]\x1b[0m Failed to validate Gemini API key on startup!`);
    console.error(`Error message: ${err.message || err}`);
    console.error("\nPlease make sure that GEMINI_API_KEY is correctly set in your environment variables/secrets panel.");
    console.error("The system will continue running, but will fallback smoothly to local offline templates.");
    console.error("\x1b[31m======================================================================\x1b[0m\n");
  }
}

// Dynamic helpers and routing configurations

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);

  app.use(express.json());

  // Mount clean remediated routes
  app.use(healthRouter);
  app.use("/api/v1/gemini", geminiV1Router);
  app.use("/api/v1/pdf", pdfRouter);

  // API routing for sending emails
  app.post("/api/send-email", async (req, res) => {
    const { toEmail, userName, subject, text, html } = req.body;
    if (!toEmail || !userName) {
      return res.status(400).json({ error: "Missing toEmail or userName" });
    }

    const sg = getSendGrid();
    if (!sg) {
      // Mock mode if api key is missing
      console.log(`[SendGrid Mock] Sending email to ${toEmail}`);
      await new Promise((r) => setTimeout(r, 1000));
      return res.json({ success: true, mocked: true });
    }

    try {
      const msg = {
        to: toEmail,
        from: process.env.SENDGRID_FROM_EMAIL || "notifications@becoming.app",
        subject: subject || "Your Becoming. Analysis is Ready",
        text: text || "Your deep reflection analysis is complete.",
        html: html || `<p>Hello ${userName},</p><p>Your deep reflection analysis is complete. Log back in to view your trajectory.</p>`,
      };
      await sg.send(msg);
      res.json({ success: true, mocked: false });
    } catch (err: any) {
      console.error("[SendGrid Error]", err?.response?.body || err);
      res.status(500).json({ error: "Failed to send email via SendGrid" });
    }
  });

  // Proxy routes for Gemini API
  app.post("/api/gemini/analyze", authMiddleware, analyzeLimiter, validate(AnalyzeBodySchema), async (req: AuthenticatedRequest, res) => {
    let userId = "anonymous";
    try {
      if (req.decodedUser?.uid) {
        userId = req.decodedUser.uid;
      } else if (req.body.userId) {
        userId = req.body.userId;
      }
      const ai = getAI();
      const { answers, sessionId } = req.body;

      // Sanitize inputs
      const sanitizedAnswers = answers.map((a: any) => ({
        ...a,
        answer: sanitizeUserInput(a.answer || "")
      }));

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

      let text = response.text || '';
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(text);
      parsed.schemaVersion = 1;
      res.json(parsed);
    } catch (err: any) {
      console.warn("[Gemini API Error] Falling back to pre-compiled self-projection blueprint:", err.message || err);
      try {
        const { answers, sessionId } = req.body;
        const backupResult = compileGracefulFallback(answers || [], sessionId || "sess_legacy", userId);
        res.json(backupResult);
      } catch (fallbackErr: any) {
        console.error("Critical fallback compilation failure:", fallbackErr);
        res.status(500).json({ error: err.message || "Failed to process reflection answers." });
      }
    }
  });

  app.post("/api/gemini/follow-up", authMiddleware, questionLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const ai = getAI();
      const { previousAnswers, questionIndex } = req.body;
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
      let text = response.text || '';
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.warn("[Gemini API Error] Falling back to pre-defined reflection template question:", err.message || err);
      const { questionIndex } = req.body;
      const index = questionIndex || 5;
      const backupQuestions = [
        { question: "What is the single most persistent illusion you keep telling yourself about your current habits?", category: "illusion" },
        { question: "If you could look at yourself through the eyes of someone who deeply believes in you, what is the first thing they would tell you to change?", category: "perspective" },
        { question: "What is a major choice you deferred recently, and what is the real name of the fear that caused you to defer it?", category: "fear" }
      ];
      const selected = backupQuestions[(index - 5) % backupQuestions.length] || backupQuestions[0];
      res.json(selected);
    }
  });

  app.post("/api/gemini/question", authMiddleware, questionLimiter, validate(QuestionBodySchema), async (req: AuthenticatedRequest, res) => {
    try {
      const ai = getAI();
      const { previousAnswers, category } = req.body;
      const prompt = `
Based on these previous answers in the category ${category}: ${JSON.stringify(previousAnswers)},
generate the next most emotionally resonant reflection question.
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
      let text = response.text || '';
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.warn("[Gemini API Error] Falling back to pre-defined reflection template question:", err.message || err);
      const backupQuestions = [
        { question: "What is the single most persistent illusion you keep telling yourself about your current habits?", category: "illusion" },
        { question: "If you could look at yourself through the eyes of someone who deeply believes in you, what is the first thing they would tell you to change?", category: "perspective" },
        { question: "What is a major choice you deferred recently, and what is the real name of the fear that caused you to defer it?", category: "fear" }
      ];
      res.json(backupQuestions[0]);
    }
  });

  app.post("/api/gemini/explain", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const ai = getAI();
      const { item, type, context } = req.body;
      const prompt = `
You are an insight generator. The user has the core archetype "${context}".
They have a ${type === 'strength' ? 'genuine strength' : 'self-sabotage pattern'}: "${item}".
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
      console.warn("[Gemini API Error] Falling back to modular explain pattern assembler:", err.message || err);
      const { item, type, context } = req.body;
      const prefix = type === 'strength' ? "As a genuine strength," : "As an active self-sabotage pattern,";
      res.json({
        explanation: `${prefix} for archetypes aligned with "${context || 'The Catalyst'}", "${item || 'this trajectory trait'}" represents a major pivotal lever. Focus on translating this prompt awareness into micro physical actions.`
      });
    }
  });

  app.post("/api/gemini/taglines", authMiddleware, async (req: AuthenticatedRequest, res) => {
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
      let text = response.text || '';
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      res.json({ taglines: JSON.parse(text) });
    } catch (err: any) {
      console.warn("[Gemini API Error] Falling back to pre-crafted archetype taglines:", err.message || err);
      const { archetype } = req.body;
      res.json({
        taglines: [
          `Awakening the silent architect within ${archetype || 'The Catalyst'}.`,
          "Breaking free from stagnant comfort loops to claim a customized legacy.",
          "Transforming daily internal resistance into creative propellant."
        ]
      });
    }
  });

  app.get("/api/gemini/health", async (req, res) => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: "Respond with only one word: Connected",
      });
      res.json({
        status: "healthy",
        apiResponse: response.text?.trim() || "Connected",
        envKeyConfigured: true
      });
    } catch (err: any) {
      console.warn("[Gemini API Health Check Failed]", err.message || err);
      res.json({
        status: "unhealthy",
        error: err.message || "Failed to establish a valid connection with the model",
        envKeyConfigured: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.VITE_GOOGLE_CLOUD_API_KEY)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Run the startup integration test to verify the Gemini API connections
    testGeminiConnection();
  });
}

startServer();
