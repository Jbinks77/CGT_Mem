"use client";

import { useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   CYBER NEXUS — Multi-layer animated background
   Layers (back to front):
     1. Deep atmosphere gradients (static)
     2. Tron perspective grid (animated scroll)
     3. Matrix rain columns (very subtle)
     4. Neural particle field 3D (200 nodes, depth projection)
     5. Connection lines (opacity by distance + depth)
     6. Data packets traveling along edges (glow trails)
     7. Pulse rings expanding from random nodes
     8. Shooting stars
   ───────────────────────────────────────────────────────────────────────────── */

const CYAN   = [0,   212, 255] as const;
const PURPLE = [167, 139, 250] as const;
const GOLD   = [245, 158,  11] as const;
const COLORS = [CYAN, CYAN, CYAN, PURPLE, PURPLE, GOLD]; // weighted

const N_PARTICLES  = 210;
const MAX_DIST     = 160;   // connection threshold px
const MAX_PACKETS  = 18;
const MATRIX_COLS  = 40;

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  z: number;       // depth 0=far, 1=near
  colorIdx: number;
  phase: number;   // pulsing offset
}
interface Packet {
  from: number; to: number;
  t: number; speed: number;
}
interface Ring {
  x: number; y: number;
  r: number; maxR: number;
  alpha: number; colorIdx: number;
}
interface Star {
  x: number; y: number;
  vx: number; vy: number;
  len: number; life: number; maxLife: number;
  colorIdx: number;
}
interface MatrixCol {
  x: number; y: number;
  speed: number;
  chars: string[];
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    let mouseX = W / 2;
    let mouseY = H / 2;
    let t = 0;
    let lastTS = 0;
    let nextPulse = 1500;
    let nextStar  = 800;

    canvas.width  = W;
    canvas.height = H;

    /* ── Init particles ─────────────────────────────────────────────────────── */
    const particles: Particle[] = Array.from({ length: N_PARTICLES }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      z: Math.pow(Math.random(), 0.7), // bias toward "near" depth
      colorIdx: Math.floor(Math.random() * COLORS.length),
      phase: Math.random() * Math.PI * 2,
    }));

    /* ── Init matrix columns ────────────────────────────────────────────────── */
    const CHARS = "01アイウエオカキクサシスタチツナニヌネハヒフヘホマミムメモラリルレロABCDEF0123456789".split("");
    const columns: MatrixCol[] = Array.from({ length: MATRIX_COLS }, (_, i) => ({
      x: (W / MATRIX_COLS) * i + (W / MATRIX_COLS / 2),
      y: -Math.random() * H,
      speed: 0.25 + Math.random() * 0.45,
      chars: Array.from({ length: 22 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
    }));

    const packets: Packet[] = [];
    const rings:   Ring[]   = [];
    const stars:   Star[]   = [];
    const connections: [number, number, number][] = []; // [i, j, dist]

    /* ── Helpers ────────────────────────────────────────────────────────────── */
    const rgb = (c: readonly [number,number,number], a: number) =>
      `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

    const glowCircle = (x: number, y: number, r: number, c: readonly [number,number,number], a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,   rgb(c, a));
      g.addColorStop(0.35,rgb(c, a * 0.45));
      g.addColorStop(1,   rgb(c, 0));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    };

    /* ── DRAW GRID ──────────────────────────────────────────────────────────── */
    const drawGrid = () => {
      const vpy  = H * 0.76;    // vanishing point Y
      const vpx  = W * 0.50;    // vanishing point X
      const base = H * 1.1;     // bottom edge

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, vpy, W, H - vpy);
      ctx.clip();

      /* Horizontal lines — scroll by animating spacing */
      const HLINES = 16;
      const scrollOffset = (t * 22) % (H * 0.24 / HLINES);
      for (let i = 0; i <= HLINES; i++) {
        const rawT = (i / HLINES);
        const y = vpy + Math.pow(rawT, 1.6) * (base - vpy) + scrollOffset * rawT * 2;
        if (y > base) continue;
        const prog = (y - vpy) / (base - vpy);
        const spread = W * 1.4 * prog;
        ctx.beginPath();
        ctx.moveTo(vpx - spread, y);
        ctx.lineTo(vpx + spread, y);
        ctx.strokeStyle = rgb(CYAN, 0.04 + prog * 0.09);
        ctx.lineWidth = 0.5 + prog * 0.8;
        ctx.stroke();
      }

      /* Vertical (radial) lines */
      const VLINES = 28;
      for (let i = 0; i <= VLINES; i++) {
        const angle = -0.65 * Math.PI + (1.3 * Math.PI) * (i / VLINES);
        ctx.beginPath();
        ctx.moveTo(vpx, vpy);
        ctx.lineTo(vpx + Math.cos(angle) * H * 1.5, vpy + Math.sin(angle) * H * 1.5);
        ctx.strokeStyle = rgb(CYAN, 0.055);
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      /* Horizon glow line */
      const hg = ctx.createLinearGradient(0, vpy, W, vpy);
      hg.addColorStop(0,   "rgba(0,212,255,0)");
      hg.addColorStop(0.3, "rgba(0,212,255,0.25)");
      hg.addColorStop(0.5, "rgba(0,212,255,0.55)");
      hg.addColorStop(0.7, "rgba(0,212,255,0.25)");
      hg.addColorStop(1,   "rgba(0,212,255,0)");
      ctx.beginPath();
      ctx.moveTo(0, vpy);
      ctx.lineTo(W, vpy);
      ctx.strokeStyle = hg;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* Subtle grid bloom under horizon */
      const bloom = ctx.createLinearGradient(0, vpy, 0, vpy + H * 0.18);
      bloom.addColorStop(0, "rgba(0,212,255,0.04)");
      bloom.addColorStop(1, "rgba(0,212,255,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, vpy, W, H * 0.18);

      ctx.restore();
    };

    /* ── MAIN LOOP ──────────────────────────────────────────────────────────── */
    const draw = (ts: number) => {
      animId = requestAnimationFrame(draw);
      const dt = Math.min(ts - lastTS, 50);
      lastTS = ts;
      t += dt * 0.001;

      /* ── 1. BG ─────────────────────────────────────────────────────────── */
      ctx.fillStyle = "#030308";
      ctx.fillRect(0, 0, W, H);

      // Atmosphere glow bottom-center (cyan)
      const g1 = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, H * 0.75);
      g1.addColorStop(0,   "rgba(0,40,70,0.55)");
      g1.addColorStop(0.5, "rgba(0,15,30,0.25)");
      g1.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      // Atmosphere glow top-right (purple)
      const g2 = ctx.createRadialGradient(W * 0.78, H * 0.12, 0, W * 0.78, H * 0.12, H * 0.55);
      g2.addColorStop(0,   "rgba(90,20,140,0.22)");
      g2.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      // Faint top-left glow (gold accent)
      const g3 = ctx.createRadialGradient(W * 0.12, H * 0.08, 0, W * 0.12, H * 0.08, H * 0.35);
      g3.addColorStop(0,   "rgba(80,50,0,0.12)");
      g3.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);

      /* ── 2. GRID ───────────────────────────────────────────────────────── */
      drawGrid();

      /* ── 3. MATRIX RAIN ────────────────────────────────────────────────── */
      ctx.font = "11px 'JetBrains Mono', monospace";
      for (const col of columns) {
        col.y += col.speed;
        if (col.y - col.chars.length * 14 > H) {
          col.y = -40;
          col.x = (W / MATRIX_COLS) * (Math.floor(Math.random() * MATRIX_COLS)) + (W / MATRIX_COLS / 2);
        }
        for (let i = 0; i < col.chars.length; i++) {
          const frac = 1 - i / col.chars.length;
          const alpha = frac * frac * 0.055;
          ctx.fillStyle = `rgba(0,212,255,${alpha.toFixed(3)})`;
          ctx.fillText(col.chars[i], col.x, col.y - i * 14);
        }
        if (Math.random() < 0.015) {
          col.chars[Math.floor(Math.random() * col.chars.length)] =
            CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      /* ── 4. UPDATE PARTICLES ───────────────────────────────────────────── */
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Mouse repulsion
        const dx = p.x - mouseX, dy = p.y - mouseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < 9000 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = ((95 - d) / 95) * 0.022;
          if (f > 0) { p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
        }
        // Velocity damping + cap
        p.vx *= 0.994; p.vy *= 0.994;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 1.2) { p.vx = (p.vx / spd) * 1.2; p.vy = (p.vy / spd) * 1.2; }
      }

      /* ── 5. CONNECTIONS ────────────────────────────────────────────────── */
      connections.length = 0;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < N_PARTICLES; i++) {
        for (let j = i + 1; j < N_PARTICLES; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            connections.push([i, j, d]);
            const baseAlpha = (1 - d / MAX_DIST);
            const depthAlpha = (particles[i].z + particles[j].z) * 0.5;
            const a = baseAlpha * baseAlpha * depthAlpha * 0.18;
            const c = COLORS[particles[i].colorIdx];
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = rgb(c, a);
            ctx.stroke();
          }
        }
      }

      /* ── 6. DATA PACKETS ───────────────────────────────────────────────── */
      nextPulse -= dt;
      if (packets.length < MAX_PACKETS && connections.length > 0 && Math.random() < 0.07) {
        const conn = connections[Math.floor(Math.random() * connections.length)];
        const dir = Math.random() < 0.5;
        packets.push({
          from:  dir ? conn[0] : conn[1],
          to:    dir ? conn[1] : conn[0],
          t: 0,
          speed: 0.007 + Math.random() * 0.013,
        });
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i];
        pk.t += pk.speed;
        if (pk.t >= 1) { packets.splice(i, 1); continue; }
        const pf = particles[pk.from], pt_ = particles[pk.to];
        const px = pf.x + (pt_.x - pf.x) * pk.t;
        const py = pf.y + (pt_.y - pf.y) * pk.t;
        const c  = COLORS[pf.colorIdx];
        const depth = (pf.z + pt_.z) * 0.5;

        // Trail
        const TRAIL = 6;
        for (let tr = 0; tr < TRAIL; tr++) {
          const trt = Math.max(0, pk.t - tr * 0.018);
          const trx = pf.x + (pt_.x - pf.x) * trt;
          const try_ = pf.y + (pt_.y - pf.y) * trt;
          const a = (1 - tr / TRAIL) * 0.55 * depth;
          const r = (2.5 - tr * 0.35) * (0.4 + depth * 0.6);
          ctx.beginPath();
          ctx.arc(trx, try_, Math.max(r, 0.3), 0, Math.PI * 2);
          ctx.fillStyle = rgb(c, a);
          ctx.fill();
        }

        // Head glow
        glowCircle(px, py, 9 * (0.4 + depth * 0.6), c, 0.75 * depth);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = rgb(c, 1);
        ctx.fill();
      }

      /* ── 7. PARTICLES ──────────────────────────────────────────────────── */
      for (const p of particles) {
        const pulse = 0.82 + Math.sin(t * 1.8 + p.phase) * 0.18;
        const r     = (0.5 + p.z * 2.8) * pulse;
        const alpha = 0.2 + p.z * 0.8;
        const c     = COLORS[p.colorIdx];

        // Soft outer glow (only for "near" particles — perf)
        if (p.z > 0.3) {
          glowCircle(p.x, p.y, r * 5.5, c, alpha * 0.18 * p.z);
        }
        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgb(c, Math.min(alpha * 1.3, 1));
        ctx.fill();
      }

      /* ── 8. PULSE RINGS ────────────────────────────────────────────────── */
      if (nextPulse <= 0 && particles.length > 0) {
        const p = particles[Math.floor(Math.random() * N_PARTICLES)];
        rings.push({
          x: p.x, y: p.y, r: 0,
          maxR: 90 + Math.random() * 100,
          alpha: 0.6, colorIdx: p.colorIdx,
        });
        nextPulse = 1800 + Math.random() * 2800;
      }
      nextPulse -= dt;

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += dt * 0.065;
        ring.alpha = 0.55 * Math.pow(1 - ring.r / ring.maxR, 1.4);
        if (ring.r > ring.maxR) { rings.splice(i, 1); continue; }
        const c = COLORS[ring.colorIdx];
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = rgb(c, ring.alpha);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Second inner ring (smaller, faster)
        if (ring.r > 20) {
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.r * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = rgb(c, ring.alpha * 0.4);
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      /* ── 9. SHOOTING STARS ─────────────────────────────────────────────── */
      nextStar -= dt;
      if (nextStar <= 0) {
        const angle = (-0.12 - Math.random() * 0.35) * Math.PI;
        const speed = 6 + Math.random() * 9;
        stars.push({
          x: Math.random() * W * 1.3 - W * 0.15,
          y: Math.random() * H * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          len: 60 + Math.random() * 100,
          life: 0, maxLife: 55 + Math.random() * 35,
          colorIdx: Math.random() < 0.7 ? 0 : (Math.random() < 0.8 ? 1 : 2),
        });
        nextStar = 1200 + Math.random() * 3500;
      }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx; s.y += s.vy;
        s.life++;
        if (s.life > s.maxLife || s.x < -100 || s.y > H + 50) {
          stars.splice(i, 1); continue;
        }
        const prog  = s.life / s.maxLife;
        const alpha = prog < 0.2 ? prog / 0.2 : 1 - (prog - 0.2) / 0.8;
        const c     = COLORS[s.colorIdx];

        const tailX = s.x - s.vx * (s.len / Math.abs(s.vx + 0.01)) * 0.5;
        const tailY = s.y - s.vy * (s.len / Math.abs(s.vx + 0.01)) * 0.5;

        const sg = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        sg.addColorStop(0, rgb(c, 0));
        sg.addColorStop(0.7, rgb(c, alpha * 0.35));
        sg.addColorStop(1, rgb(c, alpha * 0.9));
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = sg;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Head spark
        glowCircle(s.x, s.y, 5, c, alpha * 0.8);
      }

      /* ── 10. VIGNETTE ──────────────────────────────────────────────────── */
      const vig = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, H * 0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
    };

    requestAnimationFrame(draw);

    /* ── Event listeners ─────────────────────────────────────────────────── */
    const onMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
      // Reposition columns
      columns.forEach((col, i) => { col.x = (W / MATRIX_COLS) * i + (W / MATRIX_COLS / 2); });
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
