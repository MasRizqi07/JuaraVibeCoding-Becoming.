import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useBecomingStore } from '../../../store/useBecomingStore';
import { generateFollowUpQuestions } from '../../../lib/gemini';

const HARDCODED_QUESTIONS = [
  { question: "What is the one thing you want most from your life right now, and what is stopping you?", category: "fear" },
  { question: "Describe the last moment when you felt completely in your element. What were you doing, and why did it feel that way?", category: "identity" },
  { question: "What belief about yourself are you most afraid might actually be true?", category: "fear" },
  { question: "If failure was guaranteed not to matter, what would you attempt in the next 12 months?", category: "ambition" },
  { question: "Which version of yourself do you perform for others — and who are you when nobody is watching?", category: "identity" }
];
const TOTAL_QUESTIONS = 8;

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

export default function ReflectPage() {
  const navigate = useNavigate();
  const { 
    currentSession, 
    currentQuestionIndex, 
    startSession, 
    submitAnswer, 
    skipQuestion, 
    user, 
    saveDraftAnswer,
    generatedQuestions,
    setGeneratedQuestions
  } = useBecomingStore();
  
  const [currentQ, setCurrentQ] = useState(HARDCODED_QUESTIONS[0]);
  const [answerText, setAnswerText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const shouldReduceMotion = usePrefersReducedMotion();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasRestoredDraftRef = useRef(false);

  useEffect(() => {
    if (!currentSession) {
      startSession();
    }
  }, [currentSession, startSession]);

  useEffect(() => {
    if (currentSession && currentSession.status === 'in_progress') {
      if (currentQuestionIndex < HARDCODED_QUESTIONS.length) {
        setCurrentQ(HARDCODED_QUESTIONS[currentQuestionIndex]);
        if (!hasRestoredDraftRef.current && currentSession.draftAnswer) {
          setAnswerText(currentSession.draftAnswer);
          hasRestoredDraftRef.current = true;
        } else {
          setAnswerText("");
        }
      } else if (currentQuestionIndex < TOTAL_QUESTIONS) {
        const offset = currentQuestionIndex - HARDCODED_QUESTIONS.length;
        
        const loadActiveQuestion = (questionsArray: { question: string; category: string }[]) => {
          const q = questionsArray[offset] || { question: "Is there anything else you want to tell your future self?", category: "reflection" };
          setCurrentQ(q);
          if (!hasRestoredDraftRef.current && currentSession.draftAnswer) {
            setAnswerText(currentSession.draftAnswer);
            hasRestoredDraftRef.current = true;
          } else {
            setAnswerText("");
          }
          setIsProcessing(false);
        };

        if (generatedQuestions && generatedQuestions.length > offset) {
          loadActiveQuestion(generatedQuestions);
        } else {
          setIsProcessing(true);
          const countToFetch = TOTAL_QUESTIONS - HARDCODED_QUESTIONS.length;
          generateFollowUpQuestions(currentSession.answers, currentQuestionIndex, user?.uid || 'anonymous', countToFetch)
            .then(res => {
              const qs = res.questions || [];
              setGeneratedQuestions(qs);
              loadActiveQuestion(qs);
            })
            .catch(err => {
              console.error("AI questions bundle failed, falling back gracefully:", err);
              const fallbackQs = [
                { question: "What is the single most persistent illusion you keep telling yourself about your habits?", category: "illusion" },
                { question: "If you could look at yourself through the eyes of someone who deeply believes in you, what is the first thing they would tell you to change?", category: "perspective" },
                { question: "What is a major choice you deferred recently, and what is the real name of the fear that caused you to defer it?", category: "fear" }
              ];
              setGeneratedQuestions(fallbackQs);
              loadActiveQuestion(fallbackQs);
            });
        }
      } else if (currentQuestionIndex >= TOTAL_QUESTIONS) {
        navigate("/analyzing");
      }
    }
  }, [currentQuestionIndex]);

  // Periodic debounced backdrop auto-save to Firestore every 5 seconds to prevent refresh data loss
  useEffect(() => {
    if (!currentSession || answerText === "") return;
    if (currentSession.draftAnswer === answerText) return;

    const timer = setTimeout(() => {
      saveDraftAnswer(answerText).catch(e => {
        console.error("Auto-save draft failed:", e);
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [answerText, currentSession, saveDraftAnswer]);

  useEffect(() => {
    if (!isProcessing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isProcessing]);

  const handleContinue = async () => {
    if (answerText.length === 0) return;
    setIsProcessing(true);
    await submitAnswer(answerText, currentQ.question, currentQ.category);
    setIsProcessing(false);
  };

  const handleSkip = async () => {
    setIsProcessing(true);
    await skipQuestion(currentQ.question, currentQ.category);
    setIsProcessing(false);
  };

  if (!currentSession) return <div className="fixed inset-0 bg-black z-10" />;

  const isAiQuestion = currentQuestionIndex >= HARDCODED_QUESTIONS.length;

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center p-[2rem]">
      <div className="w-full max-w-[700px] flex items-center justify-between mb-[3.5rem]">
        <div className="font-serif text-[18px] font-normal text-[var(--muted)]">Becoming.</div>
        
        {/* TASK 5: Progress Dots Accessibility & Touch Targets (Mobile Text Counter Fallback) */}
        {/* Mobile: show text counter */}
        <span className="md:hidden font-mono text-xs text-[var(--muted)] tracking-widest uppercase">
          {currentQuestionIndex + 1} / {TOTAL_QUESTIONS}
        </span>

        {/* Desktop: show progress dots wrapped in larger accessibility touch buttons */}
        <div className="hidden md:flex gap-[1px] items-center" role="navigation" aria-label="Question progress">
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => {
            const isDone = i < currentQuestionIndex;
            const isNow = i === currentQuestionIndex;
            return (
              <button
                key={i}
                type="button"
                className="relative flex items-center justify-center w-11 h-11 focus:outline-none cursor-default"
                aria-label={`Question ${i + 1} of ${TOTAL_QUESTIONS}`}
                aria-current={isNow ? 'step' : undefined}
                disabled
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isNow 
                      ? 'w-[8px] h-[8px] bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]' 
                      : isDone 
                        ? 'w-[6px] h-[6px] bg-[var(--gold)] opacity-45' 
                        : 'w-[5px] h-[5px] bg-[var(--faint)]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-[620px]">
        {isProcessing ? (
          <div className="text-[var(--gold)] font-mono text-[11px] tracking-[0.2em] animate-pulse">
            Generating Follow-up...
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.4 }}
              className="w-full flex flex-col items-center"
            >
              <p className={`font-mono text-[10px] tracking-[0.3em] uppercase mb-[1.75rem] transition-colors duration-300 ${isAiQuestion ? 'text-[var(--purple)]' : 'text-[var(--gold)]'}`}>
                {isAiQuestion && '✦ AI · '}Question {String(currentQuestionIndex + 1).padStart(2, '0')} / {String(TOTAL_QUESTIONS).padStart(2, '0')}
              </p>
              
              <h2 className="font-serif text-[clamp(1.4rem,3.5vw,2.1rem)] font-light leading-[1.45] text-[var(--text)] mb-[2.75rem]">
                {currentQ.question}
              </h2>
              
              {/* TASK 3: Textarea with defined bottom-border baseline style, focus states, and typing caret animation */}
              <div className="relative w-full mb-[1.25rem]">
                {/* Subtle blinking typing caret indicator on the left of the writing area */}
                <span 
                  className="absolute left-[-1rem] top-[0.45rem] w-[2.5px] h-[17px] bg-[var(--gold)] opacity-75 animate-[caretBlink_1.1s_infinite] pointer-events-none" 
                  aria-hidden="true"
                />
                
                <textarea
                  id="reflection-answer"
                  ref={textareaRef}
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (answerText.trim().length > 0) {
                        handleContinue();
                      }
                    }
                  }}
                  maxLength={500}
                  placeholder="Write freely — there are no wrong answers (Press Enter to submit)..."
                  aria-label={`Question: ${currentQ.question}`}
                  className="w-full min-h-[140px] bg-transparent border-0 border-b border-[rgba(201,168,68,0.3)] text-[var(--text)] font-sans text-[15px] leading-[1.75] resize-none outline-none pb-[1rem] transition-all duration-300 focus:border-[var(--gold)] focus:shadow-[0_2px_0_0_rgba(201,168,68,0.25)] placeholder:text-[var(--faint)]"
                />
              </div>
              
              {/* TASK 4: Re-aligned Action Hierarchy (Spatially distinct Skip/Continue layouts) */}
              <div className="flex items-center justify-between w-full">
                {/* Left: Skip as low-emphasis link */}
                <button
                  type="button"
                  onClick={handleSkip}
                  className="
                    font-mono text-xs text-[var(--muted)]/60
                    hover:text-[var(--text)]
                    tracking-widest uppercase
                    transition-colors duration-200
                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]/50
                    cursor-pointer bg-transparent border-none py-2 px-1
                  "
                  aria-label="Skip this question"
                >
                  Skip
                </button>

                {/* Right: Character count and Primary CTA Action */}
                <div className="flex items-center gap-6">
                  <span className="font-mono text-[11px] text-[var(--faint)]" aria-live="polite">
                    {answerText.length} / 500
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={answerText.length === 0}
                    className="
                      px-8 py-3
                      bg-[var(--gold)] text-[#080808]
                      font-mono text-[11px] tracking-[0.15em] uppercase rounded-[var(--rs)] border-none
                      hover:bg-[#D4B04A] hover:scale-[1.02]
                      transition-all duration-200
                      disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                      cursor-pointer font-semibold
                    "
                    aria-label="Continue to next question"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
