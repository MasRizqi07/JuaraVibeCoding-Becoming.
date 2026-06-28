import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBecomingStore } from "../store/useBecomingStore";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Compass, ShieldAlert, Cpu, Heart, Code, ArrowRight, Sun, Moon, Globe } from "lucide-react";
import { WebGLShader } from "../components/ui/web-gl-shader";
import { MetalButton, LiquidButton, Button } from "../components/ui/liquid-glass-button";

// Accessibly query prefers-reduced-motion dynamically
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);
  return reduced;
}

const translations = {
  en: {
    decisionQuote: "“Every decision shapes someone.”",
    becomingQuestion: "Who are you becoming?",
    enterCTA: "ENTER EXPERIENCE",
    brandingSignature: "Becoming. Staged Architecture",
    logoText: "Becoming.",
    dashboard: "Dashboard",
    loggedInAs: "Logged in as",
    trajectoryProjection: "TRAJECTORY PROJECTION SYSTEM",
    mainHeadline: "The future version of you is watching.",
    mainSubheadline: "Becoming uses AI to simulate the dual pathways your current habits are creating. Reflect today to steer your tomorrow.",
    beginReflection: "Begin Reflection",
    seeFuture: "See My Future",
    geminiCopilot: "Gemini LLM Co-Pilot",
    evolutionTrack: "12-Week Evolution Track",
    trajectoryA_title: "The Drifting Path",
    trajectoryA_desc: "Comfort without structure compounding silently into long-term stagnation and regret.",
    trajectoryA_metric: "Regret metric: High",
    trajectoryB_title: "The Aligned Path",
    trajectoryB_desc: "Structured focus, dynamic technological adaptation and pristine personal momentum.",
    trajectoryB_metric: "Actualization: Elite",
    footerText: "Becoming. Unified Trajectory Simulation.",
    themeDark: "Dark",
    themeLight: "Light"
  },
  id: {
    decisionQuote: "“Setiap keputusan membentuk seseorang.”",
    becomingQuestion: "Menjadi siapakah Anda?",
    enterCTA: "MASUK KE PENGALAMAN",
    brandingSignature: "Menjadi. Arsitektur Terencana",
    logoText: "Menjadi.",
    dashboard: "Dasbor",
    loggedInAs: "Masuk sebagai",
    trajectoryProjection: "SISTEM PROYEKSI TRAJEKTORI",
    mainHeadline: "Versi masa depan Anda sedang mengamati.",
    mainSubheadline: "Becoming menggunakan AI untuk mensimulasikan dua jalur berbeda dari kebiasaan Anda saat ini. Lakukan refleksi hari ini untuk mengarahkan hari esok Anda.",
    beginReflection: "Mulai Refleksi",
    seeFuture: "Lihat Masa Depan Saya",
    geminiCopilot: "Ko-Pilot LLM Gemini",
    evolutionTrack: "Jaringan Evolusi 12 Minggu",
    trajectoryA_title: "Jalur Hanyut",
    trajectoryA_desc: "Kenyamanan tanpa struktur yang menumpuk secara diam-diam menjadi kemandekan dan penyesalan jangka panjang.",
    trajectoryA_metric: "Metrik penyesalan: Tinggi",
    trajectoryB_title: "Jalur Selaras",
    trajectoryB_desc: "Fokus terstruktur, adaptasi teknologi yang dinamis, dan momentum pribadi eksklusif.",
    trajectoryB_metric: "Aktualisasi: Elit",
    footerText: "Menjadi. Simulasi Trajektori Terpadu.",
    themeDark: "Gelap",
    themeLight: "Terang"
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, startSession, loadUserState } = useBecomingStore();
  const shouldReduceMotion = usePrefersReducedMotion();

  // Unified Theme and Language state with standard persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('becoming-theme') as 'dark' | 'light') || 'dark';
  });

  const [lang, setLang] = useState<'en' | 'id'>(() => {
    return (localStorage.getItem('becoming-lang') as 'en' | 'id') || 'en';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('becoming-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('becoming-lang', lang);
  }, [lang]);

  // Experience progression tabs: 'intro' (Black Screen) | 'hero' (Cinematic Hero Dashboard)
  const [activeStep, setActiveStep] = useState<'intro' | 'hero'>('intro');
  const [actionLoading, setActionLoading] = useState(false);

  // Background particle models
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; s: number; d: number }>>([]);

  useEffect(() => {
    // Generate custom floating coordinate arrays
    const list = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 2.5 + 0.5,
      d: Math.random() * 15 + 10,
    }));
    setParticles(list);
  }, []);

  const handleEnterExperience = () => {
    setActiveStep('hero');
  };

  const handleBeginReflection = async () => {
    setActionLoading(true);
    try {
      if (!user) {
        await signInWithGoogle();
      }
      await startSession();
      navigate("/reflect");
    } catch (e) {
      console.error("Failed to start reflection session:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeeFuture = async () => {
    setActionLoading(true);
    try {
      if (!user) {
        await signInWithGoogle();
      }
      await loadUserState();
      navigate("/results");
    } catch (e) {
      console.error("Failed to load results:", e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] select-none relative overflow-hidden font-sans transition-colors duration-500">
      {/* Immersive WebGL Neural Grid background shader */}
      <WebGLShader />

      {/* Dynamic Starcraft Floating Particles Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-[#110f0a]/30 via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0" style={{ filter: "blur(1px)" }}>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-[var(--gold)]/20"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.s}px`,
                height: `${p.s}px`,
              }}
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      y: [0, -120, 0],
                      opacity: [0.1, 0.7, 0.1],
                      x: [0, p.id % 2 === 0 ? 30 : -30, 0],
                    }
              }
              transition={{
                duration: p.d,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeStep === 'intro' ? (
          /* 🖤 THE BLACK OPENING EXPERIENCE */
          <motion.div
            key="opening-intro"
            initial={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="fixed inset-0 bg-[#000] flex flex-col items-center justify-center p-6 z-50 text-center"
          >
            {/* Background deep atmospheric overlay */}
            <div className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle,_rgba(201,168,68,0.03)_0%,_transparent_70%)] rounded-full pointer-events-none" />

            {/* Elegant Language Selector on Intro Screen (Top Right) */}
            <div className="absolute top-[2rem] right-[2rem] z-50 flex items-center bg-neutral-900/60 border border-neutral-800/80 rounded-[var(--rs)] p-[0.15rem]">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 text-[9px] font-mono rounded-[var(--rs)] transition-all cursor-pointer ${lang === 'en' ? 'bg-[var(--gold)] text-black font-bold' : 'text-neutral-500 hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('id')}
                className={`px-2 py-1 text-[9px] font-mono rounded-[var(--rs)] transition-all cursor-pointer ${lang === 'id' ? 'bg-[var(--gold)] text-black font-bold' : 'text-neutral-500 hover:text-white'}`}
              >
                ID
              </button>
            </div>

            <div className="max-w-[500px] flex flex-col items-center justify-center relative z-20">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
                className="font-serif text-[clamp(1.4rem,4vw,2.10rem)] font-light tracking-tight text-[#e0dad0]/90 mb-[1.75rem] italic"
              >
                {translations[lang].decisionQuote}
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2.0, delay: 2.4, ease: "easeInOut" }}
                className="font-mono text-[11px] tracking-[0.45em] uppercase text-[var(--gold)]/80 mb-[4.5rem]"
              >
                {translations[lang].becomingQuestion}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.95, y: 0 }}
                transition={{ duration: 1.2, delay: 4.2 }}
                className="flex justify-center"
              >
                <LiquidButton
                  onClick={handleEnterExperience}
                  aria-label="Enter experience"
                  id="enter-experience-btn"
                  className="text-[#f5f2eb] border-neutral-800 bg-transparent transition-all"
                  size="xl"
                >
                  <span className="font-mono tracking-[0.3em] text-[11px] uppercase font-bold text-white relative z-10">
                    {translations[lang].enterCTA}
                  </span>
                </LiquidButton>
              </motion.div>
            </div>

            {/* Ambient branding signature */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 1, delay: 5.5 }}
              className="absolute bottom-[3rem] font-mono text-[9px] uppercase tracking-[0.2em] text-[#e0dad0]/60"
            >
              {translations[lang].brandingSignature}
            </motion.div>
          </motion.div>
        ) : (
          /* 🌠 HERO SECTION & VISUAL PARADIGM */
          <motion.div
            key="main-hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="w-full relative z-10 flex flex-col min-h-screen"
          >
            {/* Minimalist Top App Navigation */}
            <header className="w-full border-b border-[var(--border)] py-[1rem] px-[1.5rem] sm:px-[2rem] flex justify-between items-center bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-500">
              <div className="flex items-center gap-[0.75rem]">
                <div className="w-[12px] h-[12px] bg-[var(--gold)] rounded-sm" />
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] font-bold text-[var(--text)]">
                  {translations[lang].logoText}
                </span>
              </div>
              
              <div className="flex items-center gap-[0.75rem] sm:gap-[1rem]">
                {user && (
                  <div className="hidden md:flex items-center gap-[0.5rem] font-mono text-[10px] text-[var(--muted)]">
                    <span>{translations[lang].loggedInAs} {user.displayName}</span>
                  </div>
                )}

                {user && (
                  <button 
                    onClick={() => navigate("/results")}
                    className="bg-transparent border border-[var(--border)] text-[var(--text)] hover:border-[var(--gold)] p-[0.4rem_1rem] rounded-[var(--rs)] text-[11px] font-mono uppercase tracking-[0.05em] cursor-pointer transition-all shrink-0"
                  >
                    {translations[lang].dashboard}
                  </button>
                )}

                {/* Unified Language Selection Control Group */}
                <div className="flex items-center bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--rs)] p-[0.15rem] shrink-0">
                  <button
                    onClick={() => setLang('en')}
                    className={`px-2 py-0.5 text-[9px] font-mono rounded-[var(--rs)] transition-all cursor-pointer ${lang === 'en' ? 'bg-[var(--gold)] text-black font-bold shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                    title="English"
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLang('id')}
                    className={`px-2 py-0.5 text-[9px] font-mono rounded-[var(--rs)] transition-all cursor-pointer ${lang === 'id' ? 'bg-[var(--gold)] text-black font-bold shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                    title="Bahasa Indonesia"
                  >
                    ID
                  </button>
                </div>

                {/* Ultimate Aesthetic Material Mode Switcher */}
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--rs)] border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all cursor-pointer shrink-0"
                  aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
                  title={theme === 'dark' ? "Light Mode" : "Dark Mode"}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex-1 flex flex-col justify-center w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
                {/* Visual Paradigm Messaging */}
                <div className="text-left flex flex-col gap-6 md:pr-4">
                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7 }}
                    className="flex items-center gap-[0.5rem] text-[var(--gold)] font-mono text-[10px] uppercase tracking-[0.25em]"
                  >
                    <Sparkles className="w-4 h-4 text-[var(--gold)] animate-pulse" />
                    <span>{translations[lang].trajectoryProjection}</span>
                  </motion.div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
                    className="font-serif text-[clamp(2.4rem,4.5vw,4.4rem)] font-light leading-[1.1] tracking-tight text-[var(--text)]"
                  >
                    {lang === 'en' ? (
                      <>
                        The future version of <span className="text-[var(--gold)] font-normal italic">you</span> is watching.
                      </>
                    ) : (
                      <>
                        Versi masa depan <span className="text-[var(--gold)] font-normal italic">Anda</span> sedang mengamati.
                      </>
                    )}
                  </motion.h1>

                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    className="text-[15px] text-[var(--muted)] leading-[1.7] font-sans max-w-[500px]"
                  >
                    {translations[lang].mainSubheadline}
                  </motion.p>

                  {/* Operational Interaction CTAs */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row gap-4 mt-4 items-stretch sm:items-center"
                  >
                    <MetalButton
                      onClick={handleBeginReflection}
                      disabled={actionLoading}
                      aria-label="Begin personal reflection"
                      variant="gold"
                      className="px-[30px] font-mono text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-[0.5rem] h-12 shrink-0 cursor-pointer"
                    >
                      <span>{translations[lang].beginReflection}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </MetalButton>

                    <button
                      onClick={handleSeeFuture}
                      disabled={actionLoading}
                      aria-label="See historical analytical future results"
                      className="px-[30px] h-12 bg-transparent border border-[var(--border)] hover:bg-[#ffffff05] hover:border-[var(--text)] text-[var(--text)] rounded-md font-mono text-[11px] uppercase tracking-[0.15em] transition-all cursor-pointer flex items-center justify-center"
                    >
                      {translations[lang].seeFuture}
                    </button>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex items-center gap-6 mt-6 pt-6 border-t border-[var(--border)] justify-start text-[var(--muted)] font-mono text-[10px]"
                  >
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-[var(--gold)]" />
                      <span>{translations[lang].geminiCopilot}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-[var(--gold)]" />
                      <span>{translations[lang].evolutionTrack}</span>
                    </div>
                  </motion.div>
                </div>

                {/* Staggered Holographic Floating Trajectory Cards */}
                <div className="relative flex items-center justify-center p-4 lg:p-0">
                  {/* Subtle central holographic reactor glow */}
                  <div className="absolute w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(201,168,68,0.05)_0%,_transparent_75%)] rounded-full pointer-events-none" />

                  {/* Neural Grid constellation simulation vectors with high-fidelity floating animation */}
                  <motion.svg 
                    animate={{
                      y: [0, -10, 0],
                      rotate: [0, 1.2, -1.2, 0],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute w-[360px] h-[360px] text-[var(--border)] opacity-30 select-none pointer-events-none" 
                    viewBox="0 0 200 200"
                  >
                    <line x1="20" y1="50" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="180" y1="40" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="100" y1="100" x2="150" y2="170" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="100" y1="100" x2="50" y2="160" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                    <circle cx="20" cy="50" r="1.5" fill="var(--gold)" />
                    <circle cx="180" cy="40" r="1.5" fill="var(--gold)" />
                    <circle cx="100" cy="100" r="2.5" fill="var(--gold)" className="animate-ping" />
                    <circle cx="150" cy="170" r="1.5" fill="currentColor" />
                    <circle cx="50" cy="160" r="1.5" fill="currentColor" />
                  </motion.svg>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-[500px] select-none relative z-10">
                    {/* Trajectory Card A: Drifting Stagnancy */}
                    <motion.div
                      whileHover={{ y: -8, scale: 1.01 }}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="bg-[var(--bg2)]/75 border border-rose-950/40 hover:border-rose-500/40 rounded-[var(--r)] p-[1.5rem] text-left relative overflow-hidden backdrop-blur-md flex flex-col justify-between aspect-[4/5] transition-colors duration-300"
                    >
                      <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-radial bg-gradient-to-br from-rose-950/15 to-transparent pointer-events-none" />
                      <div>
                        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-rose-400 mb-4">
                          <span>Trajectory Alpha</span>
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        </div>
                        <h4 className="font-serif text-[1.4rem] font-light leading-tight text-rose-100 mb-2">{translations[lang].trajectoryA_title}</h4>
                        <p className="font-sans text-[12px] text-[var(--muted)] leading-relaxed">
                          {translations[lang].trajectoryA_desc}
                        </p>
                      </div>
                      <div className="font-mono text-[9px] tracking-[0.05em] text-rose-500 uppercase mt-4">
                        {translations[lang].trajectoryA_metric}
                      </div>
                    </motion.div>

                    {/* Trajectory Card B: Aligned Self-Actualization */}
                    <motion.div
                      whileHover={{ y: -8, scale: 1.01 }}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      className="bg-[var(--bg2)]/75 border border-[var(--border)] hover:border-[var(--gold)]/50 rounded-[var(--r)] p-[1.5rem] text-left relative overflow-hidden backdrop-blur-md flex flex-col justify-between aspect-[4/5] sm:translate-y-[24px] transition-colors duration-300"
                    >
                      <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-radial bg-gradient-to-br from-[var(--gold)]/10 to-transparent pointer-events-none" />
                      <div>
                        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--gold)] mb-4">
                          <span>Trajectory Beta</span>
                          <Sparkles className="w-3.5 h-3.5 shrink-0 text-[var(--gold)]" />
                        </div>
                        <h4 className="font-serif text-[1.4rem] font-light leading-tight text-[var(--text)] mb-2">{translations[lang].trajectoryB_title}</h4>
                        <p className="font-sans text-[12px] text-[var(--muted)] leading-relaxed">
                          {translations[lang].trajectoryB_desc}
                        </p>
                      </div>
                      <div className="font-mono text-[9px] tracking-[0.05em] text-[var(--gold)] uppercase mt-4">
                        {translations[lang].trajectoryB_metric}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </main>

            {/* Cinematic Minimal Footer */}
            <footer className="w-full text-center border-t border-[var(--border)] py-[1.5rem] mt-auto font-mono text-[9.5px] text-[var(--muted)] uppercase tracking-[0.25em] bg-[var(--bg2)]/40 transition-colors duration-500">
              © {new Date().getFullYear()} {translations[lang].footerText}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
