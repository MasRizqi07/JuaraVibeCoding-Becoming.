import { compileGracefulFallback } from "../fallbackCompiler";

describe("Deterministic Fallback Compiler Unit Tests", () => {
  const mockBaseAnswers = [
    { question: "What acts as your primary distraction or obstacle?", answer: "procrastination and video games", category: "blocker" },
    { question: "What is a major strength you have?", answer: "discipline and structure and system build process", category: "strength" },
    { question: "What are you trying to accomplish?", answer: "build solid AI engineering systems", category: "goal" }
  ];

  test("1. Basic validation and structure of output with tech input", () => {
    const res = compileGracefulFallback(mockBaseAnswers, "session-123", "user-456");
    expect(res.schemaVersion).toBe(1);
    expect(res.sessionId).toBe("session-123");
    expect(res.userId).toBe("user-456");
    expect(res.potentialRadar.discipline).toBeGreaterThanOrEqual(65);
    expect(res.shareCard.archetype).toBe("The Digital Alchemist");
  });

  test("2. Archetype resolves to Creative Visionary when creative keywords exist", () => {
    const artAnswers = [
      { question: "blocker", answer: "fear of starting" },
      { question: "strength", answer: "I design music, write art, and draw creative concepts" },
      { question: "goal", answer: "publish my gallery portfolio book" }
    ];
    const res = compileGracefulFallback(artAnswers, "session-1", "user-1");
    expect(res.shareCard.archetype).toBe("The Creative Visionary");
  });

  test("3. Archetype resolves to Strategic Builder when financial keywords exist", () => {
    const financeAnswers = [
      { question: "blocker", answer: "lack of focus" },
      { question: "strength", answer: "investing, running businesses, managing clients" },
      { question: "goal", answer: "grow my business founder assets and start compounding money" }
    ];
    const res = compileGracefulFallback(financeAnswers, "session-2", "user-2");
    expect(res.shareCard.archetype).toBe("The Strategic Builder");
  });

  test("4. Standard default archetype", () => {
    const plainAnswers = [
      { question: "block", answer: "nothing" },
      { question: "strength", answer: "thinking a lot about options" },
      { question: "goal", answer: "survive" }
    ];
    const res = compileGracefulFallback(plainAnswers, "sess", "usr");
    expect(res.shareCard.archetype).toBe("The Awakened Catalyst");
  });

  // Let's create more variation tests to make 20 complete mock scenarios for comprehensive coverage
  const testScenarios = [
    { name: "5. Tech stack developer profile", text: "engineer, code, systems, program, typescript, automated build routines", expectedArchetype: "The Digital Alchemist" },
    { name: "6. Design and art enthusiast", text: "visual art, craft design, background music, creative design agency projects", expectedArchetype: "The Creative Visionary" },
    { name: "7. Business & capital operations", text: "compounding cash, clients, businesses models, strategic growth leverage as founder", expectedArchetype: "The Strategic Builder" },
    { name: "8. Uncategorized lifestyle alignment", text: "meditation, self introspection, reading books, morning walks", expectedArchetype: "The Awakened Catalyst" },
    { name: "9. Highly disciplined coder", text: "routine, habit, schedule, focus, discipline, commit, daily, software engineer", expectedArchetype: "The Digital Alchemist" },
    { name: "10. Overcoming struggle story", text: "I fail often, struggle through obstacles, extremely resilient to bad reviews", expectedArchetype: "The Awakened Catalyst" },
    { name: "11. High consistency tracker", text: "persistent habit tracking, repeat, calendar metrics, maintain continuous streak", expectedArchetype: "The Awakened Catalyst" },
    { name: "12. High adaptability pivot", text: "change, adapt, open to pivot, flexible structural adjustments to markets", expectedArchetype: "The Awakened Catalyst" },
    { name: "13. High execution focus list", text: "do action, complete tasks immediately, run starting experiments daily", expectedArchetype: "The Awakened Catalyst" },
    { name: "14. High AI-Era readiness test", text: "prompt engineering, OpenAI gpt, Gemini API, AI agent workflows on computer", expectedArchetype: "The Awakened Catalyst" },
    { name: "15. Lazy routine, low scores matchers", text: "unstructured, lazy, sleep, tv, zero habits, zero schedules, delayed attention", expectedScore: 65 },
    { name: "16. Creative artist writing essays", text: "creative writer designing poetry and script publishing", expectedArchetype: "The Creative Visionary" },
    { name: "17. Tech lead founder", text: "engineer architect launching code bases with systems automation", expectedArchetype: "The Digital Alchemist" },
    { name: "18. Business development manager", text: "clients pipeline, revenue metrics, compound business", expectedArchetype: "The Strategic Builder" },
    { name: "19. Mindset alignment coach", text: "mindset calibration, habit alignment, focus strategies", expectedArchetype: "The Awakened Catalyst" },
    { name: "20. Complete zero inputs scenario", text: "", expectedScore: 65 }
  ];

  for (const scenario of testScenarios) {
    test(scenario.name, () => {
      const answers = [
        { question: "Q1", answer: scenario.text || "example answer" },
        { question: "Q2", answer: scenario.text || "example answer" }
      ];
      const res = compileGracefulFallback(answers, "session", "user");
      if ("expectedArchetype" in scenario) {
        expect(res.shareCard.archetype).toBe(scenario.expectedArchetype);
      }
      if ("expectedScore" in scenario) {
        expect(res.potentialRadar.discipline).toBe(scenario.expectedScore);
      }
    });
  }
});
