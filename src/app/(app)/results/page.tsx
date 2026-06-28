import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Image as ImageIcon } from "lucide-react";
import { useBecomingStore } from "../../../store/useBecomingStore";
import { cn } from "../../../lib/utils";
import html2canvas from "html2canvas";

import OverviewPanel from "./components/OverviewPanel";
import FutureSplitPanel from "./components/FutureSplitPanel";
import IdentityPanel from "./components/IdentityPanel";
import LetterPanel from "./components/LetterPanel";
import PlanPanel from "./components/PlanPanel";
import SharePanel from "./components/SharePanel";
import HistoryPanel from "./components/HistoryPanel";

import { FeedbackModal } from "../../../components/shared/FeedbackModal";
import { OnboardingTour } from "../../../components/shared/OnboardingTour";

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'split', label: 'Futures' },
  { id: 'identity', label: 'Identity' },
  { id: 'letter', label: 'Letter' },
  { id: 'plan', label: 'Plan' },
  { id: 'share', label: 'Share' },
  { id: 'history', label: 'History' }
];

export default function ResultsPage() {
  const navigate = useNavigate();
  const { result, activeView, setActiveView, user } = useBecomingStore();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const hiddenCardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('becoming-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('becoming-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (!result) {
      navigate('/reflect');
    }
  }, [result, navigate]);

  const handleExportIdentityCard = async () => {
    if (!hiddenCardRef.current || !result) return;
    setIsGeneratingCard(true);
    try {
      const canvas = await html2canvas(hiddenCardRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        backgroundColor: "#000"
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const userDisplay = user?.displayName || "user";
      a.download = `becoming-identity-${userDisplay.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
    } catch (e) {
      console.error("Identity Card capture failed", e);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-10 flex flex-col pt-0 pb-0 overflow-y-auto items-start">
      <OnboardingTour />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      <div className="w-full min-h-screen flex flex-col results-shell">
        {/* Nav */}
        <nav 
          className="sticky top-0 z-[100] backdrop-blur-[14px] border-b border-[var(--border)] px-[1.5rem] flex flex-wrap items-center justify-between gap-[1rem]"
          style={{ backgroundColor: 'var(--bg-alpha)' }}
        >
          <div className="font-serif text-[18px] font-normal py-[1rem] shrink-0">Becoming.</div>
          <div 
            id="results-nav" 
            role="tablist"
            className="flex md:hidden overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] flex-1"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeView === tab.id}
                aria-controls="results-content"
                onClick={() => setActiveView(tab.id as any)}
                className={cn(
                  "px-[1.1rem] py-[0.9rem] bg-none border-b-2 font-sans text-[12px] whitespace-nowrap transition-all duration-200 cursor-pointer hover:text-[var(--text)]",
                  activeView === tab.id 
                    ? "text-[var(--gold)] border-[var(--gold)]" 
                    : "text-[var(--muted)] border-transparent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-[0.5rem] py-2 md:py-0">
            <button
              onClick={handleExportIdentityCard}
              disabled={isGeneratingCard}
              className="px-[12px] py-[6px] bg-[var(--gold)] hover:bg-[#D4B04A] disabled:opacity-50 text-black border-none rounded flex items-center justify-center gap-[0.4rem] font-sans text-[11px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
              title="Export Identity Card as PNG"
              aria-label="Export Identity Card as PNG"
            >
              <ImageIcon className="w-3.5 h-3.5 text-black animate-pulse" aria-hidden="true" />
              <span>{isGeneratingCard ? "Exporting..." : "Export Card"}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-[6px] bg-transparent border border-[var(--border)] rounded flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)] transition-colors"
              title="Toggle Theme"
              aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" aria-hidden="true" /> : <Moon className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
            <button 
              id="feedback-btn"
              onClick={() => setIsFeedbackOpen(true)}
              className="px-[15px] py-[6px] bg-transparent border border-[var(--border)] rounded flex items-center justify-center font-sans text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)] transition-colors whitespace-nowrap"
              aria-label="Open feedback form"
            >
              Feedback
            </button>
          </div>
        </nav>

        {/* Body */}
        <div className="flex-1 w-full max-w-[1200px] mx-auto flex flex-col md:flex-row items-start relative px-[1rem] md:px-[2rem] lg:px-[4rem]">
          {/* Sidebar Navigation (Large Screens) */}
          <aside className="hidden md:flex flex-col sticky top-[80px] w-[200px] shrink-0 pt-[2rem] gap-[0.5rem] mt-[1rem]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeView === tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={cn(
                  "text-left px-[1rem] py-[0.75rem] rounded-[var(--rs)] font-sans text-[13px] transition-all duration-200 cursor-pointer border-l-[2px]",
                  activeView === tab.id 
                    ? "bg-[var(--bg2)] text-[var(--gold)] border-[var(--gold)]" 
                    : "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--text)] hover:bg-[var(--bg3)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Main Content Area */}
          <div id="results-content" className="p-[2rem_0] md:p-[3rem_2rem] max-w-[800px] w-full flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {activeView === 'overview' && <OverviewPanel />}
                {activeView === 'split' && <FutureSplitPanel />}
                {activeView === 'identity' && <IdentityPanel />}
                {activeView === 'letter' && <LetterPanel />}
                {activeView === 'plan' && <PlanPanel />}
                {activeView === 'share' && <SharePanel />}
                {activeView === 'history' && <HistoryPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hidden Card container for PNG export style-matched exactly offscreen */}
      <div style={{ position: 'absolute', left: '-10000px', top: '-10000px', pointerEvents: 'none' }} aria-hidden="true">
        <div 
          ref={hiddenCardRef} 
          className="w-[300px] bg-[#000] border border-[rgba(255,255,255,0.12)] aspect-[3/4] flex flex-col justify-between p-[2rem] text-left relative overflow-hidden"
          style={{ letterSpacing: 'normal' }}
        >
          <div style={{ color: '#fff' }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[rgba(240,237,230,0.55)] mb-[0.5rem]" style={{ fontFamily: 'monospace' }}>Archetype</p>
            <h3 className="font-sans text-[1.4rem] font-light leading-[1.2] tracking-[-0.02em]" style={{ margin: 0, color: '#fff' }}>
              {result.shareCard.archetype}
            </h3>
          </div>
          <div style={{ color: '#fff' }}>
            <div className="flex justify-between border-b border-[rgba(255,255,255,0.1)] pb-[0.5rem] mb-[0.5rem] font-mono text-[10px] uppercase tracking-[0.1em]" style={{ fontFamily: 'monospace' }}>
              <span className="text-[rgba(240,237,230,0.55)]">Readiness</span><span>{result.shareCard.aiReadiness}%</span>
            </div>
            <div className="flex justify-between border-b border-[rgba(255,255,255,0.1)] pb-[0.5rem] mb-[0.5rem] font-mono text-[10px] uppercase tracking-[0.1em]" style={{ fontFamily: 'monospace' }}>
              <span className="text-[rgba(240,237,230,0.55)]">Velocity</span><span>{result.shareCard.growthPotential}</span>
            </div>
          </div>
          <p className="font-serif text-[1.2rem] italic" style={{ fontSize: '1.2rem', fontFamily: 'serif', fontStyle: 'italic', color: '#fff', margin: 0 }}>
            "{result.shareCard.tagline || "I stopped waiting for the perfect moment."}"
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: '#C9A844', fontFamily: 'monospace', margin: 0 }}>
            Becoming.
          </p>
        </div>
      </div>
    </div>
  );
}
