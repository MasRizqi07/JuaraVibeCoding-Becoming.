import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBecomingStore } from "../store/useBecomingStore";
import { motion, AnimatePresence } from "motion/react";

// Accessibly query prefers-reduced-motion dynamically
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);
  return reduced;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useBecomingStore();
  const [exiting, setExiting] = useState(false);
  const shouldReduceMotion = usePrefersReducedMotion();

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      if (user) navigate("/reflect");
      else navigate("/signin");
    }, 600);
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.6 }}
          className="fixed inset-0 flex items-center justify-center p-8 z-10 flex-col text-center"
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* TASK 6: Mixed-case copywriting with soft italic alignment */}
            <motion.p 
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="font-sans text-sm text-[var(--gold)]/80 tracking-[0.15em] italic mb-10"
            >
              An AI-powered mirror for your soul
            </motion.p>
            
            {/* TASK 1: Restructured Visual Hierarchy (Prominence ratios paired beautifully) */}
            <h1 className="flex flex-col items-center justify-center mb-8">
              {/* Who are you (60-70% of Becoming? in size and reduced weight/opacity) */}
              <div className="overflow-hidden mb-1">
                <motion.span 
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 22 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }} 
                  className="block font-serif text-[clamp(1.8rem,5.5vw,4.2rem)] font-light text-[var(--text)] opacity-75 tracking-tight leading-tight"
                >
                  Who are you
                </motion.span>
              </div>
              
              {/* Becoming? (Hero accentuation with subtle zoom and clear prominence) */}
              <div className="overflow-hidden">
                <motion.span 
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  transition={{ duration: 0.9, delay: 0.8, ease: "easeOut" }} 
                  className="block font-serif text-[clamp(3.2rem,10vw,8rem)] font-semibold text-[var(--gold)] leading-none"
                >
                  Becoming?
                </motion.span>
              </div>
            </h1>
            
            <motion.p 
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.1, ease: "easeOut" }}
              className="text-[14px] text-[var(--muted)] max-w-[340px] leading-[1.7] mb-14 font-sans"
            >
              Reflect deeply. Surface blind spots.<br/>See two versions of your future.
            </motion.p>
            
            {/* TASK 2: Filled gold CTA button with interactive shimmer effect & accessibility labels */}
            <motion.button 
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.4, ease: "easeOut" }}
              onClick={handleEnter}
              aria-label="Begin the Becoming experience"
              className="group relative overflow-hidden px-[40px] py-[16px] bg-[var(--gold)] border border-[var(--gold)] text-[#0a0a0a] font-mono text-[11px] tracking-[0.2em] uppercase rounded-[var(--rs)] transition-all duration-300 hover:bg-[#D4B04A] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer btn-shimmer font-semibold"
            >
              <span className="relative z-10">Enter Experience</span>
              <span className="relative z-10 inline-block transition-transform duration-300 group-hover:translate-x-[5px] ml-1">→</span>
            </motion.button>
          </div>
          
          {/* TASK 7: Clearly intentional animated bottom decorative cue */}
          <motion.div 
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 1, delay: 2.0 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 origin-top"
          >
            <div className="w-[1px] h-[44px] bg-gradient-to-b from-[var(--gold)] to-transparent animate-[lineFlow_2.5s_ease-in-out_infinite]"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
