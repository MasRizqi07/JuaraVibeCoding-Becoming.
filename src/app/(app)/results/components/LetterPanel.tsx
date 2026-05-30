import { useEffect, useState } from "react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import { PanelLoader } from "./PanelLoader";
import { SectionSummary } from "./SectionSummary";

export default function LetterPanel() {
  const { result } = useBecomingStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (!result) return null;
  if (isLoading) return <PanelLoader title="Processing Dispatch..." />;
  const { futureLetter, sectionSummaries } = result;

  const paragraphs = futureLetter.body.split('\n').filter(p => p.trim().length > 0);

  return (
    <>
      {sectionSummaries && <SectionSummary summary={sectionSummaries.letter} />}
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Dispatch</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        A message from your future.
      </h2>

      <div className="bg-[var(--bg2)] border border-[var(--border)] p-[3rem_2.5rem] rounded-[var(--r)]">
        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[2.5rem] border-b border-[var(--border)] pb-[1.5rem]">
          <div>FROM: {futureLetter.fromName} ({futureLetter.year})</div>
          <div>TO: {futureLetter.toName}</div>
          <div>STATUS: Delivered</div>
        </div>
        <div className="font-serif text-[1.35rem] text-[var(--text)] leading-[1.7]">
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-[1.5rem]">{p}</p>
          ))}
          <p className="color-[var(--muted)] font-italic mt-[2rem] opacity-70 italic">— {futureLetter.signature}</p>
        </div>
      </div>
    </>
  );
}
