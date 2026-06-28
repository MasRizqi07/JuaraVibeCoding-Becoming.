import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowLeft, Check, CheckSquare, Square, BarChart2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import { getUserSessions, getResult, getUserResults } from "../../../../lib/firestore";
import { ReflectionSession, BecomingResult, PotentialRadar } from "../../../../types/becoming";
import { cn } from "../../../../lib/utils";

const METRIC_KEYS: (keyof PotentialRadar)[] = [
  "discipline", 
  "consistency", 
  "adaptability", 
  "resilience", 
  "execution", 
  "aiEraReadiness"
];

const LABELS = [
  "Discipline", 
  "Consistency", 
  "Adaptability", 
  "Resilience", 
  "Execution", 
  "AI Era Readiness"
];

export default function HistoryPanel() {
  const { user, setResult, setActiveView, startSession } = useBecomingStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ReflectionSession[]>([]);
  const [results, setResults] = useState<BecomingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Side-by-side comparison state holdings
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        getUserSessions(user.uid),
        getUserResults(user.uid)
      ]).then(([sessionsData, resultsData]) => {
        setSessions(sessionsData.filter(s => s.status === 'complete'));
        setResults(resultsData);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load historical analytics: ", err);
        setLoading(false);
      });
    }
  }, [user]);

  const handleLoadSession = async (sessionId: string) => {
    const historicalResult = await getResult(sessionId);
    if (historicalResult) {
      setResult(historicalResult);
      setActiveView('overview');
    }
  };

  const handleStartNew = async () => {
    await startSession();
    navigate('/reflect');
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    sessions.forEach(s => {
      s.answers.forEach(a => {
        if (a.category) cats.add(a.category);
      });
    });
    return Array.from(cats).sort();
  }, [sessions]);

  const filteredSessions = sessions.filter(s => {
    if (selectedCategory) {
      const hasCategory = s.answers.some(a => a.category === selectedCategory);
      if (!hasCategory) return false;
    }

    if (!searchQuery) return true;
    
    const dateStr = new Date(s.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}).toLowerCase();
    const q = searchQuery.toLowerCase();
    if (dateStr.includes(q)) return true;
    
    if (s.answers.some(a => a.answer.toLowerCase().includes(q) || a.question.toLowerCase().includes(q))) {
      return true;
    }
    return false;
  });

  const handleToggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // Prepare comparison data elements
  const comparisonData = useMemo(() => {
    if (selectedCompareIds.length !== 2) return null;
    
    // Maintain chronological order: earlier session is A, later is B
    const session1 = sessions.find(s => s.id === selectedCompareIds[0]);
    const session2 = sessions.find(s => s.id === selectedCompareIds[1]);
    if (!session1 || !session2) return null;

    const [earlier, later] = session1.createdAt < session2.createdAt ? [session1, session2] : [session2, session1];
    
    const resultEarlier = results.find(r => r.sessionId === earlier.id);
    const resultLater = results.find(r => r.sessionId === later.id);

    return {
      sessionA: earlier,
      sessionB: later,
      resultA: resultEarlier,
      resultB: resultLater,
    };
  }, [selectedCompareIds, sessions, results]);

  if (loading) {
    return <div className="text-center text-[var(--muted)] py-[4rem] font-mono text-[10px] uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-3">
      <RefreshCw className="w-5 h-5 animate-spin text-[var(--gold)]" />
      <span>Assembling Chronicle...</span>
    </div>;
  }

  // RENDER DYNAMIC SIDE-BY-SIDE ANALYTICAL COMPONENT MODE
  if (isComparing && comparisonData) {
    const { sessionA, sessionB, resultA, resultB } = comparisonData;
    const dateA = new Date(sessionA.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'});
    const dateB = new Date(sessionB.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'});

    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setIsComparing(false)}
          className="bg-transparent border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)] p-[0.5rem_1rem] rounded-[var(--rs)] text-[11px] font-mono uppercase tracking-[0.1em] flex items-center gap-[0.5rem] cursor-pointer mb-[2rem] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Timeline</span>
        </button>

        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Analytical Diagnostic</p>
        <h2 className="font-serif text-[1.90rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
          Side-By-Side Trajectory Comparison
        </h2>

        {/* Date Headers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.5rem] mb-[2rem]">
          <div className="bg-[rgba(255,255,255,0.01)] border border-[var(--border)] rounded-[var(--r)] p-[1.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--faint)]" />
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.25rem]">Timeline Point Alpha</div>
            <div className="font-serif text-[1.45rem] font-normal text-[var(--text)]">{dateA}</div>
            <div className="font-mono text-[11px] text-[var(--muted)] mt-[0.5rem]">
              Archetype: <span className="text-[var(--gold)] font-medium">{resultA?.identityAnalysis.coreIdentityArchetype || "Not available"}</span>
            </div>
          </div>
          
          <div className="bg-[rgba(251,191,36,0.02)] border border-[var(--gold)] border-opacity-30 rounded-[var(--r)] p-[1.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--gold)]" />
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--gold)] mb-[0.25rem]">Timeline Point Beta</div>
            <div className="font-serif text-[1.45rem] font-normal text-[var(--text)]">{dateB}</div>
            <div className="font-mono text-[11px] text-[var(--muted)] mt-[0.5rem]">
              Archetype: <span className="text-[var(--gold)] font-medium">{resultB?.identityAnalysis.coreIdentityArchetype || "Not available"}</span>
            </div>
          </div>
        </div>

        {/* Core Radar Metric Delta Comparison Table */}
        <div className="mb-[3.5rem] overflow-x-auto w-full">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-[1.25rem] border-b border-[var(--border)] pb-[0.5rem]">
            Vector Capacity Scaling Deltas
          </h3>

          <table className="w-full text-left border-collapse border border-[var(--border)] bg-[var(--bg2)] rounded-[var(--r)] overflow-hidden">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
                <th className="p-[1rem_1.5rem] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-medium">Dimension Cap</th>
                <th className="p-[1rem_1.5rem] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-medium text-center">Point Alpha ({dateA})</th>
                <th className="p-[1rem_1.5rem] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-medium text-center">Point Beta ({dateB})</th>
                <th className="p-[1rem_1.5rem] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-medium text-right">Absolute Delta</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_KEYS.map((key, idx) => {
                const valA = resultA ? (resultA.potentialRadar[key] as number) : 0;
                const valB = resultB ? (resultB.potentialRadar[key] as number) : 0;
                const delta = valB - valA;
                const label = LABELS[idx];

                return (
                  <tr key={key} className="border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                    <td className="p-[1.25rem_1.5rem] font-sans text-[13.5px] font-semibold text-[var(--text)]">
                      {label}
                    </td>
                    <td className="p-[1.25rem_1.5rem] font-sans text-[13.5px] text-[var(--muted)] text-center font-medium">
                      {valA}%
                    </td>
                    <td className="p-[1.25rem_1.5rem] font-sans text-[13.5px] text-[var(--text)] text-center font-semibold text-[var(--gold)]">
                      {valB}%
                    </td>
                    <td className="p-[1.25rem_1.5rem] font-mono text-[12px] text-right">
                      {delta > 0 ? (
                        <span className="font-bold text-[var(--gold)] flex items-center justify-end gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[var(--gold)] inline" />
                          +{delta}%
                        </span>
                      ) : delta < 0 ? (
                        <span className="font-bold text-rose-400 flex items-center justify-end gap-1">
                          <TrendingDown className="w-3.5 h-3.5 text-rose-400 inline" />
                          {delta}%
                        </span>
                      ) : (
                        <span className="font-medium text-[var(--muted)]">Stable (0%)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Qualitative Response Comparison */}
        <div className="mb-[2rem]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-[1.25rem] border-b border-[var(--border)] pb-[0.5rem]">
            Qualitative Perspective Introspection Delta
          </h3>

          <div className="flex flex-col gap-[1.5rem]">
            {sessionB.answers.map((answerB, bIdx) => {
              // Find equivalence answer from Session A targeting the same category
              const answerA = sessionA.answers.find(a => a.category === answerB.category);
              if (!answerA || !answerB.answer) return null;

              return (
                <div key={`compare-q-${bIdx}`} className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--r)] p-[2rem]">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[var(--gold)] mb-[0.75rem]">Category: {answerB.category}</p>
                  <h4 className="font-serif text-[1.2rem] font-light leading-[1.35] text-[var(--text)] mb-[1.5rem] italic">
                    "{answerB.question}"
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2rem] pt-[1.25rem] border-t border-[var(--border)]">
                    <div className="flex flex-col gap-[0.5rem]">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Previously ({dateA}):</span>
                      <p className="font-sans text-[13.5px] leading-[1.65] text-[var(--muted)] whitespace-pre-wrap">
                        {answerA.answer || "Skipped question."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-[0.5rem] border-t md:border-t-0 md:border-l border-[var(--border)] pt-[1.2rem] md:pt-0 md:pl-[2rem]">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--gold)]">Currently ({dateB}):</span>
                      <p className="font-sans text-[13.5px] leading-[1.65] text-[var(--text)] whitespace-pre-wrap">
                        {answerB.answer || "Skipped question."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // STANDARD LIST CHRONICLE VIEW MODE
  return (
    <>
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Chronicle</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        Timeline of introspection.
      </h2>

      {/* Floating comparison multi-selection helper bar */}
      {selectedCompareIds.length > 0 && (
        <div className="bg-[rgba(201,168,68,0.06)] border border-[var(--gold)] border-opacity-35 rounded-[var(--r)] p-[1.25rem] mb-[1.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-[1rem] animate-fade-in relative z-10">
          <div className="flex items-center gap-[0.75rem]">
            <div className="w-[10px] h-[10px] rounded-full bg-[var(--gold)] animate-pulse" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--gold)]">Chronicle Comparison Engine</p>
              <p className="font-sans text-[12.5px] text-[var(--muted)]">
                Selected <span className="font-semibold text-[var(--text)]">{selectedCompareIds.length}</span> of 2 sessions.
                {selectedCompareIds.length === 1 && " Select 1 more to unlock side-by-side comparison!"}
              </p>
            </div>
          </div>
          
          <div className="flex gap-[0.5rem]">
            <button
              onClick={() => setSelectedCompareIds([])}
              className="bg-transparent border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--muted)] p-[0.5rem_1rem] rounded-[var(--rs)] text-[11px] font-mono uppercase tracking-[0.05em] cursor-pointer transition-all"
            >
              Reset
            </button>
            <button
              onClick={() => setIsComparing(true)}
              disabled={selectedCompareIds.length !== 2}
              className="bg-[var(--gold)] text-black disabled:opacity-45 disabled:cursor-not-allowed border-none p-[0.5rem_1.25rem] rounded-[var(--rs)] text-[11px] font-mono font-medium uppercase tracking-[0.05em] cursor-pointer transition-all hover:bg-[#D4B04A]"
            >
              Compare Side-by-Side →
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-[1rem] mb-[3rem] w-full">
        <div className="flex flex-col sm:flex-row gap-[1rem] justify-between items-start sm:items-center w-full">
          <button
            onClick={handleStartNew}
            className="bg-[var(--text)] text-[#000] border-none p-[0.7rem_1.5rem] rounded-[var(--rs)] text-[12px] font-medium cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
          >
            Initiate New Reflection
          </button>

          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-[1rem] top-[50%] translate-y-[-50%] w-[1rem] h-[1rem] text-[var(--muted)]" />
            <input 
              type="text" 
              placeholder="Search by date or keyword..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search past sessions"
              className="w-full bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--rs)] p-[0.6rem_1rem_0.6rem_2.5rem] text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--text)] transition-colors"
            />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-[0.5rem]">
            <button
              onClick={() => setSelectedCategory(null)}
              aria-pressed={selectedCategory === null}
              className={cn(
                "px-[12px] py-[4px] rounded-full text-[11px] font-mono uppercase tracking-[0.1em] border transition-colors cursor-pointer",
                selectedCategory === null
                  ? "bg-[var(--gold-a)] border-[var(--gold)] text-[var(--gold)]"
                  : "bg-transparent border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={cn(
                  "px-[12px] py-[4px] rounded-full text-[11px] font-mono uppercase tracking-[0.1em] border transition-colors cursor-pointer",
                  selectedCategory === cat
                    ? "bg-[var(--gold-a)] border-[var(--gold)] text-[var(--gold)]"
                    : "bg-transparent border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="bg-[var(--bg2)] border border-[var(--border)] p-[3rem] rounded-[var(--r)] text-center text-[13px] text-[var(--muted)] italic">
          No fully completed past sessions found matching your search.
        </div>
      ) : (
        <div className="flex flex-col gap-[1.5rem]">
          {filteredSessions.map((s, i) => {
            const isSelected = selectedCompareIds.includes(s.id);
            return (
              <div 
                key={s.id} 
                onClick={() => handleLoadSession(s.id)}
                className="bg-[var(--bg2)] border border-[var(--border)] p-[2rem] rounded-[var(--r)] flex flex-col sm:flex-row items-center justify-between gap-[1.5rem] transition-all hover:bg-[rgba(255,255,255,0.015)] cursor-pointer group"
              >
                <div className="flex items-start gap-[1.25rem] w-full sm:w-auto">
                  {/* Select box for compare engine */}
                  <div 
                    onClick={(e) => handleToggleCompare(s.id, e)}
                    className="p-1 mt-1 shrink-0 text-[var(--muted)] hover:text-[var(--gold)] transition-colors cursor-pointer"
                    title="Toggle multi-session comparison"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-[var(--gold)]" />
                    ) : (
                      <Square className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.25rem]">
                      {new Date(s.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'})}
                    </p>
                    <h3 className="font-sans text-[1.15rem] text-[var(--text)] leading-[1.2] tracking-[-0.01em] mb-[0.5rem] group-hover:text-[var(--gold)] transition-colors">
                      Reflection Instance {sessions.length - sessions.findIndex(bs => bs.id === s.id)}
                    </h3>
                    {s.answers.length > 0 && (
                      <div className="flex flex-wrap gap-[0.35rem]">
                        {Array.from(new Set(s.answers.filter(a => a.category).map(a => a.category))).map(cat => (
                          <span key={cat} className="inline-block px-[6px] py-[2px] rounded bg-[var(--bg3)] text-[10px] font-mono text-[var(--muted)] uppercase tracking-[0.05em]">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-[0.75rem] w-full sm:w-auto justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSession(s.id);
                    }}
                    className="bg-transparent text-[var(--text)] border border-[var(--border)] p-[0.6rem_1.5rem] rounded-[var(--rs)] text-[12px] font-normal cursor-pointer whitespace-nowrap hover:bg-[#ffffff08] transition-colors shrink-0"
                  >
                    Load Results
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
