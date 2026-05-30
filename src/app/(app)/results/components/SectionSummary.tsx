import { motion } from "motion/react";

interface SectionSummaryProps {
  summary?: string;
}

export function SectionSummary({ summary }: SectionSummaryProps) {
  if (!summary) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-[2rem] p-[1.5rem] bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)] flex items-start gap-[1rem]"
    >
      <div className="w-[4px] self-stretch bg-[var(--gold)] rounded-full opacity-70"></div>
      <div>
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gold)] mb-[0.5rem]">AI Summary</h4>
        <p className="text-[13px] text-[var(--muted)] leading-[1.6]">
          {summary}
        </p>
      </div>
    </motion.div>
  );
}
