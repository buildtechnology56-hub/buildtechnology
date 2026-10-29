import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
}

export const IntelligenceNetworkCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate ~35 nodes representing B2B business intelligence network
    const nodeCount = Math.min(38, Math.floor((width * height) / 35000));
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 2 + 1.2,
        alpha: Math.random() * 0.5 + 0.2,
        baseAlpha: Math.random() * 0.4 + 0.2
      });
    }

    const maxDistance = 160;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(212, 175, 55, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!prefersReducedMotion) {
          n.x += n.vx;
          n.y += n.vy;

          if (n.x < 0) n.x = width;
          if (n.x > width) n.x = 0;
          if (n.y < 0) n.y = height;
          if (n.y > height) n.y = 0;
        }

        // Node glow
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 3);
        gradient.addColorStop(0, `rgba(243, 216, 137, ${n.alpha * 0.6})`);
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.fillStyle = gradient;
        ctx.arc(n.x, n.y, n.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Node center
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 245, 200, ${n.alpha})`;
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion && !document.hidden) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    const handleVisibilityChange = () => {
      if (!document.hidden && !prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen"
      aria-hidden="true"
    />
  );
};
