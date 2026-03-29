"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* ─── Data ──────────────────────────────────────────────────────────────────── */

const EXP = [
  {
    company: "Pluxee",
    role: "Ingénieur Sécurité et Système",
    period: "2023 — Présent",
    color: "#00d4ff",
    current: true,
    tasks: [
      "Gestion et remédiation des vulnérabilités via Qualys",
      "Configuration système et sécurité sur la plateforme Akamai",
      "Supervision via Centreon, Jenkins, Puppet et GitLab",
      "Déploiement de Tanium pour les mises à jour serveurs",
    ],
  },
  {
    company: "Orange Cyberdefense",
    role: "Alternance — Sécurité Réseau",
    period: "2020 — 2022",
    color: "#ff6b35",
    current: false,
    tasks: [
      "Incidents de niveau 2 sur infrastructures de sécurité réseau",
      "Administration firewalls : Check Point, Palo Alto, Juniper",
      "Liaison et support avec les équipes constructeurs",
    ],
  },
  {
    company: "Hutchinson",
    role: "Alternance — Admin. Système & Réseau",
    period: "2019 — 2020",
    color: "#a78bfa",
    current: false,
    tasks: [
      "Administration d'un parc de ~300 serveurs Windows & Linux",
      "Gestion des utilisateurs et accès (Active Directory, GPO)",
      "Maintenance et support de l'infrastructure réseau",
    ],
  },
];

const SKILLS = [
  {
    cat: "Sécurité",
    color: "#00d4ff",
    border: "rgba(0,212,255,0.2)",
    bg: "rgba(0,212,255,0.05)",
    items: ["Qualys", "Akamai", "Check Point", "Palo Alto", "Juniper", "SIEM"],
  },
  {
    cat: "Infrastructure",
    color: "#a78bfa",
    border: "rgba(167,139,250,0.2)",
    bg: "rgba(167,139,250,0.05)",
    items: ["Active Directory", "Centreon", "Windows Server", "Linux", "GPO", "ITIL"],
  },
  {
    cat: "DevSecOps",
    color: "#34d399",
    border: "rgba(52,211,153,0.2)",
    bg: "rgba(52,211,153,0.05)",
    items: ["Jenkins", "Puppet", "GitLab", "Tanium", "Git", "Docker"],
  },
];

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function Portfolio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  /* ── Three.js Network ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!canvasRef.current) return;
    let animId: number;
    let rendererObj: { dispose: () => void } | null = null;
    let mouseX = 0, mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 40;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 24;
    };
    window.addEventListener("mousemove", onMouseMove);

    (async () => {
      try {
        const THREE = await import("three");
        const canvas = canvasRef.current!;
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
        camera.position.z = 22;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        rendererObj = renderer;

        /* Glow sprite texture */
        const tc = document.createElement("canvas");
        tc.width = tc.height = 64;
        const tctx = tc.getContext("2d")!;
        const grd = tctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, "rgba(0,212,255,1)");
        grd.addColorStop(0.35, "rgba(0,212,255,0.6)");
        grd.addColorStop(1, "rgba(0,212,255,0)");
        tctx.fillStyle = grd;
        tctx.fillRect(0, 0, 64, 64);
        const ptex = new THREE.CanvasTexture(tc);

        /* Particles */
        const N = 130;
        const pos = new Float32Array(N * 3);
        const vel: { x: number; y: number; z: number }[] = [];

        for (let i = 0; i < N; i++) {
          pos[i * 3]     = (Math.random() - 0.5) * 38;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
          vel.push({
            x: (Math.random() - 0.5) * 0.007,
            y: (Math.random() - 0.5) * 0.007,
            z: (Math.random() - 0.5) * 0.003,
          });
        }

        const pGeo = new THREE.BufferGeometry();
        const pAttr = new THREE.BufferAttribute(pos, 3);
        pGeo.setAttribute("position", pAttr);

        const pMat = new THREE.PointsMaterial({
          size: 0.28,
          map: ptex,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        scene.add(new THREE.Points(pGeo, pMat));

        /* Lines */
        const lGeo = new THREE.BufferGeometry();
        const lMat = new THREE.LineBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
        });
        const lines = new THREE.LineSegments(lGeo, lMat);
        scene.add(lines);

        const t0 = Date.now();

        const animate = () => {
          animId = requestAnimationFrame(animate);
          const t = (Date.now() - t0) * 0.001;

          for (let i = 0; i < N; i++) {
            pos[i * 3]     += vel[i].x;
            pos[i * 3 + 1] += vel[i].y;
            pos[i * 3 + 2] += vel[i].z;

            if (Math.abs(pos[i * 3]) > 19)     vel[i].x *= -1;
            if (Math.abs(pos[i * 3 + 1]) > 12) vel[i].y *= -1;
            if (Math.abs(pos[i * 3 + 2]) > 5)  vel[i].z *= -1;

            /* Mouse repulsion */
            const dx = pos[i * 3] - mouseX;
            const dy = pos[i * 3 + 1] - mouseY;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < 5 && d > 0.01) {
              const f = ((5 - d) / 5) * 0.025;
              vel[i].x += (dx / d) * f;
              vel[i].y += (dy / d) * f;
              vel[i].x *= 0.98;
              vel[i].y *= 0.98;
            }
          }
          pAttr.needsUpdate = true;

          /* Connections */
          const lp: number[] = [];
          const MAX = 5.5;
          for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
              const ddx = pos[i*3]   - pos[j*3];
              const ddy = pos[i*3+1] - pos[j*3+1];
              const ddz = pos[i*3+2] - pos[j*3+2];
              if (Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz) < MAX) {
                lp.push(pos[i*3], pos[i*3+1], pos[i*3+2], pos[j*3], pos[j*3+1], pos[j*3+2]);
              }
            }
          }
          lGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));

          /* Slow camera drift */
          camera.position.x = Math.sin(t * 0.08) * 1.2;
          camera.position.y = Math.cos(t * 0.06) * 0.7;
          camera.lookAt(0, 0, 0);

          renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
          const nW = canvas.clientWidth;
          const nH = canvas.clientHeight;
          camera.aspect = nW / nH;
          camera.updateProjectionMatrix();
          renderer.setSize(nW, nH);
        };
        window.addEventListener("resize", onResize);
        (rendererObj as any)._cleanup = () => window.removeEventListener("resize", onResize);

      } catch (e) {
        console.warn("WebGL unavailable", e);
      }
    })();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      (rendererObj as any)?._cleanup?.();
      rendererObj?.dispose();
    };
  }, []);

  /* ── GSAP Scroll Animations ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        /* Hero entrance */
        const tl = gsap.timeline({ delay: 0.2 });
        tl.from(".hero-badge",  { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" })
          .from(".hero-line-1", { y: 100, opacity: 0, duration: 1, ease: "power4.out" }, "-=0.4")
          .from(".hero-line-2", { y: 100, opacity: 0, duration: 1, ease: "power4.out" }, "-=0.75")
          .from(".hero-sub",    { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.5")
          .from(".hero-desc",   { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
          .from(".hero-cta > *",{ y: 20, opacity: 0, duration: 0.5, stagger: 0.12, ease: "power3.out" }, "-=0.3");

        /* Scroll reveals */
        document.querySelectorAll<HTMLElement>(".reveal-up").forEach((el) => {
          gsap.from(el, {
            y: 60, opacity: 0, duration: 0.9, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        });
        document.querySelectorAll<HTMLElement>(".reveal-card").forEach((el, i) => {
          gsap.from(el, {
            y: 50, opacity: 0, duration: 0.75, ease: "power3.out",
            delay: (i % 3) * 0.08,
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });
      } catch (e) {
        console.warn("GSAP unavailable", e);
      }
    })();
  }, []);

  /* ── Custom cursor ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const dot  = document.createElement("div");
    const ring = document.createElement("div");
    dot.className  = "cur-dot";
    ring.className = "cur-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    let rx = 0, ry = 0;

    const move = (e: MouseEvent) => {
      dot.style.left  = e.clientX + "px";
      dot.style.top   = e.clientY + "px";
      gsapMove(e.clientX, e.clientY);
    };
    const gsapMove = (x: number, y: number) => {
      rx += (x - rx) * 0.12;
      ry += (y - ry) * 0.12;
      ring.style.left = rx + "px";
      ring.style.top  = ry + "px";
      requestAnimationFrame(() => gsapMove(x, y));
    };

    const expand  = () => { dot.style.transform = "translate(-50%,-50%) scale(3)"; dot.style.opacity = "0.3"; };
    const shrink  = () => { dot.style.transform = "translate(-50%,-50%) scale(1)"; dot.style.opacity = "1"; };

    window.addEventListener("mousemove", move);
    document.querySelectorAll("a,button,input").forEach(el => {
      el.addEventListener("mouseenter", expand);
      el.addEventListener("mouseleave", shrink);
    });

    return () => {
      window.removeEventListener("mousemove", move);
      dot.remove();
      ring.remove();
    };
  }, []);

  /* ── Login ───────────────────────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/search");
        router.refresh();
      } else {
        setError("Accès refusé");
        setPassword("");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=JetBrains+Mono:wght@300;400;700&display=swap');

        body { background: #020509 !important; }
        * { cursor: none !important; }

        .cur-dot {
          position: fixed; pointer-events: none; z-index: 99999;
          width: 8px; height: 8px;
          background: #00d4ff; border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 14px #00d4ff, 0 0 40px rgba(0,212,255,0.3);
          transition: transform 0.15s, opacity 0.15s;
        }
        .cur-ring {
          position: fixed; pointer-events: none; z-index: 99998;
          width: 30px; height: 30px;
          border: 1px solid rgba(0,212,255,0.35);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .hero-line-1, .hero-line-2 {
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: clamp(54px, 9.5vw, 110px);
          letter-spacing: -0.04em;
          line-height: 0.95;
          margin: 0;
        }
        .hero-line-1 { color: #f1f5f9; }
        .hero-line-2 {
          background: linear-gradient(135deg, #00d4ff 0%, #6c63ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #00d4ff;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .section-label::before {
          content: '';
          display: inline-block;
          width: 24px;
          height: 1px;
          background: #00d4ff;
          flex-shrink: 0;
        }
        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(30px, 4vw, 52px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f1f5f9;
          margin: 0 0 56px;
        }

        /* Noise overlay */
        .noise-layer {
          position: fixed; inset: 0; pointer-events: none; z-index: 9997; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* Grid bg */
        .grid-bg {
          background-image:
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div className="noise-layer" />

      <div style={{ background: "#020509", minHeight: "100vh", paddingTop: 60 }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="grid-bg" style={{
          position: "relative", height: "100vh",
          overflow: "hidden", display: "flex", alignItems: "center",
        }}>
          {/* Three.js canvas */}
          <canvas ref={canvasRef} style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", zIndex: 1,
          }} />

          {/* Radial vignette */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            background: "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 30%, rgba(2,5,9,0.85) 80%)",
          }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: "35%", zIndex: 2,
            background: "linear-gradient(transparent, #020509)",
          }} />

          {/* Content */}
          <div style={{
            position: "relative", zIndex: 3,
            width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 48px",
          }}>
            {/* Status */}
            <div className="hero-badge" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "#00d4ff", letterSpacing: "0.2em",
              padding: "8px 20px",
              border: "1px solid rgba(0,212,255,0.2)",
              background: "rgba(0,212,255,0.04)",
              marginBottom: 40,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#00d4ff", display: "inline-block",
                boxShadow: "0 0 10px #00d4ff, 0 0 20px rgba(0,212,255,0.5)",
                animation: "pulse 2s ease-in-out infinite",
              }} />
              INGÉNIEUR CYBERSÉCURITÉ · ÎLE-DE-FRANCE
            </div>

            {/* Name */}
            <div style={{ overflow: "hidden", marginBottom: 6 }}>
              <h1 className="hero-line-1">JEAN-BAPTISTE</h1>
            </div>
            <div style={{ overflow: "hidden", marginBottom: 32 }}>
              <h1 className="hero-line-2">CHAGNAT</h1>
            </div>

            {/* Subtitle */}
            <p className="hero-sub" style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, color: "rgba(241,245,249,0.35)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: 20,
            }}>
              Pluxee · Orange Cyberdefense · ESGI Paris · ITIL V4 · Akamai Certified
            </p>
            <p className="hero-desc" style={{
              fontSize: 16, color: "rgba(241,245,249,0.5)",
              fontWeight: 300, lineHeight: 1.8,
              maxWidth: 460, marginBottom: 44,
            }}>
              Protection des systèmes d&apos;information, gestion des vulnérabilités
              et sécurisation des infrastructures critiques.
            </p>

            {/* CTAs */}
            <div className="hero-cta" style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <a href="mailto:chagnat-jb@outlook.fr" style={{
                display: "inline-block",
                background: "#00d4ff", color: "#020509",
                textDecoration: "none",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.15em", textTransform: "uppercase",
                padding: "14px 34px",
                transition: "all 0.25s",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "#33ddff";
                  el.style.boxShadow = "0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.2)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "#00d4ff";
                  el.style.boxShadow = "none";
                }}
              >
                Me contacter →
              </a>
              <a href="#experience" style={{
                display: "inline-block",
                color: "rgba(241,245,249,0.5)",
                textDecoration: "none",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, letterSpacing: "0.12em",
                padding: "14px 28px",
                border: "1px solid rgba(241,245,249,0.12)",
                transition: "all 0.25s",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(0,212,255,0.4)";
                  el.style.color = "#00d4ff";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(241,245,249,0.12)";
                  el.style.color = "rgba(241,245,249,0.5)";
                }}
              >
                Parcours ↓
              </a>
            </div>
          </div>

          {/* Scroll hint */}
          <div style={{
            position: "absolute", right: 48, bottom: 48, zIndex: 3,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            opacity: 0.3,
          }}>
            <div style={{
              width: 1, height: 56,
              background: "linear-gradient(180deg, #00d4ff, transparent)",
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, color: "#00d4ff",
              letterSpacing: "0.3em", writingMode: "vertical-rl",
            }}>SCROLL</span>
          </div>
        </section>

        {/* ── EXPÉRIENCES ──────────────────────────────────────────────────── */}
        <section id="experience" style={{ padding: "130px 48px", maxWidth: 1200, margin: "0 auto" }}>
          <div className="reveal-up">
            <div className="section-label">01 — Expériences</div>
            <h2 className="section-title">Parcours professionnel</h2>
          </div>

          <div style={{ position: "relative", paddingLeft: 40 }}>
            {/* Timeline line */}
            <div style={{
              position: "absolute", left: 0, top: 6, bottom: 0,
              width: 1,
              background: "linear-gradient(180deg, #00d4ff 0%, rgba(0,212,255,0.08) 100%)",
            }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
              {EXP.map((exp, i) => (
                <div key={i} className="reveal-card" style={{ position: "relative" }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: "absolute", left: -47, top: 28,
                    width: 14, height: 14, borderRadius: "50%",
                    background: exp.current ? exp.color : "#020509",
                    border: `2px solid ${exp.color}`,
                    boxShadow: exp.current ? `0 0 20px ${exp.color}80, 0 0 40px ${exp.color}30` : "none",
                    zIndex: 1,
                  }} />

                  {/* Card */}
                  <div style={{
                    background: "rgba(255,255,255,0.018)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `2px solid ${exp.color}50`,
                    padding: "28px 32px",
                    transition: "all 0.35s",
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = `${exp.color}06`;
                      el.style.borderLeftColor = exp.color;
                      el.style.transform = "translateX(6px)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255,255,255,0.018)";
                      el.style.borderLeftColor = `${exp.color}50`;
                      el.style.transform = "translateX(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                      <div>
                        <div style={{
                          fontFamily: "'Syne', sans-serif",
                          fontSize: 20, fontWeight: 700,
                          color: "#f1f5f9", marginBottom: 5,
                        }}>{exp.company}</div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, color: exp.color, letterSpacing: "0.06em",
                        }}>{exp.role}</div>
                      </div>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                        color: exp.current ? exp.color : "rgba(241,245,249,0.3)",
                        background: exp.current ? `${exp.color}15` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${exp.current ? `${exp.color}30` : "rgba(255,255,255,0.06)"}`,
                        padding: "5px 14px", letterSpacing: "0.1em", whiteSpace: "nowrap",
                      }}>{exp.period}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {exp.tasks.map((task, j) => (
                        <div key={j} style={{
                          display: "flex", gap: 14,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12, color: "rgba(241,245,249,0.4)",
                          lineHeight: 1.6,
                        }}>
                          <span style={{ color: exp.color, opacity: 0.8, flexShrink: 0 }}>›</span>
                          {task}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPÉTENCES ──────────────────────────────────────────────────── */}
        <section style={{
          background: "rgba(0,212,255,0.012)",
          borderTop: "1px solid rgba(0,212,255,0.07)",
          borderBottom: "1px solid rgba(0,212,255,0.07)",
          padding: "130px 48px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="reveal-up">
              <div className="section-label">02 — Compétences</div>
              <h2 className="section-title">Stack technique</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 20 }}>
              {SKILLS.map((group) => (
                <div key={group.cat} className="reveal-card" style={{
                  background: group.bg,
                  border: `1px solid ${group.border}`,
                  padding: "28px 30px",
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, color: group.color,
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    marginBottom: 20,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ width: 18, height: 1, background: group.color, display: "inline-block" }} />
                    {group.cat}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {group.items.map((item) => (
                      <span key={item} style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11, color: "rgba(241,245,249,0.65)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "6px 14px",
                        transition: "all 0.2s",
                      }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.color = group.color;
                          el.style.borderColor = group.border;
                          el.style.background = group.bg;
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.color = "rgba(241,245,249,0.65)";
                          el.style.borderColor = "rgba(255,255,255,0.08)";
                          el.style.background = "rgba(255,255,255,0.04)";
                        }}
                      >{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FORMATION + CERTS ────────────────────────────────────────────── */}
        <section style={{ padding: "130px 48px", maxWidth: 1200, margin: "0 auto" }}>
          <div className="reveal-up">
            <div className="section-label">03 — Formation</div>
            <h2 className="section-title">Éducation & certifications</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {[
              { icon: "◈", label: "ESGI Paris", sub: "Expert Cybersécurité (Bac+5)", year: "2022", color: "#00d4ff" },
              { icon: "◈", label: "LPASSR — Lieusaint 77", sub: "Licence Admin. Sécurité Sys. & Réseau", year: "2020", color: "#a78bfa" },
              { icon: "◉", label: "Akamai Web App Security", sub: "Certification constructeur", year: "2025", color: "#34d399" },
              { icon: "◉", label: "ITIL V4 Foundation", sub: "Gestion des services IT", year: "2020", color: "#f59e0b" },
            ].map((item, i) => (
              <div key={i} className="reveal-card" style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "22px 26px",
                display: "flex", gap: 16, alignItems: "flex-start",
                transition: "all 0.3s",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = `${item.color}30`;
                  el.style.background = `${item.color}06`;
                  el.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(255,255,255,0.06)";
                  el.style.background = "rgba(255,255,255,0.018)";
                  el.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: 20, color: item.color, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(241,245,249,0.35)", lineHeight: 1.5, marginBottom: 10 }}>{item.sub}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: item.color, letterSpacing: "0.1em" }}>{item.year}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROJETS ──────────────────────────────────────────────────────── */}
        <section style={{
          background: "rgba(108,99,255,0.015)",
          borderTop: "1px solid rgba(108,99,255,0.07)",
          borderBottom: "1px solid rgba(108,99,255,0.07)",
          padding: "130px 48px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="reveal-up">
              <div className="section-label" style={{ color: "#a78bfa" }}>
                <style>{`.section-label-purple::before { background: #a78bfa !important; }`}</style>
                04 — Projets
              </div>
              <h2 className="section-title">Réalisations</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20 }}>
              {[
                {
                  num: "01",
                  title: "HTB Platform",
                  desc: "Projet de master — Plateforme type HackTheBox avec déploiement automatisé d'une VM Kali Linux. Authentification, réseau isolé et challenge d'exploitation de vulnérabilités.",
                  tags: ["Kali Linux", "Virtualisation", "Security", "Auth"],
                  color: "#f43f5e",
                },
                {
                  num: "02",
                  title: "cmdmem",
                  desc: "Mémoire de commandes shell intelligente avec capture automatique, enrichissement IA, client SSH multi-onglets et filtrage intelligent des doublons.",
                  tags: ["Python", "FastAPI", "Next.js", "Three.js", "SSH", "VPS"],
                  color: "#00d4ff",
                },
              ].map((p, i) => (
                <div key={i} className="reveal-card" style={{
                  background: "rgba(255,255,255,0.018)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "36px 36px",
                  position: "relative", overflow: "hidden",
                  transition: "all 0.35s",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = `${p.color}30`;
                    el.style.background = `${p.color}06`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(255,255,255,0.06)";
                    el.style.background = "rgba(255,255,255,0.018)";
                  }}
                >
                  <div style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 64,
                    fontWeight: 900, color: p.color, opacity: 0.06,
                    position: "absolute", top: -10, right: 20,
                    letterSpacing: "-0.04em", lineHeight: 1,
                  }}>{p.num}</div>

                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 14 }}>{p.title}</div>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(241,245,249,0.38)", lineHeight: 1.8, marginBottom: 24 }}>{p.desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {p.tags.map(t => (
                      <span key={t} style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10, color: p.color,
                        background: `${p.color}12`,
                        border: `1px solid ${p.color}25`,
                        padding: "4px 12px", letterSpacing: "0.08em",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT + AUTH ───────────────────────────────────────────────── */}
        <section className="grid-bg" style={{
          padding: "130px 48px 120px",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        }}>
          <div className="reveal-up" style={{ width: "100%", maxWidth: 700 }}>
            <div className="section-label" style={{ justifyContent: "center" }}>05 — Contact</div>

            <a href="mailto:chagnat-jb@outlook.fr" style={{
              display: "block",
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(24px, 4.5vw, 56px)",
              fontWeight: 900, letterSpacing: "-0.03em",
              color: "#f1f5f9", textDecoration: "none",
              marginBottom: 12,
              transition: "color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#00d4ff"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#f1f5f9"}
            >
              chagnat-jb@outlook.fr
            </a>

            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: "rgba(241,245,249,0.2)",
              letterSpacing: "0.15em", textTransform: "uppercase",
              marginBottom: 80,
            }}>
              Pringy · 77310 · France
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 60, background: "linear-gradient(180deg, rgba(0,212,255,0.3), transparent)", margin: "0 auto 48px" }} />

            {/* Private access */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: "rgba(241,245,249,0.18)",
                letterSpacing: "0.3em", textTransform: "uppercase",
              }}>
                🔒 &nbsp; Accès privé
              </div>
              <form onSubmit={handleLogin} style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${error ? "rgba(244,63,94,0.35)" : "rgba(255,255,255,0.08)"}`,
                    padding: "11px 20px",
                    color: "#f1f5f9",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14, letterSpacing: "0.25em",
                    outline: "none", width: 210,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(0,212,255,0.4)"}
                  onBlur={e => e.currentTarget.style.borderColor = error ? "rgba(244,63,94,0.35)" : "rgba(255,255,255,0.08)"}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "rgba(0,212,255,0.08)",
                    border: "1px solid rgba(0,212,255,0.2)",
                    color: "#00d4ff",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13, padding: "11px 22px",
                    cursor: submitting ? "wait" : "pointer",
                    letterSpacing: "0.1em",
                    transition: "all 0.25s",
                    opacity: submitting ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (submitting) return;
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "rgba(0,212,255,0.18)";
                    el.style.boxShadow = "0 0 24px rgba(0,212,255,0.25)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "rgba(0,212,255,0.08)";
                    el.style.boxShadow = "none";
                  }}
                >
                  {submitting ? "..." : "→"}
                </button>
              </form>
              {error && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, color: "#f43f5e", letterSpacing: "0.1em",
                }}>
                  ✕ {error}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px #00d4ff, 0 0 20px rgba(0,212,255,0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 6px #00d4ff, 0 0 12px rgba(0,212,255,0.3); }
        }
      `}</style>
    </>
  );
}
