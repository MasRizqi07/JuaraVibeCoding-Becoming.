import { motion, useAnimation, useInView } from "motion/react";
import React, { useEffect, useRef } from "react";

export const ScrollReveal: React.FC<{ children: React.ReactNode, delay?: number, className?: string, style?: React.CSSProperties }> = ({ children, delay = 0, className = "", style }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] } }
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
