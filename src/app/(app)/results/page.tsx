import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { useBecomingStore } from "../../../store/useBecomingStore";
import { cn } from "../../../lib/utils";

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
  const { result, activeView, setActiveView } = useBecomingStore();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  
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

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-10 flex flex-col pt-0 pb-0 overflow-y-auto items-start">
      <OnboardingTour />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      <div className="w-full min-h-screen flex flex-col">
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
          <div className="flex items-center gap-[0.5rem]">
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
    </div>
  );
}
