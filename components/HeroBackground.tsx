"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient EDM hero backdrop: a blackhole pulling two rotating spiral arms of
 * particles inward (accretion + DNA double-helix reading), wired together with
 * faint "neural" links. Pure canvas, no libraries. Sits on black.
 */
export function HeroBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, rot = 0;

    type P = { r: number; arm: number; inw: number; sz: number; hue: number; tw: number };
    let parts: P[] = [];

    const COOL = [96, 156, 255]; // blue
    const WARM = [178, 108, 255]; // violet
    const HOT = [230, 240, 255]; // near-white (inner/hot)

    function seed() {
      const maxR = Math.min(W * 0.52, H * 0.74);
      const n = Math.max(70, Math.min(150, Math.floor((W * H) / 8500)));
      parts = Array.from({ length: n }, () => ({
        r: maxR * (0.12 + Math.random()),
        arm: Math.random() < 0.5 ? 0 : 1,
        inw: 0.05 + Math.random() * 0.07,
        sz: 0.7 + Math.random() * 1.7,
        hue: Math.random(),
        tw: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.max(1, Math.floor(W * dpr));
      canvas!.height = Math.max(1, Math.floor(H * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function render(time: number, dt: number) {
      const cx = W * 0.5, cy = H * 0.34;
      const maxR = Math.min(W * 0.52, H * 0.74);
      const coreR = maxR * 0.09;
      const tilt = 0.56;

      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";

      // --- ambient glow ---
      const glow = ctx!.createRadialGradient(cx, cy, coreR, cx, cy, maxR * 1.2);
      glow.addColorStop(0, "rgba(70,120,240,0.30)");
      glow.addColorStop(0.4, "rgba(120,70,230,0.13)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, W, H);

      // faint gravitational-lensing halos
      for (let k = 1; k <= 2; k++) {
        ctx!.strokeStyle = `rgba(110,150,255,${0.06 / k})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, coreR * (2.4 + k * 1.6), coreR * (2.4 + k * 1.6) * tilt, 0, 0, Math.PI * 2);
        ctx!.stroke();
      }

      if (!reduce) rot += dt * 0.14;

      // positions along two rotating spiral arms
      const pts: { x: number; y: number; b: number; sz: number; hue: number; frac: number }[] = [];
      for (const p of parts) {
        if (!reduce) {
          p.r -= p.inw * maxR * dt;
          if (p.r < coreR) {
            p.r = maxR * (0.85 + Math.random() * 0.32);
            p.arm = Math.random() < 0.5 ? 0 : 1;
            p.hue = Math.random();
          }
        }
        const frac = p.r / maxR;
        const ang = rot + p.arm * Math.PI + (1 - frac) * 6.2;
        const x = cx + Math.cos(ang) * p.r;
        const y = cy + Math.sin(ang) * p.r * tilt;
        const front = Math.sin(ang) * 0.5 + 0.5;
        const flick = 0.8 + 0.2 * Math.sin(time * 2 + p.tw);
        const b = Math.min(1, (0.32 + (1 - frac) * 0.85) * (0.5 + front * 0.65) * flick);
        pts.push({ x, y, b, sz: p.sz, hue: p.hue, frac });
      }

      // --- neural links ---
      const TH = Math.min(W, H) * 0.12;
      ctx!.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < TH * TH) {
            const a = (1 - Math.sqrt(d2) / TH) * 0.22 * Math.min(pts[i].b, pts[j].b);
            if (a > 0.012) {
              ctx!.strokeStyle = `rgba(110,150,245,${a})`;
              ctx!.beginPath();
              ctx!.moveTo(pts[i].x, pts[i].y);
              ctx!.lineTo(pts[j].x, pts[j].y);
              ctx!.stroke();
            }
          }
        }
      }

      // --- particles (halo bloom + bright core) ---
      for (const p of pts) {
        const c = p.frac < 0.24 ? HOT : p.hue < 0.5 ? COOL : WARM;
        // halo
        ctx!.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.b * 0.18})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.sz * 3.4, 0, Math.PI * 2);
        ctx!.fill();
        // core
        ctx!.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.b})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.sz * (0.7 + p.b * 0.9), 0, Math.PI * 2);
        ctx!.fill();
      }

      // --- blackhole core (dark) ---
      ctx!.globalCompositeOperation = "source-over";
      const core = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.2);
      core.addColorStop(0, "rgba(0,0,2,1)");
      core.addColorStop(0.55, "rgba(2,2,10,0.97)");
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = core;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, coreR * 3.2, coreR * 3.2 * tilt + coreR, 0, 0, Math.PI * 2);
      ctx!.fill();

      // --- event horizon rim glow ---
      ctx!.globalCompositeOperation = "lighter";
      ctx!.shadowColor = "rgba(100,160,255,1)";
      ctx!.shadowBlur = 28;
      ctx!.strokeStyle = "rgba(150,190,255,0.8)";
      ctx!.lineWidth = 1.8;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, coreR * 1.8, coreR * 1.8 * tilt, 0, 0, Math.PI * 2);
      ctx!.stroke();
      // inner hot rim
      ctx!.strokeStyle = "rgba(210,225,255,0.6)";
      ctx!.lineWidth = 1;
      ctx!.shadowBlur = 14;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, coreR * 1.4, coreR * 1.4 * tilt, 0, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.shadowBlur = 0;
      ctx!.globalCompositeOperation = "source-over";
    }

    function frame(t: number) {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      render(t / 1000, dt);
      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (reduce) {
      render(0, 0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
