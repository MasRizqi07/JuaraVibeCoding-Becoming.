import { useEffect, useState } from "react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import { PanelLoader } from "./PanelLoader";
import { SectionSummary } from "./SectionSummary";

export default function PlanPanel() {
  const { result } = useBecomingStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);
  
  if (!result) return null;
  if (isLoading) return <PanelLoader title="Generating Blueprint..." />;
  const { transformationPlan, sectionSummaries } = result;

  return (
    <>
      {sectionSummaries && <SectionSummary summary={sectionSummaries.plan} />}
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Blueprint</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        How you actually get there.
      </h2>
      
      <div className="bg-[var(--bg2)] border border-[var(--border)] p-[2rem] rounded-[var(--r)] mb-[1.5rem]">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.5rem]">Your Optimization Goal</p>
        <p className="font-serif text-[2rem] text-[var(--text)] leading-[1]">
          {transformationPlan.focusKeyword}
        </p>
      </div>

      <div className="border-l border-[var(--border)] pl-[1.5rem] mt-[2rem]">
        {transformationPlan.learningRoadmap.map((phase, i) => (
          <div key={i} className={i < transformationPlan.learningRoadmap.length - 1 ? "mb-[2rem]" : ""}>
            <p className={`font-mono text-[11px] uppercase tracking-[0.15em] mb-[0.5rem] ${i === 0 ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>
              Phase {i + 1}: {phase.phase}
            </p>
            <p className="font-sans text-[1.05rem] text-[var(--text)] leading-[1.5]">
              {phase.focus}. {phase.milestones.join(' ')}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
