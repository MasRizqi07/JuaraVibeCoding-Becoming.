import { validateAndNormalizeAIOutput } from "../validateAIOutput";

describe("AI Output Validator and Normalizer Unit Tests", () => {
  const validMockResult = {
    schemaVersion: 1,
    sessionId: "sess-abc",
    userId: "user-123",
    identityAnalysis: {
      strengths: ["coding", "logical thinking"],
      blindSpots: ["not taking action fast enough"],
      emotionalPattern: "calm but overthinking",
      learningStyle: "hands on coding",
      coreIdentityArchetype: "The Digital Alchemist",
      archetypeDescription: "Builds and designs code frameworks"
    },
    potentialRadar: {
      discipline: 88,
      consistency: 85,
      adaptability: 80,
      resilience: 78,
      execution: 82,
      aiEraReadiness: 95
    },
    futureA: {
      type: "stagnation",
      title: "drifting destiny",
      narrative: "comfortable stagnation narrative blocks",
      keyOutcomes: ["unrealized potential", "routine circles"],
      emotionalTone: "subtle melancholy",
      sixMonths: "planning starting templates",
      oneYear: "same place as today",
      fiveYears: "wondering what could have been"
    },
    futureB: {
      type: "evolution",
      title: "becoming optimized",
      narrative: "highly vibrant creative outcomes and sovereign growth loops",
      keyOutcomes: ["launching micro units", "compounding results"],
      emotionalTone: "empowered",
      sixMonths: "first draft live",
      oneYear: "traction gained with clients",
      fiveYears: "BESPOKE sovereign life structure"
    },
    regretPrediction: {
      topRegrets: ["never initializing coding ideas"],
      regretNarrative: "regret overview",
      regretTrigger: "observing other teams ship systems"
    },
    futureLetter: {
      fromName: "Counterpart",
      toName: "You",
      year: 2036,
      body: "Walk straight forward.",
      signature: "Faithfully Yours"
    },
    transformationPlan: {
      weeklyHabits: [
        { title: "Code blocks", frequency: "daily", duration: "60 mins", impact: "high", category: "career" }
      ],
      learningRoadmap: [
        { phase: "foundation", focus: "learn schema models", milestones: ["milestone 1"] }
      ],
      antiProcrastinationProtocol: ["use 5-minute rule"],
      focusKeyword: "Structure"
    },
    shareCard: {
      archetype: "The Digital Alchemist",
      potentialScore: 88,
      aiReadiness: 95,
      disciplineLevel: "High",
      growthPotential: "Accelerating",
      tagline: "Building digital legacy"
    },
    sectionSummaries: {
      overview: "summary overview text info",
      futures: "futures comparison summary",
      identity: "identity traits summary",
      letter: "poetic message summary",
      plan: "custom weekly tasks summary",
      share: "beautiful share card details"
    }
  };

  test("1. Successfully validates a valid JSON result instantly", async () => {
    const rawJson = JSON.stringify(validMockResult);
    const mockRecall = jest.fn();
    const mockFallback = jest.fn();

    const output = await validateAndNormalizeAIOutput(rawJson, mockRecall, mockFallback);
    expect(output.sessionId).toBe("sess-abc");
    expect(mockRecall).not.toHaveBeenCalled();
    expect(mockFallback).not.toHaveBeenCalled();
  });

  test("2. Recalls executeCall on invalid JSON and then resolves successfully if recall is valid", async () => {
    const invalidJson = `{ "sessionId": "sess-abc", invalid_json... }`;
    const validJson = JSON.stringify(validMockResult);
    const mockRecall = jest.fn().mockResolvedValue(validJson);
    const mockFallback = jest.fn();

    const output = await validateAndNormalizeAIOutput(invalidJson, mockRecall, mockFallback);
    expect(output.sessionId).toBe("sess-abc");
    expect(mockRecall).toHaveBeenCalledTimes(1);
    expect(mockFallback).not.toHaveBeenCalled();
  });

  test("3. Falls back to fallbackAction when recall also is invalid after max retries", async () => {
    const invalidJson = `{ "sessionId": "sess-abc", invalid_json... }`;
    const mockRecall = jest.fn().mockResolvedValue(invalidJson);
    const fallbackVal = { isFallback: true };
    const mockFallback = jest.fn().mockReturnValue(fallbackVal);

    const output = await validateAndNormalizeAIOutput(invalidJson, mockRecall, mockFallback);
    expect(output).toEqual(fallbackVal);
    expect(mockRecall).toHaveBeenCalledTimes(3);
    expect(mockFallback).toHaveBeenCalledTimes(1);
  });
});
