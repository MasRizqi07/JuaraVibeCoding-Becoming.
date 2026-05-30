import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

export function TypewriterText({ text, className, speed = 30, onComplete, delayStart = 0 }: { text: string, className?: string, speed?: number, onComplete?: () => void, delayStart?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (delayStart > 0) {
      timeout = setTimeout(() => {
        setStarted(true);
      }, delayStart);
    } else {
      setStarted(true);
    }
    return () => clearTimeout(timeout);
  }, [delayStart]);

  useEffect(() => {
    if (!started) return;
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i === text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, started, onComplete]);

  return (
    <div className={cn("inline-block", className)}>
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className="inline-block w-[0.4em] h-[1em] bg-current ml-1 align-baseline opacity-80"
      />
    </div>
  );
}
