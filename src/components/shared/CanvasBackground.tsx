import React, { useEffect, useRef } from 'react';

export function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    let W = 0, H = 0, pts: any[] = [];
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let animationFrameId: number;

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
      mx = e.clientX;
      my = e.clientY;
    };
    document.addEventListener('mousemove', handleMouseMove);

    function rand(a: number, b: number) { return a + Math.random() * (b - a); }

    function buildPts() {
      const n = Math.floor((W * H) / 12000);
      pts = Array.from({ length: Math.min(n, 110) }, () => ({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.12, 0.12), vy: rand(-0.12, 0.12),
        r: rand(0.3, 1.5),
        a: rand(0.1, 0.45),
        ph: rand(0, Math.PI * 2),
        ps: rand(0.004, 0.012)
      }));
    }
    
    buildPts();

    function drawPts() {
      if(!cx || !cv) return;
      cx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.ph += p.ps;
        const dx = mx - p.x, dy = my - p.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 130) { p.x -= dx * 0.0018; p.y -= dy * 0.0018; }
        if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
        if (p.y < -5) p.y = H + 5; if (p.y > H + 5) p.y = -5;
        const alpha = p.a * (0.65 + 0.35 * Math.sin(p.ph));
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        cx.fillStyle = `rgba(201,168,68,${alpha})`;
        cx.fill();
      });
      // connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 90) {
            cx.beginPath();
            cx.moveTo(pts[i].x, pts[i].y);
            cx.lineTo(pts[j].x, pts[j].y);
            cx.strokeStyle = `rgba(201,168,68,${(1-d/90)*0.07})`;
            cx.lineWidth = 0.5;
            cx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(drawPts);
    }
    
    drawPts();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
