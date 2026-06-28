import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  ph: number;
  ps: number;
  isGold: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  decay: number;
  color: 'gold' | 'purple';
}

export function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: -1000, y: -1000 });
  const [cursorActive, setCursorActive] = useState(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setCursorActive(true);
    };
    const handleGlobalMouseLeave = () => {
      setCursorActive(false);
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseleave', handleGlobalMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseleave', handleGlobalMouseLeave);
    };
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const resizeCV = () => {
        cv.width = window.innerWidth;
        cv.height = window.innerHeight;
      };
      resizeCV();
      window.addEventListener('resize', resizeCV);
      return () => window.removeEventListener('resize', resizeCV);
    }

    let W = 0, H = 0;
    let pts: Point[] = [];
    let sparks: Spark[] = [];
    
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let mActive = false;
    let lastSparkTime = 0;
    let virtualAngle = 0;
    let pulseRadius = 15;
    let pulseSpeed = 0.25;
    let animationFrameId: number;

    // Theme integration
    let goldColor = 'rgba(201,168,68,';
    let purpleColor = 'rgba(139,108,247,';
    
    const updateThemeColors = () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        goldColor = 'rgba(140,106,26,';
        purpleColor = 'rgba(106,76,215,';
      } else {
        goldColor = 'rgba(201,168,68,';
        purpleColor = 'rgba(139,108,247,';
      }
    };
    updateThemeColors();

    const observer = new MutationObserver(() => {
      updateThemeColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const resizeCV = () => {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
    };
    
    resizeCV();

    const handleResize = () => {
      resizeCV();
      buildPts();
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mActive = true;
      mx = e.clientX;
      my = e.clientY;

      const now = Date.now();
      if (now - lastSparkTime > 18) {
        sparks.push({
          x: mx,
          y: my,
          vx: (Math.random() - 0.5) * 1.4,
          vy: (Math.random() - 0.5) * 1.4 - 0.3,
          r: rand(0.9, 2.6),
          life: 1.0,
          decay: rand(0.016, 0.032),
          color: Math.random() > 0.42 ? 'gold' : 'purple'
        });
        lastSparkTime = now;
      }
    };

    const handleMouseLeave = () => {
      mActive = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      mActive = true;
      if (e.touches[0]) {
        mx = e.touches[0].clientX;
        my = e.touches[0].clientY;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleMouseLeave);

    function rand(a: number, b: number) { return a + Math.random() * (b - a); }

    function buildPts() {
      // Create beautifully dense stars matching viewport proportions
      const n = Math.floor((W * H) / 10500);
      pts = Array.from({ length: Math.min(n, 140) }, () => {
        const isGold = Math.random() > 0.32;
        return {
          x: rand(0, W),
          y: rand(0, H),
          vx: rand(-0.16, 0.16),
          vy: rand(-0.16, 0.16),
          r: rand(0.5, 2.3),
          a: rand(0.14, 0.52),
          ph: rand(0, Math.PI * 2),
          ps: rand(0.004, 0.014),
          isGold
        };
      });
    }
    
    buildPts();

    function drawPts() {
      if (!cx || !cv) return;
      cx.clearRect(0, 0, W, H);

      // Organic dynamic heartbeat cycle pulse (periodic breathing)
      const heartbeat = 1.0 + 0.14 * Math.sin(Date.now() / 1400);

      // Passive gravity orbit simulation when user is inactive
      if (!mActive) {
        virtualAngle += 0.0016;
        const targetX = W / 2 + Math.cos(virtualAngle) * (W * 0.22);
        const targetY = H / 2 + Math.sin(virtualAngle * 1.3) * (H * 0.18);
        mx += (targetX - mx) * 0.04;
        my += (targetY - my) * 0.04;
      }

      // 1. Draw glowing mouse interactive aura
      if (mActive) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const auraGlow = cx.createRadialGradient(mx, my, 0, mx, my, 130);
        auraGlow.addColorStop(0, pColor(0.07));
        auraGlow.addColorStop(0.5, gColor(0.025));
        auraGlow.addColorStop(1, 'rgba(0,0,0,0)');
        
        cx.beginPath();
        cx.arc(mx, my, 130, 0, Math.PI * 2);
        cx.fillStyle = auraGlow;
        cx.fill();

        // Small decorative orbit pulse
        pulseRadius += pulseSpeed;
        if (pulseRadius > 32) {
          pulseRadius = 12;
        }
        const pulseAlpha = 0.22 * (1 - (pulseRadius - 12) / 20);
        cx.beginPath();
        cx.arc(mx, my, pulseRadius, 0, Math.PI * 2);
        cx.strokeStyle = gColor(pulseAlpha);
        cx.lineWidth = 0.7;
        cx.stroke();
      }

      // Helper shorthand for color formatting
      function gColor(alpha: number) { return `${goldColor}${alpha})`; }
      function pColor(alpha: number) { return `${purpleColor}${alpha})`; }

      // 2. Repulsion physical response when points cross paths / extremely close
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const rDx = pts[i].x - pts[j].x;
          const rDy = pts[i].y - pts[j].y;
          const rD = Math.sqrt(rDx*rDx + rDy*rDy);
          if (rD < 28 && rD > 0.1) {
            // Accelerate away from each other inversely proportional to distance
            const force = (28 - rD) * 0.0035;
            const rx = (rDx / rD) * force;
            const ry = (rDy / rD) * force;
            
            pts[i].vx += rx;
            pts[i].vy += ry;
            pts[j].vx -= rx;
            pts[j].vy -= ry;

            // Dampen acceleration to lock terminal speed values for visual continuity
            const limit = 0.55;
            const speedI = Math.sqrt(pts[i].vx * pts[i].vx + pts[i].vy * pts[i].vy);
            if (speedI > limit) {
              pts[i].vx = (pts[i].vx / speedI) * limit;
              pts[i].vy = (pts[i].vy / speedI) * limit;
            }
            const speedJ = Math.sqrt(pts[j].vx * pts[j].vx + pts[j].vy * pts[j].vy);
            if (speedJ > limit) {
              pts[j].vx = (pts[j].vx / speedJ) * limit;
              pts[j].vy = (pts[j].vy / speedJ) * limit;
            }
          }
        }
      }

      // Update basic star metrics
      pts.forEach(p => {
        p.x += p.vx; 
        p.y += p.vy;
        p.ph += p.ps;

        // Interactive dynamic swirl physics
        const dx = mx - p.x;
        const dy = my - p.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        
        // Stars respond symmetrically near the mouse cursor
        if (d < 165) {
          const factor = (165 - d) / 165;
          // Create slow orbital rotational drag
          const swirlX = -dy * 0.0042 * factor;
          const swirlY = dx * 0.0042 * factor;
          p.x += swirlX;
          p.y += swirlY;

          if (d < 45) {
            p.x -= dx * 0.012 * factor;
            p.y -= dy * 0.012 * factor;
          } else {
            p.x += dx * 0.0015 * factor;
            p.y += dy * 0.0015 * factor;
          }
        }

        // Keep inside bounds
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
      });

      // 3. Map to screen space coordinates including smooth scroll parallax offset
      const sY = window.scrollY || 0;
      const rPts = pts.map(p => {
        let drawY = p.y - (sY * p.r * 0.04);
        const space = H + 20;
        drawY = ((drawY + 10) % space + space) % space - 10;
        return {
          ...p,
          x: p.x,
          y: drawY
        };
      });

      // Draw primary stars
      rPts.forEach(p => {
        const dx = mx - p.x;
        const dy = my - p.y;
        const d = Math.sqrt(dx*dx + dy*dy);

        const baseAlpha = p.a * (0.55 + 0.45 * Math.sin(p.ph));
        // Hovering scales brightness
        let hoverScale = 1.0;
        if (d < 140) {
          hoverScale = 1.0 + (140 - d) / 60;
        }

        cx.beginPath();
        // Applies a breathing heartbeat scale to particle radii
        cx.arc(p.x, p.y, p.r * heartbeat * (hoverScale > 1.5 ? 1.25 : 1), 0, Math.PI * 2);
        cx.fillStyle = p.isGold ? gColor(baseAlpha * hoverScale) : pColor(baseAlpha * hoverScale);
        cx.fill();
      });
      
      // 4. Render connection threads
      for (let i = 0; i < rPts.length; i++) {
        for (let j = i + 1; j < rPts.length; j++) {
          const dx = rPts[i].x - rPts[j].x;
          const dy = rPts[i].y - rPts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          
          if (d < 105) {
            cx.beginPath();
            cx.moveTo(rPts[i].x, rPts[i].y);
            cx.lineTo(rPts[j].x, rPts[j].y);

            // Connective lines glow significantly up close to the cursor
            const midX = (rPts[i].x + rPts[j].x) / 2;
            const midY = (rPts[i].y + rPts[j].y) / 2;
            const mDx = mx - midX;
            const mDy = my - midY;
            const mD = Math.sqrt(mDx*mDx + mDy*mDy);

            let glowFactor = 1.0;
            if (mD < 150) {
              glowFactor = 1.0 + (150 - mD) / 30; // Glow becomes strong near pointer
            }

            const alpha = (1 - d/105) * 0.065 * glowFactor;
            cx.strokeStyle = rPts[i].isGold ? gColor(alpha) : pColor(alpha);
            cx.lineWidth = glowFactor > 1.5 ? 0.8 : 0.55;
            cx.stroke();
          }
        }
      }

      // 5. Draw magnetic pointer strands to nearest starry coordinates
      rPts.forEach(p => {
        const dx = mx - p.x;
        const dy = my - p.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 130) {
          cx.beginPath();
          cx.moveTo(mx, my);
          cx.lineTo(p.x, p.y);
          const alpha = (1 - d/130) * 0.12;
          cx.strokeStyle = p.isGold ? gColor(alpha) : pColor(alpha);
          cx.lineWidth = 0.5;
          cx.stroke();
        }
      });

      // 6. Draw & update interactive space dust sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= s.decay;

        // Sway using small gentle waves
        s.x += Math.sin(s.life * 12) * 0.18;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const alpha = s.life * 0.65;
        const sSize = s.r * (0.4 + 0.6 * s.life);

        cx.beginPath();
        cx.arc(s.x, s.y, sSize, 0, Math.PI * 2);
        cx.fillStyle = s.color === 'gold' ? gColor(alpha) : pColor(alpha);
        
        // Premium neon drop glow
        cx.shadowColor = s.color === 'gold' ? 'rgba(201,168,68,0.45)' : 'rgba(139,108,247,0.45)';
        cx.shadowBlur = 4;
        cx.fill();
        cx.shadowBlur = 0; // Reset canvas shadow context
      }

      animationFrameId = requestAnimationFrame(drawPts);
    }
    
    drawPts();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseLeave);
      observer.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[var(--bg)] transition-colors duration-500">
      {/* Soft glowing interactive radial gradient mask tracking cursor position globally */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-700 z-[2]"
        style={{
          opacity: cursorActive ? 0.38 : 0,
          background: `radial-gradient(550px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(139,108,247,0.11) 0%, rgba(201,168,68,0.035) 45%, transparent 100%)`
        }}
      />

      {/* Animated spot glows underneath the canvas - Aurora style (Acerternity UI inspiration) */}
      <motion.div
        animate={{
          x: [0, 90, -50, 0],
          y: [0, -70, 50, 0],
          scale: [1, 1.2, 0.85, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-[radial-gradient(circle,_var(--gold-a)_0%,_transparent_75%)] opacity-[0.85] blur-[80px]"
      />
      <motion.div
        animate={{
          x: [0, -110, 60, 0],
          y: [0, 80, -60, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle,_var(--purple-a)_0%,_transparent_75%)] opacity-[0.75] blur-[90px]"
      />
      <motion.div
        animate={{
          x: [0, 50, -40, 0],
          y: [0, 40, -50, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[35%] left-[30%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,_rgba(201,168,68,0.06)_0%,_transparent_70%)] opacity-[0.6] blur-[100px]"
      />

      {/* The high-fidelity interactive particle web overlay */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-10 opacity-75"
      />
    </div>
  );
}
