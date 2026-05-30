import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect } from "react";
import { cn } from "../../lib/utils";

export function CountUpNumber({ value, duration = 1.5, className }: { value: number, duration?: number, className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  
  useEffect(() => {
    const animation = animate(count, value, { duration, ease: "easeOut" });
    return animation.stop;
  }, [value, duration, count]);
  
  return <motion.span className={cn(className)}>{rounded}</motion.span>;
}
