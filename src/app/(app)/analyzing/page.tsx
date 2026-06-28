import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useBecomingStore } from "../../../store/useBecomingStore";

const AI_THOUGHTS = [
  "Reading your patterns...",
  "Mapping your trajectory...",
  "Identifying blind spots...",
  "Projecting futures...",
  "Synthesizing your archetype...",
  "Writing your letter...",
  "Building your roadmap...",
  "Finalizing your profile..."
];

export default function AnalyzingPage() {
  const navigate = useNavigate();
  const { analysisStep, analysisProgress, triggerAnalysis, retryAttempt, retryDelaySec, retryingMessage } = useBecomingStore();
  const [error, setError] = useState("");
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (analysisStep === 'idle' && !error && !hasStarted) {
      setHasStarted(true);
      triggerAnalysis().catch((err: any) => {
        if (isMounted) {
          console.error(err);
          let detail = "Please verify your configuration and try again.";
          const msg = err?.message || "";
          if (msg.includes("API key") || msg.includes("key not valid")) {
            detail = "Your Gemini API key appears to be missing or invalid. Please check your environment variables or application settings.";
          } else if (msg.includes("fetch") || msg.includes("network")) {
            detail = "We encountered a network issue while connecting to the intelligence engine. Please check your connection.";
          } else if (msg.includes("429") || msg.includes("quota")) {
            detail = "The AI model is currently overloaded or out of quota. Please wait a moment and try again.";
          } else if (msg.includes("parse") || msg.includes("JSON")) {
             detail = "The AI generated an unexpected response format. Please try again.";
          }
          setError(`System Analysis Failed: ${detail}`);
        }
      });
    }
    return () => { isMounted = false; };
  }, [analysisStep, triggerAnalysis, error, hasStarted]);

  useEffect(() => {
    if (analysisStep === 'complete') {
      setTimeout(() => navigate('/results'), 700);
    }
  }, [analysisStep, navigate]);

  useEffect(() => {
    if (analysisStep === 'complete' || error) return;
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % AI_THOUGHTS.length);
    }, 900);
    return () => clearInterval(interval);
  }, [analysisStep, error]);

  const messages = {
    idle: "Preparing...",
    scanning: "Reading your patterns...",
    projecting: "Projecting futures...",
    generating: "Building your roadmap...",
    retrying: "Model Overloaded. Retrying shortly...",
    complete: "Finalizing your profile..."
  };

  const activeMsg = messages[analysisStep] || AI_THOUGHTS[thoughtIndex];

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center p-[2rem]">
      <div className="relative w-[130px] h-[130px] mx-auto mb-[3rem]">
        <div className="absolute inset-0 rounded-full border border-[var(--border-gold)] animate-[pulse-ring_3.5s_ease-in-out_infinite]" />
        <div className="absolute inset-[18px] rounded-full border border-[rgba(201,168,68,0.12)] animate-[pulse-ring_3.5s_ease-in-out_infinite] [animation-delay:0.6s]" />
        <div className="absolute inset-[36px] rounded-full bg-[var(--gold-a)] border-none animate-[pulse-ring_3.5s_ease-in-out_infinite] [animation-delay:1.2s]" />
        <div className="absolute inset-[50px] rounded-full bg-[var(--gold)] opacity-80 animate-[pulse-ring_2.5s_ease-in-out_infinite] [animation-delay:1.8s]" />
      </div>

      <AnimatePresence mode="wait">
        {!error ? (
          <motion.div
            key={activeMsg}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full flex justify-center flex-col items-center"
          >
            <div className="font-serif text-[22px] font-light text-[var(--text)] mb-[0.75rem] min-h-[30px]">
              {activeMsg}
            </div>
            
            {analysisStep === 'retrying' ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-[2rem] text-[var(--gold)] font-mono text-[10px] uppercase tracking-[0.25em] px-5 py-4 rounded bg-[var(--gold-a)]/5 border border-[var(--border-gold)]/20 flex flex-col items-center gap-2 max-w-sm w-full divide-y divide-[var(--border-gold)]/10"
              >
                <div className="flex items-center gap-2 pb-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-ping" />
                  <span className="font-bold">Model Overloaded (429 Rate Limited)</span>
                </div>
                <div className="w-full grid grid-cols-3 gap-2 text-center py-2 text-[9px] tracking-widest text-[var(--muted)]">
                  <div>
                    <span className="block text-[11px] font-bold text-[var(--gold)]">{retryAttempt}</span>
                    <span>ATTEMPT</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-[var(--gold)]">#{Math.max(1, 4 - retryAttempt)}</span>
                    <span>QEUEUE POS</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-[var(--gold)]">{retryDelaySec || 0}s</span>
                    <span>EST WAIT</span>
                  </div>
                </div>
                <div className="pt-2 w-full text-center">
                  <span className="text-[10px] text-[var(--text)]/60 normal-case tracking-normal block">
                    {retryingMessage || "Waiting for secure intelligence slot..."}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="font-mono text-[11px] tracking-[0.15em] text-[var(--muted)] mb-[2rem]">
                Processing {Math.min(thoughtIndex + 1, AI_THOUGHTS.length)} of {AI_THOUGHTS.length}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-[2rem] w-full max-w-md border border-[#ef444455] bg-[#ef44440a] p-[1.5rem] rounded-[var(--r)]"
          >
            <h2 className="font-mono tracking-[0.1em] text-[11px] uppercase text-[#ef4444] mb-[0.5rem]">
              Generation Failed
            </h2>
            <p className="text-[var(--muted)] text-[13px] mb-[1.5rem] leading-[1.6]">
              {error}
            </p>
            <button 
              onClick={() => { setError(""); setHasStarted(false); }}
              className="px-[1.5rem] py-[0.6rem] bg-transparent border border-[var(--border)] text-[var(--text)] text-[11px] rounded-[var(--rs)] uppercase tracking-[0.1em] hover:bg-[#fff1] transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-[220px] h-[1px] bg-[var(--border)] mx-auto overflow-hidden">
        <motion.div 
          className="h-full bg-[var(--gold)]"
          initial={{ width: 0 }}
          animate={{ width: `${analysisProgress}%` }}
          transition={{ ease: "linear", duration: 0.3 }}
        />
      </div>
    </div>
  );
}
