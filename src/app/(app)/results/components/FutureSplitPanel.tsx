import { useEffect, useState } from "react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import { PanelLoader } from "./PanelLoader";
import { SectionSummary } from "./SectionSummary";

export default function FutureSplitPanel() {
  const { result } = useBecomingStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (!result) return null;
  if (isLoading) return <PanelLoader title="Simulating Timelines..." />;

  const { futureA, futureB, sectionSummaries } = result;

  return (
    <>
      {sectionSummaries && <SectionSummary summary={sectionSummaries.futures} />}
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Two Paths</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        Where do you go from here?
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 rounded-[var(--r)] overflow-hidden border border-[var(--border)] mb-[1.5rem]">
        <div className="bg-[#090910] p-[2.5rem_2rem]">
          <div className="inline-flex items-center gap-[5px] p-[3px_11px] rounded-full font-mono text-[10px] tracking-[0.12em] uppercase mb-[1.5rem] bg-[rgba(80,100,255,0.1)] text-[#8899FF] border border-[rgba(80,100,255,0.2)]">
            ● Future A — Stagnation
          </div>
          <h3 className="font-serif text-[1.45rem] font-light leading-[1.4] mb-[1rem] text-[#9999CC]">
            {futureA.title}
          </h3>
          <p className="text-[13px] leading-[1.8] text-[var(--muted)]">
            {futureA.narrative || futureA.fiveYears || futureA.oneYear || futureA.sixMonths}
          </p>
        </div>
        
        <div className="bg-[#090F09] p-[2.5rem_2rem]">
          <div className="inline-flex items-center gap-[5px] p-[3px_11px] rounded-full font-mono text-[10px] tracking-[0.12em] uppercase mb-[1.5rem] bg-[rgba(80,200,100,0.1)] text-[#88CC88] border border-[rgba(80,200,100,0.2)]">
            ● Future B — Realization
          </div>
          <h3 className="font-serif text-[1.45rem] font-light leading-[1.4] mb-[1rem] text-[var(--gold)]">
            {futureB.title}
          </h3>
          <p className="text-[13px] leading-[1.8] text-[var(--muted)]">
            {futureB.narrative || futureB.fiveYears || futureB.oneYear || futureB.sixMonths}
          </p>
        </div>
      </div>
      
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--r)] text-center p-[2rem]">
        <p className="text-[13px] text-[var(--muted)] mb-[0.5rem]">The distance between these two futures</p>
        <p className="font-serif text-[1.4rem] text-[var(--gold)]">One intentional decision per day.</p>
      </div>
    </>
  );
}
