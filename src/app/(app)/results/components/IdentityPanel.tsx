import { useEffect, useState } from "react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import { PanelLoader } from "./PanelLoader";
import { SectionSummary } from "./SectionSummary";

export default function IdentityPanel() {
  const { result } = useBecomingStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);
  
  if (!result) return null;
  if (isLoading) return <PanelLoader title="Deconstructing Identity..." />;

  const { identityAnalysis, sectionSummaries } = result;

  return (
    <>
      {sectionSummaries && <SectionSummary summary={sectionSummaries.identity} />}
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Raw Truth</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        You are lying to yourself about something.
      </h2>
      
      <div className="bg-[var(--bg2)] border border-[var(--border)] p-[2rem] rounded-[var(--r)] mb-[1.5rem]">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.5rem]">Your Core Paradox</p>
        <p className="font-sans text-[1.15rem] color-[var(--text)] leading-[1.6]">
          {identityAnalysis.emotionalPattern || "You crave massive success, yet you organize your daily schedule as if you're trying to hide from it."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.5rem]">
        <div className="bg-[var(--bg2)] border border-[var(--border)] p-[2rem] rounded-[var(--r)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.75rem]">Your Strengths</p>
          <ul className="list-none p-0 m-0 space-y-[0.75rem]">
            {identityAnalysis.strengths.map((s, i) => (
              <li key={i} className="font-sans text-[0.95rem] text-[var(--text)] leading-[1.6]">
                <span className="text-[var(--muted)] mr-2">—</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[var(--bg2)] border border-[var(--border)] p-[2rem] rounded-[var(--r)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.75rem]">The Reality</p>
          <ul className="list-none p-0 m-0 space-y-[0.75rem]">
            {identityAnalysis.blindSpots.map((b, i) => (
              <li key={i} className="font-sans text-[0.95rem] text-[var(--gold)] leading-[1.6]">
                <span className="text-[var(--gold)] opacity-50 mr-2">—</span>{b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
