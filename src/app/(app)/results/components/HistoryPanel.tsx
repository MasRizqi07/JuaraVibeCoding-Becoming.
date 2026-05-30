import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import { getUserSessions, getResult } from "../../../../lib/firestore";
import { ReflectionSession } from "../../../../types/becoming";
import { cn } from "../../../../lib/utils";

export default function HistoryPanel() {
  const { user, setResult, setActiveView, startSession } = useBecomingStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ReflectionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      getUserSessions(user.uid).then(data => {
        setSessions(data.filter(s => s.status === 'complete'));
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
    // Filter by selected category first
    if (selectedCategory) {
      const hasCategory = s.answers.some(a => a.category === selectedCategory);
      if (!hasCategory) return false;
    }

    // Then filter by search query
    if (!searchQuery) return true;
    
    const dateStr = new Date(s.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}).toLowerCase();
    const q = searchQuery.toLowerCase();
    if (dateStr.includes(q)) return true;
    
    if (s.answers.some(a => a.answer.toLowerCase().includes(q) || a.question.toLowerCase().includes(q))) {
      return true;
    }
    return false;
  });

  if (loading) {
    return <div className="text-center text-[var(--muted)] py-[3rem] font-mono text-[10px] uppercase tracking-[0.2em]">Loading history...</div>;
  }

  return (
    <>
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Chronicle</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        Timeline of introspection.
      </h2>
      
      <div className="flex flex-col gap-[1rem] mb-[3rem] w-full">
        <div className="flex flex-col sm:flex-row gap-[1rem] justify-between items-start sm:items-center w-full">
          <button
            onClick={handleStartNew}
            className="bg-[var(--text)] text-[#000] border-none p-[0.7rem_1.5rem] rounded-[var(--rs)] text-[12px] font-medium cursor-pointer shrink-0"
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
          {filteredSessions.map((s, i) => (
            <div key={s.id} className="bg-[var(--bg2)] border border-[var(--border)] p-[2rem] rounded-[var(--r)] flex flex-col sm:flex-row items-center justify-between gap-[1.5rem] transition-colors hover:bg-[rgba(255,255,255,0.01)]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.5rem]">
                  {new Date(s.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'})}
                </p>
                <h3 className="font-sans text-[1.15rem] text-[var(--text)] leading-[1.2] tracking-[-0.01em] mb-[0.5rem]">
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
              
              <button
                onClick={() => handleLoadSession(s.id)}
                className="bg-transparent text-[var(--text)] border border-[var(--border)] p-[0.6rem_1.5rem] rounded-[var(--rs)] text-[12px] font-normal cursor-pointer whitespace-nowrap hover:bg-[#ffffff08] transition-colors shrink-0"
              >
                Load Results
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
