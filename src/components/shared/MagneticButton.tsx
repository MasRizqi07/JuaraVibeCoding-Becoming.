import { motion, useMotionValue, useSpring } from "motion/react";
import React, { useRef } from "react";
import { cn } from "../../lib/utils";

export function MagneticButton({ 
  children, 
  className,
  onClick,
  disabled
}: { 
  children: React.ReactNode, 
  className?: string,
  onClick?: () => void,
  disabled?: boolean
}) {
  const ref = useRef<HTMLButtonElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current || disabled) return;
    
    const rect = ref.current.getBoundingClientRect();
    const h = rect.width / 2;
    const v = rect.height / 2;
    
    const mouseX = e.clientX - rect.left - h;
    const mouseY = e.clientY - rect.top - v;
    
    x.set(mouseX * 0.3);
    y.set(mouseY * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      className={cn(
        "relative rounded-none px-8 py-4 font-sans font-black tracking-[0.2em] uppercase transition-colors",
        "border border-white/30 hover:border-white hover:bg-white hover:text-black",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative z-10">{children}</div>
    </motion.button>
  );
}
