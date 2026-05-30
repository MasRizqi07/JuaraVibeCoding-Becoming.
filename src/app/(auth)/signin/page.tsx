import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useBecomingStore } from "../../../store/useBecomingStore";

export default function SignInPage() {
  const { signInWithGoogle } = useBecomingStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate("/reflect");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "";
      if (msg.includes("auth/configuration-not-found")) {
         setError("Firebase Auth is missing or incorrectly configured. Please check environment variables.");
      } else if (msg.includes("popup-closed-by-user")) {
         setError("Sign in was cancelled. Please try again.");
      } else {
         setError("Authentication failed. Please verify your connection or try again later.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[420px] px-6"
      >
        <div className="relative w-full p-[3rem_2.5rem] bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--r)] text-center shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55%] h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent"></div>
          
          <div className="font-serif text-[30px] font-normal mb-[0.4rem]">Becoming.</div>
          <p className="text-[13px] text-[var(--muted)] mb-[2.5rem] leading-[1.65]">
            A guided introspective experience,<br/>powered by AI. This is your mirror.
          </p>
          
          <button 
            onClick={handleSignIn} 
            disabled={loading}
            className="w-full p-[14px] bg-[var(--bg3)] border border-[var(--border)] rounded-[var(--rs)] text-[var(--text)] font-sans text-[14px] cursor-pointer flex items-center justify-center gap-[10px] transition-all duration-200 hover:border-white/20 hover:bg-[#1A1A1A] disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.17z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            {loading ? "Connecting..." : "Continue with Google"}
          </button>
          
          {error && (
            <div className="mt-4 text-red-500 text-xs">{error}</div>
          )}

          <p className="text-[11px] text-[var(--faint)] leading-[1.65] mt-[1.5rem]">
            Your answers are private and encrypted.<br/>We never sell or share your reflection data.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
