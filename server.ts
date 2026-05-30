import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import sgMail from "@sendgrid/mail";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

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
  max:            5,                  // 5 analyze calls per user per hour
  keyGenerator:   (req) => req.body?.userId ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders:  false,
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
  max:            20,                 // 20 question calls per user per 10 minutes
  keyGenerator:   (req) => req.body?.userId ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders:  false,
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "undefined" || apiKey === "null") {
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
    console.log("[Gemini Startup Check] Contacting model 'gemini-2.0-flash'...");
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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

// Robust mock analysis builder using actual user's answers in case API key is invalid/fails
function compileGracefulFallback(answers: any[]) {
  const getAns = (indices: number[]) => {
    for (const i of indices) {
      if (answers[i] && answers[i].answer) return answers[i].answer;
    }
    return "your silent aspiration";
  };

  const a0 = getAns([0]);
  const a1 = getAns([1]);
  const a3 = getAns([3]);
  const textBody = answers.map(a => a.answer || "").join(" ").toLowerCase();

  let archetype = "The Awakened Catalyst";
  let description = "You are motivated by an underlying seek for alignment, constantly balancing your present duties with authentic creative or functional ambitions.";
  let focusKeyword = "Authenticity";
  let tagline = "Harnessing friction to fuel self-transformation.";
  let disciplineLevel = "Developing drive";
  let growthPotential = "Significant expansion possible";

  if (textBody.includes("code") || textBody.includes("build") || textBody.includes("tech") || textBody.includes("system") || textBody.includes("engineer")) {
    archetype = "The Digital Alchemist";
    description = "You translate raw concept and system structures into functional realities, driven by a deep desire to construct resilient, valuable frameworks.";
    focusKeyword = "Structure";
    tagline = "Translating complex logical arrays into elegant solutions.";
    disciplineLevel = "Analytical determination";
    growthPotential = "Exponential development";
  } else if (textBody.includes("art") || textBody.includes("write") || textBody.includes("design") || textBody.includes("music") || textBody.includes("creative")) {
    archetype = "The Creative Visionary";
    description = "You perceive unseen possibilities within details, channeling your interior depth into expressions that evoke deep personal resonance.";
    focusKeyword = "Artistry";
    tagline = "Carving beauty out of complex emotional landscapes.";
    disciplineLevel = "Intuitive inspiration";
    growthPotential = "High creative agency";
  } else if (textBody.includes("business") || textBody.includes("money") || textBody.includes("lead") || textBody.includes("founder") || textBody.includes("client")) {
    archetype = "The Strategic Builder";
    description = "You look for leverage and strategic expansion, aiming to assemble systems, businesses, or assets that create compounding lifetime outcomes.";
    focusKeyword = "Expansion";
    tagline = "Assembling the foundational pillars of strategic growth.";
    disciplineLevel = "Strategic persistence";
    growthPotential = "Scalable leadership";
  }

  // Dynamic heuristics for high-contrast user metrics
  const hDiscipline = Math.min(95, Math.max(50, 65 + (textBody.length % 20)));
  const hConsistency = Math.min(95, Math.max(50, 60 + (textBody.split(" ").length % 25)));
  const hAdaptability = Math.min(95, Math.max(50, 70 + (textBody.includes("change") || textBody.includes("adapt") ? 15 : 5)));
  const hResilience = Math.min(95, Math.max(50, 68 + (textBody.includes("fail") || textBody.includes("bounce") ? 17 : 7)));
  const hExecution = Math.min(95, Math.max(50, 62 + (textBody.includes("do") || textBody.includes("action") ? 18 : 8)));
  const hAiEraReadiness = Math.min(95, Math.max(50, 75 + (textBody.includes("tech") || textBody.includes("digital") || textBody.includes("ai") ? 15 : 5)));

  return {
    schemaVersion: 1,
    identityAnalysis: {
      strengths: [
        `Capable of expressing complex feelings: "${a1.slice(0, 80)}..."`,
        "Deep intuitive awareness of your current limitations",
        "Willingness to acknowledge internal friction and seek answers"
      ],
      blindSpots: [
        `Allowing your primary blocker ("${a0.slice(0, 60)}...") to freeze your potential`,
        "A tendency to plan extensively instead of initiating prompt physical action",
        "Occasions of performing a curated version of yourself instead of remaining raw"
      ],
      emotionalPattern: "Driven by periodic spikes of intense inspiration, paired with brief valleys of self-assessment.",
      learningStyle: "Hands-on, experiential discovery. You learn best by building, writing, or solving through immediate struggle.",
      coreIdentityArchetype: archetype,
      archetypeDescription: description
    },
    potentialRadar: {
      discipline: hDiscipline,
      consistency: hConsistency,
      adaptability: hAdaptability,
      resilience: hResilience,
      execution: hExecution,
      aiEraReadiness: hAiEraReadiness
    },
    futureA: {
      type: "stagnation",
      title: "The Circular Path of Deferred Vision",
      narrative: `In this trajectory, your primary obstacle—"${a0.slice(0, 100)}"—continues to define the contours of your daily routines. Standard days pass by with minimal deviation. You defer major leaps to 'the right moment,' which silently shifts outward, preserving comfort but growing a quiet, heavy sediment of regret.`,
      keyOutcomes: [
        "Unrealized projects remain stored purely as raw ideas",
        "A feeling of safety that slowly transforms into emotional fatigue",
        "Remaining in roles or environments that do not challenge you"
      ],
      emotionalTone: "Comfortable, yet faintly melancholy",
      sixMonths: "You have planned several starts, but daily urgencies steal your primary attention.",
      oneYear: "Incremental changes, but the core feeling of stagnant capacity remains persistent.",
      fiveYears: "You look back wondering when the window closed, realizing you never truly initialized the risk."
    },
    futureB: {
      type: "evolution",
      title: `The Actualization of: ${a3.slice(0, 45)}`,
      narrative: `In this path, you make the concrete choice to leverage your strength. Instead of letting obstacles stop you, you turn them into parameters of design. Writing, creating, or building, you aggressively initialize the steps. By putting raw versions out early, you gain compound traction and step into clear alignment.`,
      keyOutcomes: [
        `A clear materialization of: "${a3.slice(0, 100)}..."`,
        "A standard routine grounded in visible, daily compound wins",
        "A supportive network drawn to your raw, authentic outputs"
      ],
      emotionalTone: "Vibrant, aligned, and highly resilient",
      sixMonths: "You have built the first concrete iteration, proving the concept to yourself.",
      oneYear: "The initial results compound, creating an entirely new ecosystem of opportunity.",
      fiveYears: "You stand holding a completely customized, high-leverage actualized life path."
    },
    regretPrediction: {
      topRegrets: [
        `Failing to move past the temporary friction of "${a0.slice(0, 50)}"`,
        "Investing too much energy pretending to have everything under control",
        "Deferring authentic, ambitious works out of hesitation"
      ],
      regretNarrative: "Your deepest regret stems not from outright failure, but from partial execution—building the foundations but walking away before seeing them rise.",
      regretTrigger: "Observing others who started with fewer resources build precisely what you deferred."
    },
    futureLetter: {
      fromName: `Your Future Aligned Self`,
      toName: "You",
      year: 2036,
      body: `I am writing this to tell you that the struggle you underwent was entirely worth it. Every time you chose to sit down, focus, and write down your raw answers despite the discomfort, you carved out another inch of our freedom. The barrier that seemed so massive to you then was just thin ice. Walk through it. We are waiting for you here.`,
      signature: "With absolute trust, Your Realized Future."
    },
    transformationPlan: {
      weeklyHabits: [
        { title: "Active Creation Blocks", frequency: "weekly", duration: "90 min", impact: "high", category: "career" },
        { title: "Friction Journaling", frequency: "daily", duration: "10 min", impact: "medium", category: "mindset" },
        { title: "Deep Focus (No inputs)", frequency: "daily", duration: "60 min", impact: "high", category: "career" }
      ],
      learningRoadmap: [
        { phase: "Phase 1: Foundation", focus: "Eliminating the primary blocker", milestones: ["Secure a stable creation environment", "Audit active distractions"] },
        { phase: "Phase 2: Acceleration", focus: "Exposing work to external feedback", milestones: ["Launch the first raw version", "Establish a weekly output rhythm"] }
      ],
      antiProcrastinationProtocol: [
        "Use the 5-Minute Rule: commit to raw focus for five minutes before stopping.",
        "Block internet routing from your creation tools dynamically.",
        "Perform the primary, highest-friction task within the first hour of waking."
      ],
      focusKeyword: focusKeyword
    },
    shareCard: {
      archetype,
      potentialScore: 88,
      aiReadiness: 92,
      disciplineLevel,
      growthPotential,
      tagline
    },
    sectionSummaries: {
      overview: "A synthesis of your core potential scores, radar capacities, and dynamic trajectory projections.",
      futures: "A direct split between stagnating in comfortable cycles versus choosing authentic actualization.",
      identity: "An audit of your active strengths, unvarnished blind spots, and underlying emotional patterns.",
      letter: "A poetic, cinematic correspondence dispatched from your potential future self ten years out.",
      plan: "A customized weekly habit blueprint, learning phases, and anti-procrastination rules.",
      share: "A beautifully styled high-contrast summary block optimized for projection and community share."
    }
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
  app.post("/api/gemini/analyze", analyzeLimiter, validate(AnalyzeBodySchema), async (req, res) => {
    try {
      const ai = getAI();
      const { answers } = req.body;
      const prompt = `
You are an AI psychologist, future strategist, and life coach.
Based on the following deeply personal reflection answers from a young person (18–27),
generate a comprehensive self-projection analysis.

USER REFLECTION ANSWERS:
${answers.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}

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
        model: "gemini-2.0-flash",
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
        const { answers } = req.body;
        const backupResult = compileGracefulFallback(answers || []);
        res.json(backupResult);
      } catch (fallbackErr: any) {
        console.error("Critical fallback compilation failure:", fallbackErr);
        res.status(500).json({ error: err.message || "Failed to process reflection answers." });
      }
    }
  });

  app.post("/api/gemini/follow-up", questionLimiter, async (req, res) => {
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
        model: "gemini-2.0-flash",
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

  app.post("/api/gemini/question", questionLimiter, validate(QuestionBodySchema), async (req, res) => {
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
        model: "gemini-2.0-flash",
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

  app.post("/api/gemini/explain", async (req, res) => {
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
        model: "gemini-2.0-flash",
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

  app.post("/api/gemini/taglines", async (req, res) => {
    try {
      const ai = getAI();
      const { archetype } = req.body;
      const prompt = `
Generate 3 short, punchy (1 sentence each) alternative taglines for the archetype "${archetype}".
They should be emotional and impactful.
Return a JSON array of strings: ["tagline 1", "tagline 2", "tagline 3"].`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
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
        model: "gemini-2.0-flash",
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
        envKeyConfigured: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)
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
