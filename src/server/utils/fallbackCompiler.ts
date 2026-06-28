import { BecomingResult } from "@becoming/types";

/**
 * Deterministic keywords dictionary for scoring radar metrics
 */
const SCORE_KEYWORDS: Record<string, string[]> = {
  discipline: ["routine", "habit", "schedule", "focus", "discipline", "rule", "commit", "daily", "willpower"],
  consistency: ["consist", "streak", "always", "repeat", "persistent", "track", "calendar", "maintain", "regular"],
  adaptability: ["change", "adapt", "pivot", "flexible", "adjust", "learn", "transform", "open", "new"],
  resilience: ["fail", "bounce", "overcome", "struggle", "friction", "difficult", "hard", "obstacle", "resilient"],
  execution: ["do", "action", "execution", "now", "build", "complete", "finish", "implement", "run", "start"],
  aiEraReadiness: ["tech", "ai", "digital", "system", "automation", "engineer", "prompt", "code", "future"],
};

/**
 * Calculates a metric score strictly and deterministically based on keyword mentions.
 * Base score starts at 60 points, each unique keyword match adds 5 points, capped at 98.
 * No modulos, no string length heuristics, no randomness.
 */
function calculateDeterministicScore(text: string, category: string): number {
  const cleanText = text.toLowerCase();
  const keywords = SCORE_KEYWORDS[category] || [];
  let score = 65; // Base robust average score

  for (const word of keywords) {
    if (cleanText.includes(word)) {
      score += 6;
    }
  }

  return Math.min(98, score);
}

/**
 * Determines behavioral levels based on deterministic score bounds
 */
function getDisciplineLevel(score: number): "Low" | "Developing" | "High" | "Elite" {
  if (score >= 90) return "Elite";
  if (score >= 75) return "High";
  if (score >= 60) return "Developing";
  return "Low";
}

function getGrowthPotential(score: number): "Dormant" | "Emerging" | "Accelerating" | "Unstoppable" {
  if (score >= 90) return "Unstoppable";
  if (score >= 75) return "Accelerating";
  if (score >= 60) return "Emerging";
  return "Dormant";
}

/**
 * Standard compiled results mapping user answers to a comprehensive BecomingResult structured object cleanly.
 */
export function compileGracefulFallback(answers: any[], sessionId: string, userId: string): Omit<BecomingResult, 'generatedAt'> {
  const getAns = (indices: number[]) => {
    for (const i of indices) {
      if (answers[i] && answers[i].answer) return answers[i].answer;
    }
    return "your unexpressed aspiration";
  };

  const a0 = getAns([0]);
  const a1 = getAns([1]);
  const a3 = getAns([2, 3]);
  const textBody = answers.map(a => a.answer || "").join(" ").toLowerCase();

  // Archetype resolution based on deterministic keyword matching
  let archetype = "The Awakened Catalyst";
  let description = "You are motivated by an underlying seek for alignment, constantly balancing your present duties with authentic creative or functional ambitions.";
  let focusKeyword = "Authenticity";
  let tagline = "Harnessing friction to fuel self-transformation.";

  if (textBody.includes("code") || textBody.includes("build") || textBody.includes("tech") || textBody.includes("system") || textBody.includes("engineer")) {
    archetype = "The Digital Alchemist";
    description = "You translate raw concept and system structures into functional realities, driven by a deep desire to construct resilient, valuable frameworks.";
    focusKeyword = "Structure";
    tagline = "Translating complex logical arrays into elegant solutions.";
  } else if (textBody.includes("art") || textBody.includes("write") || textBody.includes("design") || textBody.includes("music") || textBody.includes("creative")) {
    archetype = "The Creative Visionary";
    description = "You perceive unseen possibilities within details, channeling your interior depth into expressions that evoke deep personal resonance.";
    focusKeyword = "Artistry";
    tagline = "Carving beauty out of complex emotional landscapes.";
  } else if (textBody.includes("business") || textBody.includes("money") || textBody.includes("lead") || textBody.includes("founder") || textBody.includes("client")) {
    archetype = "The Strategic Builder";
    description = "You look for leverage and strategic expansion, aiming to assemble systems, businesses, or assets that create compounding lifetime outcomes.";
    focusKeyword = "Expansion";
    tagline = "Assembling the foundational pillars of strategic growth.";
  }

  // Scoring using deterministic counts
  const disciplineScore = calculateDeterministicScore(textBody, "discipline");
  const consistencyScore = calculateDeterministicScore(textBody, "consistency");
  const adaptabilityScore = calculateDeterministicScore(textBody, "adaptability");
  const resilienceScore = calculateDeterministicScore(textBody, "resilience");
  const executionScore = calculateDeterministicScore(textBody, "execution");
  const aiEraScore = calculateDeterministicScore(textBody, "aiEraReadiness");

  const averagePotential = Math.round(
    (disciplineScore + consistencyScore + adaptabilityScore + resilienceScore + executionScore) / 5
  );

  return {
    schemaVersion: 1,
    sessionId,
    userId,
    identityAnalysis: {
      strengths: [
        `Expressing deep insights: "${a1.slice(0, 100)}"`,
        "High degree of diagnostic self-honesty when confronting friction",
        "Willingness to acknowledge emotional bottlenecks and pursue alignment"
      ],
      blindSpots: [
        `Letting the fear of "${a0.slice(0, 60)}" slow down micro executions`,
        "Extensive strategic planning without prompt physical iteration limits potential",
        "Curating intentions instead of publishing raw feedback loops"
      ],
      emotionalPattern: "Guided by spikes of intensive focus paired with subsequent introspection regarding daily habits.",
      learningStyle: "Hands-on, project-based struggle. Learns best by constructing real solutions over theoretical memorization.",
      coreIdentityArchetype: archetype,
      archetypeDescription: description
    },
    potentialRadar: {
      discipline: disciplineScore,
      consistency: consistencyScore,
      adaptability: adaptabilityScore,
      resilience: resilienceScore,
      execution: executionScore,
      aiEraReadiness: aiEraScore
    },
    futureA: {
      type: "drifting",
      title: "The Circular Path of Deferred Vision",
      narrative: `In this trajectory, your primary bottleneck—"${a0.slice(0, 150)}"—continues to define the landscape of your routines. Comfortable days slide into each other with minimal friction. You defer major beginnings to 'a perfect window' that keeps moving away, while a thin, heavy sediment of unactualized capacity layers over your days.`,
      keyOutcomes: [
        "Unrealized works remain forever stored as clean drafts",
        "An aura of security that slowly translates into chronic fatigue",
        "Retaining roles or environments long after they stop growing you"
      ],
      emotionalTone: "Safe and stable, yet subtly melancholic",
      sixMonths: "You have written detailed plans for three separate routes, but daily urgencies steal focus.",
      oneYear: "Occasional bursts of effort occur, but the default gravitational field of comfortable habits returns.",
      fiveYears: "You look back wondering when the window closed, realizing you never truly initialized the risk."
    },
    futureB: {
      type: "becoming",
      title: `The Actualization of: ${a3.slice(0, 50)}`,
      narrative: `In this pathway, you make the decisive shift to leverage your active strength. Instead of allowing blockers to cancel action, you design routines around them. Committing to small daily blocks, you build compound traction and manifest '${a3.slice(0, 80)}' into real operational units.`,
      keyOutcomes: [
        `Visible structures solidifying: "${a3.slice(0, 100)}..."`,
        "Routines grounded in visible, compounding daily creations",
        "An authentic, high-value network attracted to your honest outputs"
      ],
      emotionalTone: "Highly vibrant, aligned, and resilient",
      sixMonths: "You have compiled the first raw, imperfect iteration, establishing absolute proof-of-capability.",
      oneYear: "The compounding loop begins to yield direct dividends, opening up custom avenues of career sovereignty.",
      fiveYears: "You stand inside a completely bespoke, highly leveraged life path you carved through daily alignments."
    },
    regretPrediction: {
      topRegrets: [
        `Giving premium creative years to temporary friction of "${a0.slice(0, 60)}"`,
        "Trading authentic system exposure for safe, uninspected routines",
        "Failing to publish raw creations early and compound feedback"
      ],
      regretNarrative: "The deepest regret stems from partial initialization — constructing the foundations of multiple projects but sliding away before they rise.",
      regretTrigger: "Observing individuals who started with fewer advantages launch precisely the structures you planned."
    },
    futureLetter: {
      fromName: "Your Aligned Future Counterpart",
      toName: "You",
      year: 2036,
      body: `I write this to assure you that the intense friction you navigated was entirely worth it. Every time you chose to sit down, face the blank interface, and write out your raw thoughts, you bought another piece of our freedom. The barrier that seemed so massive then was just paper thin. Walk straight through it. We are waiting.`,
      signature: "With absolute trust, Your Realized Self"
    },
    transformationPlan: {
      weeklyHabits: [
        { title: "Deep Focus Blocks", frequency: "weekly", duration: "90 min", impact: "high", category: "career" },
        { title: "Friction Auditing", frequency: "daily", duration: "10 min", impact: "medium", category: "mindset" },
        { title: "Active Production Loops", frequency: "daily", duration: "60 min", impact: "high", category: "career" }
      ],
      learningRoadmap: [
        { phase: "Phase 1: Foundation Setup", focus: "Eliminating the primary friction source", milestones: ["Declare a stable deep production time", "Prune overlapping digital inputs"] },
        { phase: "Phase 2: Feedback Acceleration", focus: "Exposing raw builds to direct validation", milestones: ["Release the first functional draft", "Establish weekly production commitments"] }
      ],
      antiProcrastinationProtocol: [
        "Commit to 5 minutes of raw creation before permitting a pause or break.",
        "Block internet routing from creation applications during focus hours.",
        "Solve your highest-friction task during the absolute first hour of your active day."
      ],
      focusKeyword: focusKeyword
    },
    shareCard: {
      archetype,
      potentialScore: averagePotential,
      aiReadiness: aiEraScore,
      disciplineLevel: getDisciplineLevel(disciplineScore),
      growthPotential: getGrowthPotential(averagePotential),
      tagline
    },
    sectionSummaries: {
      overview: "An audit of your core potential scores, radar capacities, and dynamic trajectory projections.",
      futures: "A direct split between stagnating in comfortable cycles versus choosing authentic actualization.",
      identity: "An audit of your active strengths, unvarnished blind spots, and underlying emotional patterns.",
      letter: "A poetic, cinematic correspondence dispatched from your potential future self ten years out.",
      plan: "A customized weekly habit blueprint, learning phases, and anti-procrastination rules.",
      share: "A beautifully styled high-contrast summary block optimized for projection and community share."
    }
  };
}
