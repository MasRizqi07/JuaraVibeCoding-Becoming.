import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

export function PanelLoader({ title = "Loading Data..." }: { title?: string }) {
  return (
    <div className="w-full min-h-[40vh] flex flex-col items-center justify-center space-y-[1.5rem]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-[2rem] h-[2rem] text-[var(--gold)] opacity-50" />
      </motion.div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
        {title}
      </div>
    </div>
  );
}
