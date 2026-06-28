import { useEffect, useState } from "react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import { PanelLoader } from "./PanelLoader";
import { SectionSummary } from "./SectionSummary";
import { Mail, Bell, Check, Loader, Flame, Calendar, Award } from "lucide-react";
import toast from "react-hot-toast";

interface Habit {
  title: string;
  frequency: string;
  duration: string;
  impact: string;
  category: string;
}

export default function PlanPanel() {
  const { result, user } = useBecomingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Persist weekly reminder preference in local storage
  const [emailReminders, setEmailReminders] = useState<boolean>(() => {
    return localStorage.getItem("becoming-habit-reminders") === "true";
  });

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);
  
  if (!result) return null;
  if (isLoading) return <PanelLoader title="Generating Blueprint..." />;
  const { transformationPlan, sectionSummaries } = result;

  const targetEmail = user?.email || "achmadriskim07@gmail.com";
  const userName = user?.displayName || "Reflector";

  const toggleEmailReminders = async () => {
    const nextVal = !emailReminders;
    setEmailReminders(nextVal);
    localStorage.setItem("becoming-habit-reminders", String(nextVal));

    if (nextVal) {
      setIsSendingEmail(true);
      
      const habits = transformationPlan.weeklyHabits || [];
      const habitsHtml = habits.map(h => `
        <div style="background-color: #ffffff; border: 1px solid #eaeaea; padding: 15px; border-radius: 6px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02)">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #111;">${h.title}</h3>
          <table style="width: 100%; font-size: 11px; color: #666; border-collapse: collapse;">
            <tr>
              <td style="padding: 2px 0;"><strong>Frequency:</strong> ${h.frequency}</td>
              <td style="padding: 2px 0; text-align: right;"><strong>Duration:</strong> ${h.duration}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;"><strong>Category:</strong> ${h.category}</td>
              <td style="padding: 2px 0; text-align: right;"><strong>Impact:</strong> <span style="background-color: #FDF9EA; color: #8C6A1A; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${h.impact}</span></td>
            </tr>
          </table>
        </div>
      `).join('');

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 8px; background-color: #fafafa; color: #111;">
          <div style="text-align: center; border-bottom: 2px solid #C9A844; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="font-family: 'Times New Roman', Georgia, serif; font-size: 24px; color: #111; margin: 0; font-weight: normal; letter-spacing: 0.05em;">Becoming.</h2>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.155em; color: #888; margin: 5px 0 0 0;">Weekly Chrono-Habit Calibration</p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #333;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #444;">You have successfully subscribed to <strong>Weekly Habit Reminders</strong>. Here is your current dynamic system habits catalog calibrated to your optimization goal <strong>${transformationPlan.focusKeyword.toUpperCase()}</strong>:</p>
          
          <div style="margin: 20px 0;">
            ${habitsHtml}
          </div>
          
          <div style="background-color: #f7f7f7; border-left: 3px solid #C9A844; padding: 15px; border-radius: 4px; font-style: italic; font-size: 13px; color: #444; margin-top: 30px; line-height: 1.5;">
            "The future version of you is watching. Reflect today to steer your tomorrow. Actively reject stagnant delay structures."
          </div>
          
          <div style="text-align: center; border-top: 1px solid #eee; margin-top: 35px; padding-top: 15px; font-size: 10px; color: #888; font-family: monospace; letter-spacing: 0.05em;">
            You are receiving this because you enabled Weekly Habit Reminders on your Becoming. Results Dashboard.<br/>
            To modify your notification options, visit the Plan panel anytime.
          </div>
        </div>
      `;

      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            toEmail: targetEmail,
            userName: userName,
            subject: `Weekly Habit Calibration: ${transformationPlan.focusKeyword}`,
            html: emailHtml
          })
        });

        if (!res.ok) throw new Error("SendGrid server rejection");
        
        toast.success("Subscribed! Calibration summary sent to " + targetEmail);
      } catch (err) {
        console.error("Weekly registration reminder email dispatch failed", err);
        toast.error("Subscribed to weekly reminders (Email confirmation delayed).");
      } finally {
        setIsSendingEmail(false);
      }
    } else {
      toast.success("Weekly reminders deactivated.");
    }
  };

  return (
    <>
      {sectionSummaries && <SectionSummary summary={sectionSummaries.plan} />}
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Blueprint</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        How you actually get there.
      </h2>
      
      {/* 1. Goal Card */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] p-[2rem] rounded-[var(--r)] mb-[1.5rem]">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.5rem]">Your Optimization Goal</p>
        <p className="font-serif text-[2rem] text-[var(--text)] leading-[1]">
          {transformationPlan.focusKeyword}
        </p>
      </div>

      {/* 2. Habits Section & Dynamic Weekly Email Reminders Card */}
      <div className="mb-[2.5rem]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-[1.5rem] border-b border-[var(--border)] pb-[1rem]">
          <div>
            <h3 className="font-serif text-[1.4rem] font-light text-[var(--text)]">Weekly Chrono-Habits</h3>
            <p className="text-[12px] text-[var(--muted)]">High-leverage physical vectors to secure compounding growth.</p>
          </div>

          {/* Core Feature: SendGrid Weekly Reminders Switch */}
          <div className="flex items-center gap-3 bg-[var(--bg2)] border border-[var(--border)] p-[0.6rem_1rem] rounded-[var(--rs)]">
            <div className="flex items-center gap-[0.4rem] text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--text)]">
              {emailReminders ? (
                <Bell className="w-3.5 h-3.5 text-[var(--gold)] animate-bounce" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
              <span>Habit Digests</span>
            </div>
            <button
              onClick={toggleEmailReminders}
              disabled={isSendingEmail}
              className={`relative inline-flex h-[20px] w-[38px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                emailReminders ? "bg-[var(--gold)]" : "bg-[var(--faint)]"
              }`}
              style={{ padding: 0 }}
              aria-label="Toggle Email Reminders"
            >
              <span
                className={`pointer-events-none inline-block h-[16px] w-[16px] transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                  emailReminders ? "translate-x-[18px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Reminders Status Subtitle */}
        {emailReminders && (
          <div className="text-[11px] text-[var(--gold)] font-mono mb-[1.5rem] flex items-center gap-[0.4rem] bg-[var(--gold-a)] border border-[var(--border-gold)] p-[0.5rem_0.8rem] rounded-[var(--rs)] animate-pulse">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>Active Subscription: Weekly summaries dispatched directly to {targetEmail}</span>
            {isSendingEmail && <Loader className="w-3 h-3 animate-spin ml-auto" />}
          </div>
        )}

        {/* Habit Cards Grid Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(transformationPlan.weeklyHabits || []).map((habit: Habit, idx: number) => (
            <div 
              key={`habit-${idx}`} 
              className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--rs)] p-[1.25rem] relative overflow-hidden flex flex-col justify-between hover:border-[var(--border-gold)] transition-all duration-300 group habit-card-print"
            >
              {/* Subtle top indicator based on urgency */}
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[var(--border)] group-hover:bg-[var(--gold)] transition-colors duration-300" />
              
              <div>
                <div className="flex items-center justify-between mb-3 text-[9px] font-mono uppercase tracking-[0.05em] text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {habit.frequency}
                  </span>
                  <span className="bg-[var(--bg3)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                    {habit.category}
                  </span>
                </div>
                
                <h4 className="font-serif text-[1.125rem] font-light text-[var(--text)] group-hover:text-[var(--gold)] transition-colors duration-200 mb-2">
                  {habit.title}
                </h4>
                
                <p className="text-[11.5px] text-[var(--muted)] leading-[1.5]">
                  {habit.impact}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.03)] flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.05em]">
                <span className="text-[var(--muted)]">Duration</span>
                <span className="text-[var(--text)] font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-[var(--gold)]" />
                  {habit.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Phased Roadmap */}
      <div className="border-t border-[var(--border)] pt-[2rem] mt-[2.5rem]">
        <h3 className="font-serif text-[1.4rem] font-light text-[var(--text)] mb-[1rem]">Growth Vision Horizons</h3>
        <p className="text-[12px] text-[var(--muted)] mb-[1.5rem]">Your chronological path to operational acceleration.</p>
        
        <div className="border-l border-[var(--border)] pl-[1.5rem]">
          {transformationPlan.learningRoadmap.map((phase, i) => (
            <div key={i} className={i < transformationPlan.learningRoadmap.length - 1 ? "mb-[2.5rem]" : ""}>
              <div className="flex items-center gap-2 mb-[0.6rem]">
                <div className="w-[8px] h-[8px] bg-[var(--gold)] rounded-full -ml-[calc(1.5rem+4.5px)] border-4 border-black" />
                <p className={`font-mono text-[11px] uppercase tracking-[0.15em] ${i === 0 ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>
                  Phase {i + 1}: {phase.phase}
                </p>
              </div>
              <p className="font-sans text-[1.05rem] text-[var(--text)] leading-[1.5]">
                {phase.focus}. {phase.milestones.join(' ')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
