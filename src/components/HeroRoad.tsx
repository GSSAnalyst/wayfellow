import { useEffect, useRef } from "react";

/** Animated night highway: lane dashes, streetlights, taillights and headlights. */
export function HeroRoad() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0, h = 0, raf = 0, running = true;
    const t0 = performance.now();
    const cars = Array.from({ length: 14 }, (_, i) => ({ z: Math.random() * 0.9 + 0.1, lane: i % 2 ? 1 : -1, speed: 0.05 + Math.random() * 0.05 }));

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now: number) => {
      const t = Math.max(0, (now - t0) / 1000);
      const vx = w * (w < 900 ? 0.5 : 0.66), hy = h * 0.5;
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, "#0B1430"); sky.addColorStop(0.75, "#1A2756"); sky.addColorStop(1, "#3B3566");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hy);
      const glow = ctx.createRadialGradient(vx, hy, 0, vx, hy, Math.max(1, w * 0.45));
      glow.addColorStop(0, "rgba(255,181,71,.38)"); glow.addColorStop(1, "rgba(255,181,71,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#121C3A"; ctx.beginPath(); ctx.moveTo(0, hy);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, hy - 18 - 22 * Math.sin(x / 140) - 14 * Math.sin(x / 57 + 1.3));
      ctx.lineTo(w, hy); ctx.closePath(); ctx.fill();
      const gr = ctx.createLinearGradient(0, hy, 0, h);
      gr.addColorStop(0, "#141E3C"); gr.addColorStop(1, "#0C1430");
      ctx.fillStyle = gr; ctx.fillRect(0, hy, w, h - hy);
      const P = (lx: number, z: number) => ({ x: vx + lx * z * z * w * 0.9, y: hy + (h - hy) * z * z });

      ctx.fillStyle = "#1B2546"; ctx.beginPath();
      const a = P(-1, 0.02), b = P(1, 0.02), c = P(1, 1.05), d = P(-1, 1.05);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();

      ctx.strokeStyle = "rgba(79,214,224,.55)"; ctx.lineWidth = 2; ctx.shadowColor = "#4FD6E0"; ctx.shadowBlur = 10;
      for (const s of [-0.92, 0.92]) { const p1 = P(s, 0.02), p2 = P(s, 1.05); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
      ctx.shadowBlur = 0;

      const off = (t * 0.55) % 0.1;
      ctx.fillStyle = "#FFB547";
      for (let k = 0; k < 12; k++) {
        const z1 = Math.sqrt(k * 0.1 + off), z2 = Math.sqrt(Math.min(1.1, k * 0.1 + off + 0.045));
        if (z1 <= 0.05) continue;
        const p1 = P(0, z1), p2 = P(0, z2), wd = 1 + z1 * 5;
        ctx.beginPath(); ctx.moveTo(p1.x - wd / 2, p1.y); ctx.lineTo(p1.x + wd / 2, p1.y); ctx.lineTo(p2.x + wd, p2.y); ctx.lineTo(p2.x - wd, p2.y); ctx.fill();
      }

      for (let k = 0; k < 8; k++) {
        const z = Math.sqrt((k / 8 + t * 0.06) % 1);
        if (z < 0.15) continue;
        for (const s of [-1.25, 1.25]) {
          const p = P(s, z), ph = 70 * z * z + 4, r = 26 * z + 4;
          ctx.strokeStyle = "rgba(120,135,170,.55)"; ctx.lineWidth = Math.max(1, z * 2.5);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - ph); ctx.stroke();
          const g = ctx.createRadialGradient(p.x, p.y - ph, 0, p.x, p.y - ph, r);
          g.addColorStop(0, "rgba(255,200,110,.95)"); g.addColorStop(1, "rgba(255,181,71,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - ph, r, 0, 7); ctx.fill();
        }
      }

      for (const car of cars) {
        if (!reduce.matches) car.z += (car.lane < 0 ? -1 : 1) * car.speed / 60;
        if (car.z > 1.05) car.z = 0.05;
        if (car.z < 0.05) car.z = 1.05;
        const z = car.z, p = P(car.lane * 0.45, z), sp = 6 + z * z * 40, r = (0.8 + z * z * 5) * 4;
        const col = car.lane < 0 ? "255,90,78" : "235,244,255";
        for (const s of [-1, 1]) {
          const x = p.x + (s * sp) / 2;
          const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, r);
          g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, p.y, r, 0, 7); ctx.fill();
        }
      }
      if (running && !reduce.matches) raf = requestAnimationFrame(frame);
    };

    size();
    raf = requestAnimationFrame(frame);
    const onResize = () => { size(); if (!running || reduce.matches) raf = requestAnimationFrame(frame); };
    window.addEventListener("resize", onResize);
    const io = new IntersectionObserver(([e]) => {
      const was = running; running = e.isIntersecting;
      if (running && !was) raf = requestAnimationFrame(frame);
    });
    io.observe(cv);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); io.disconnect(); running = false; };
  }, []);
  return <canvas ref={ref} className="hero-road" aria-hidden="true" />;
}
