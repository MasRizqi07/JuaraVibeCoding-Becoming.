import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hasTouch, setHasTouch] = useState(false);

  // Raw mouse coordinates
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Soft spring physics for the outer reactive ring to follow with high-fidelity inertia (Acerternity UI style)
  const springConfig = { damping: 24, stiffness: 220, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Check if device supports hover/touch to avoid showing a phantom cursor on mobile/tablets
    const touchMediaQuery = window.matchMedia("(hover: none)");
    setHasTouch(touchMediaQuery.matches || "ontouchstart" in window || navigator.maxTouchPoints > 0);

    const handleTouchChange = (e: MediaQueryListEvent) => {
      setHasTouch(e.matches);
    };

    if (touchMediaQuery.addEventListener) {
      touchMediaQuery.addEventListener("change", handleTouchChange);
    }

    const mouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const mouseLeave = () => {
      setIsVisible(false);
    };

    const mouseEnter = () => {
      setIsVisible(true);
    };

    // Global mouse state delegation
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if target or any parent is interactive (buttons, anchors, inputs, custom clickables)
      const interactive = target.closest("button, a, select, input, textarea, [role='button'], .clickable, [onclick]");
      if (interactive) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);

    window.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseleave", mouseLeave);
    document.addEventListener("mouseenter", mouseEnter);
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (touchMediaQuery.removeEventListener) {
        touchMediaQuery.removeEventListener("change", handleTouchChange);
      }
      window.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseleave", mouseLeave);
      document.removeEventListener("mouseenter", mouseEnter);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseX, mouseY, isVisible]);

  // If touch device or disabled, compile to nothing
  if (hasTouch || !isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 1. Outer Interactive Glow Ring with Springs */}
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: isPressed ? 0.75 : isHovered ? 1.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 20 }}
        className={`w-10 h-10 rounded-full border-2 border-solid pointer-events-none transition-all duration-200 ${
          isHovered 
            ? "border-[var(--gold)] bg-[var(--gold-a)] shadow-[0_0_15px_rgba(201,168,68,0.25)]" 
            : "border-[rgba(201,168,68,0.3)] bg-transparent shadow-none"
        }`}
      />

      {/* 2. Inner Swift Tracking Laser Dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: isPressed ? 1.3 : isHovered ? 0.5 : 1,
        }}
        className="w-2.5 h-2.5 rounded-full pointer-events-none absolute bg-[var(--gold)] transition-transform duration-200"
      />
    </div>
  );
}
