"use client";

import { useState, useEffect, useRef } from "react"; // useRef kept for Counter/SkillBar
import { useRouter } from "next/navigation";
import CyberBackground from "@/components/CyberBackground";
import PixelGame from "@/components/PixelGame";

function useIsMobile() {
  const [mob, setMob] = useState(false);
  useEffect(() => {
    const check = () => setMob(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mob;
}

/* ─── CV Data ────────────────────────────────────────────────────────────────── */

const STATS = [
  { value: 5, suffix: "+", label: "ANS D'EXP.", color: "#00d4ff" },
  { value: 3,  suffix: "",  label: "ENTREPRISES",  color: "#a78bfa" },
  { value: 12, suffix: "+", label: "OUTILS SÉCU.", color: "#34d399" },
  { value: 300, suffix: "+", label: "SERVEURS ADM.", color: "#f59e0b" },
];

const SKILLS = [
  { name: "Qualys / Vulnerability Mgmt", level: 92, color: "#00d4ff" },
  { name: "Firewall (Check Point, Palo Alto)", level: 88, color: "#00d4ff" },
  { name: "Akamai / Web Security", level: 85, color: "#a78bfa" },
  { name: "Active Directory / GPO", level: 90, color: "#a78bfa" },
  { name: "Jenkins / Puppet / GitLab", level: 80, color: "#34d399" },
  { name: "Linux / Windows Server", level: 88, color: "#34d399" },
  { name: "Centreon / Monitoring", level: 82, color: "#f59e0b" },
  { name: "SIEM / SOC (N2)", level: 78, color: "#f59e0b" },
];

const CERTS = [
  { name: "ITIL V4", full: "Foundation\nService Management", color: "#a78bfa", icon: "⚙️" },
  { name: "AKAMAI", full: "Web Security App\nAkamai Technologies", color: "#00d4ff", icon: "🛡️" },
];

const EXP = [
  {
    id: "01",
    company: "PLUXEE",
    role: "Ingénieur Sécurité et Système",
    period: "2023 — PRÉSENT",
    color: "#00d4ff",
    current: true,
    tasks: [
      "Gestion et remédiation des vulnérabilités via Qualys",
      "Configuration sécurité sur la plateforme Akamai",
      "Supervision via Centreon, Jenkins, Puppet et GitLab",
      "Déploiement de Tanium pour les mises à jour serveurs",
    ],
  },
  {
    id: "02",
    company: "ORANGE CYBERDEFENSE",
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
    id: "03",
    company: "HUTCHINSON",
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

/* ─── HUD Corner component ────────────────────────────────────────────────── */
function HudCorners({ color = "#00d4ff", size = 14, thickness = 2 }: { color?: string; size?: number; thickness?: number }) {
  const s: React.CSSProperties = { position: "absolute", width: size, height: size };
  const h: React.CSSProperties = { position: "absolute", background: color };
  return (
    <>
      {/* TL */}
      <div style={{ ...s, top: 0, left: 0 }}>
        <div style={{ ...h, top: 0, left: 0, width: thickness, height: size }} />
        <div style={{ ...h, top: 0, left: 0, width: size, height: thickness }} />
      </div>
      {/* TR */}
      <div style={{ ...s, top: 0, right: 0 }}>
        <div style={{ ...h, top: 0, right: 0, width: thickness, height: size }} />
        <div style={{ ...h, top: 0, right: 0, width: size, height: thickness }} />
      </div>
      {/* BL */}
      <div style={{ ...s, bottom: 0, left: 0 }}>
        <div style={{ ...h, bottom: 0, left: 0, width: thickness, height: size }} />
        <div style={{ ...h, bottom: 0, left: 0, width: size, height: thickness }} />
      </div>
      {/* BR */}
      <div style={{ ...s, bottom: 0, right: 0 }}>
        <div style={{ ...h, bottom: 0, right: 0, width: thickness, height: size }} />
        <div style={{ ...h, bottom: 0, right: 0, width: size, height: thickness }} />
      </div>
    </>
  );
}

/* ─── Animated Counter ────────────────────────────────────────────────────── */
function Counter({ target, duration = 1600 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1);
        setVal(Math.floor(p * target));
        if (p < 1) requestAnimationFrame(tick);
        else setVal(target);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}</span>;
}

/* ─── Skill Bar ───────────────────────────────────────────────────────────── */
function SkillBar({ name, level, color }: { name: string; level: number; color: string }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setAnimated(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(232,232,240,0.7)", letterSpacing: "0.04em" }}>{name}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color, letterSpacing: "0.05em" }}>{level}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: animated ? `${level}%` : "0%",
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}88`,
          transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

/* ─── Root: mode selector ────────────────────────────────────────────────── */
export default function Page() {
  const [mode, setMode] = useState<"game" | "cv">("game");
  const mob = useIsMobile();

  return (
    <>
      {/* Mode toggle button — always visible */}
      <button
        onClick={() => setMode(m => m === "game" ? "cv" : "game")}
        style={{
          position: "fixed", top: mob ? 14 : 12, right: mob ? 8 : 12, zIndex: 9999,
          background: "rgba(0,10,25,0.92)", border: "1px solid #00d4ff",
          color: "#00d4ff", padding: mob ? "10px 14px" : "6px 12px", borderRadius: 4, cursor: "pointer",
          fontFamily: '"Press Start 2P", monospace', fontSize: mob ? 7 : 8,
          boxShadow: "0 0 12px rgba(0,212,255,0.3)",
          backdropFilter: "blur(8px)",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {mode === "game" ? "[ CV ]" : "[ GAME ]"}
      </button>

      {mode === "game" ? (
        <PixelGame />
      ) : (
        <Portfolio />
      )}
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
function Portfolio() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeExp, setActiveExp] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const router = useRouter();
  const mob = useIsMobile();

  /* ── GSAP scroll reveals ──────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);
        const tl = gsap.timeline({ delay: 0.3 });
        tl.from(".hero-badge",  { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" })
          .from(".hero-line-1", { y: 80, opacity: 0, duration: 0.9, ease: "power4.out" }, "-=0.3")
          .from(".hero-line-2", { y: 80, opacity: 0, duration: 0.9, ease: "power4.out" }, "-=0.65")
          .from(".hero-desc",   { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
          .from(".hero-cta > *",{ y: 20, opacity: 0, duration: 0.5, stagger: 0.1,  ease: "power3.out" }, "-=0.3");
        document.querySelectorAll<HTMLElement>(".reveal-up").forEach(el => {
          gsap.from(el, { y: 50, opacity: 0, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
        });
        document.querySelectorAll<HTMLElement>(".reveal-card").forEach((el, i) => {
          gsap.from(el, { y: 40, opacity: 0, duration: 0.7, ease: "power3.out", delay: (i % 4) * 0.08, scrollTrigger: { trigger: el, start: "top 90%" } });
        });
      } catch {}
    })();
  }, []);

  /* ── Scan line animation ─────────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => setScanLine(v => (v + 1) % 100), 30);
    return () => clearInterval(id);
  }, []);

  /* ── Login ────────────────────────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (r.ok) { router.push("/search"); router.refresh(); }
      else { setError("ACCESS DENIED"); setPassword(""); }
    } catch { setError("CONNECTION ERROR"); }
    finally { setSubmitting(false); }
  };

  /* ── Styles ───────────────────────────────────────────────────────────────── */
  const panel: React.CSSProperties = {
    position: "relative",
    background: "rgba(8,8,14,0.85)",
    border: "1px solid rgba(0,212,255,0.12)",
    backdropFilter: "blur(12px)",
    padding: 24,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", overflowX: "hidden" }}>

      {/* ── Global grid overlay ──────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }} />

      {/* ── Scan line ────────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", left: 0, right: 0, height: 2, zIndex: 1, pointerEvents: "none",
        top: `${scanLine}%`,
        background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.06), transparent)",
        transition: "none",
      }} />

      {/* ── Cyber Background ─────────────────────────────────────────────────── */}
      <CyberBackground />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", alignItems: "center", padding: mob ? "100px 5vw 60px" : "80px 5vw 60px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1.6fr", gap: mob ? 24 : 40, alignItems: "center" }}>

          {/* Left — Profile Panel */}
          <div style={{ ...panel, textAlign: "center" }}>
            <HudCorners color="#00d4ff" size={18} />

            {/* Status badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 28, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "#34d399", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", padding: "5px 14px", borderRadius: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", display: "inline-block", animation: "pulse 2s infinite" }} />
              DISPONIBLE · OPEN TO WORK
            </div>

            {/* Avatar placeholder */}
            <div style={{
              width: 130, height: 130, borderRadius: "50%", margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(167,139,250,0.15))",
              border: "2px solid rgba(0,212,255,0.3)",
              boxShadow: "0 0 30px rgba(0,212,255,0.15), inset 0 0 30px rgba(0,212,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 46, position: "relative",
            }}>
              <span>👤</span>
              <div style={{
                position: "absolute", inset: -6, borderRadius: "50%",
                border: "1px solid rgba(0,212,255,0.1)",
                animation: "spin 20s linear infinite",
              }} />
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#e8e8f0", marginBottom: 6 }}>
              Jean-Baptiste<br />Chagnat
            </h1>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#00d4ff", letterSpacing: "0.12em", marginBottom: 24 }}>
              INGÉNIEUR CYBERSÉCURITÉ
            </div>

            {/* Info lines */}
            {[
              { icon: "📍", val: "Île-de-France, France" },
              { icon: "🎓", val: "Master Cybersécurité" },
              { icon: "🏢", val: "Pluxee (ex-Sodexo)" },
            ].map(({ icon, val }) => (
              <div key={val} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 4 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(232,232,240,0.7)" }}>{val}</span>
              </div>
            ))}

            {/* Contact buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "LinkedIn", color: "#0077b5", href: "https://www.linkedin.com/in/jean-baptiste-chagnat-418b22187/" },
                { label: "Email",    color: "#00d4ff", href: "mailto:chagnat-jb@outlook.fr" },
                { label: "Tél.",     color: "#34d399", href: "tel:+33621235008" },
              ].map(({ label, color, href }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
                  padding: "7px 14px", borderRadius: 3, cursor: "pointer",
                  background: "transparent", color,
                  border: `1px solid ${color}44`,
                  transition: "all 0.2s",
                  textDecoration: "none",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}18`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >{label}</a>
              ))}
            </div>
          </div>

          {/* Right — Hero */}
          <div>
            {/* Label */}
            <div className="hero-badge" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", color: "#00d4ff", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 1, background: "#00d4ff", display: "inline-block" }} />
              PROFIL.SYS // CHARGÉ
            </div>

            <h2 className="hero-line-1" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(38px, 5vw, 66px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 8, color: "#e8e8f0" }}>
              Sécurité.<br />
              <span style={{ background: "linear-gradient(90deg, #00d4ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Résilience.
              </span>
            </h2>
            <h2 className="hero-line-2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(38px, 5vw, 66px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 28, color: "rgba(232,232,240,0.25)" }}>
              Excellence.
            </h2>

            <p className="hero-desc" style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(232,232,240,0.55)", lineHeight: 1.8, maxWidth: 500, marginBottom: 40 }}>
              Ingénieur en cybersécurité avec 5 ans d'expérience en gestion des vulnérabilités, administration firewalls et sécurité des infrastructures critiques.
            </p>

            {/* Stats grid */}
            <div className="hero-cta" style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
              {STATS.map((s) => (
                <div key={s.label} style={{ ...panel, padding: "16px 12px", textAlign: "center" }}>
                  <HudCorners color={s.color} size={10} thickness={1} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 6 }}>
                    <Counter target={s.value} />{s.suffix}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(232,232,240,0.4)", letterSpacing: "0.1em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Scroll hint */}
            <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,232,240,0.25)", letterSpacing: "0.1em" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[1,0.5,0.25].map((o, i) => <div key={i} style={{ width: 20, height: 1, background: `rgba(0,212,255,${o})` }} />)}
              </div>
              DÉFILER POUR EXPLORER
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SKILLS + CERTS                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 2, padding: mob ? "40px 5vw" : "80px 5vw" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: mob ? "1fr" : "1.2fr 1fr", gap: mob ? 24 : 40 }}>

          {/* Skills */}
          <div style={{ ...panel }} className="reveal-up">
            <HudCorners color="#00d4ff" />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", color: "#00d4ff", marginBottom: 4 }}>
              // COMPÉTENCES_TECHNIQUES
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 28, color: "#e8e8f0" }}>
              Stack Technique
            </h3>
            {SKILLS.map((s) => <SkillBar key={s.name} {...s} />)}
          </div>

          {/* Certifications */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", color: "#a78bfa", marginBottom: 4 }} className="reveal-up">
              // CERTIFICATIONS
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#e8e8f0" }} className="reveal-up">
              Accréditations
            </h3>
            {CERTS.map((c, i) => (
              <div key={c.name} className="reveal-card" style={{
                ...panel, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 16,
                transition: "all 0.3s",
                cursor: "default",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${c.color}44`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${c.color}18`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,212,255,0.12)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <HudCorners color={c.color} size={10} thickness={1} />
                <div style={{
                  width: 48, height: 48, borderRadius: 6, flexShrink: 0,
                  background: `${c.color}12`, border: `1px solid ${c.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: c.color, letterSpacing: "0.05em" }}>{c.name}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(232,232,240,0.5)", whiteSpace: "pre-line", lineHeight: 1.5 }}>{c.full}</div>
                </div>
                <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: c.color, background: `${c.color}12`, border: `1px solid ${c.color}30`, padding: "3px 8px", borderRadius: 2, letterSpacing: "0.08em" }}>
                  VALIDÉ
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* EXPERIENCE                                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 2, padding: "40px 5vw 80px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }} className="reveal-up">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#34d399", letterSpacing: "0.2em" }}>// EXPÉRIENCE_PROFESSIONNELLE</span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(52,211,153,0.3), transparent)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "280px 1fr", gap: 0 }} className="reveal-up">

            {/* Tab selector */}
            <div style={{ display: "flex", flexDirection: mob ? "row" : "column", gap: 0, overflowX: mob ? "auto" : undefined, borderRight: mob ? "none" : "1px solid rgba(0,212,255,0.08)", borderBottom: mob ? "1px solid rgba(0,212,255,0.08)" : "none" }}>
              {EXP.map((ex, i) => (
                <button key={ex.id} onClick={() => setActiveExp(i)} style={{
                  padding: mob ? "12px 16px" : "20px 24px", textAlign: "left", cursor: "pointer", flexShrink: 0,
                  background: activeExp === i ? `${ex.color}08` : "transparent",
                  border: "none", borderBottom: mob ? `2px solid ${activeExp === i ? ex.color : "transparent"}` : "1px solid rgba(255,255,255,0.04)",
                  borderLeft: mob ? "none" : `2px solid ${activeExp === i ? ex.color : "transparent"}`,
                  transition: "all 0.2s",
                }}>
                  {!mob && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: activeExp === i ? ex.color : "rgba(232,232,240,0.3)", letterSpacing: "0.1em", marginBottom: 4 }}>[{ex.id}]</div>}
                  <div style={{ fontFamily: "var(--font-display)", fontSize: mob ? 11 : 14, fontWeight: 700, color: activeExp === i ? "#e8e8f0" : "rgba(232,232,240,0.4)", marginBottom: mob ? 0 : 2, whiteSpace: "nowrap" }}>
                    {ex.company}
                  </div>
                  {!mob && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: activeExp === i ? ex.color : "rgba(232,232,240,0.25)", letterSpacing: "0.04em" }}>{ex.period}</div>}
                  {ex.current && !mob && (
                    <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 9, color: "#34d399", letterSpacing: "0.1em" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
                      ACTUEL
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            {EXP.map((ex, i) => (
              <div key={ex.id} style={{
                display: activeExp === i ? "block" : "none",
                padding: mob ? "16px" : "28px 32px",
                background: `${ex.color}04`,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: ex.color, letterSpacing: "0.15em", marginBottom: 6 }}>
                      {ex.period}
                    </div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#e8e8f0", marginBottom: 4 }}>
                      {ex.role}
                    </h3>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: ex.color }}>
                      {ex.company}
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900, color: `${ex.color}18`, letterSpacing: "-0.04em" }}>
                    {ex.id}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ex.tasks.map((t, ti) => (
                    <div key={ti} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ color: ex.color, fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 2, flexShrink: 0 }}>▹</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(232,232,240,0.7)", lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECURE ACCESS                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 5vw 100px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 24 : 40, alignItems: "center" }}>

            {/* Left decoration */}
            <div className="reveal-up">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#a78bfa", letterSpacing: "0.2em", marginBottom: 12 }}>
                // ACCÈS_SÉCURISÉ
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "#e8e8f0", marginBottom: 16, lineHeight: 1.2 }}>
                Espace<br /><span style={{ color: "#a78bfa" }}>Privé</span>
              </h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(232,232,240,0.45)", lineHeight: 1.8, maxWidth: 380 }}>
                Accédez à la base de commandes, la documentation interne, les scripts et outils de veille cybersécurité.
              </p>
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                {["Base de commandes shell enrichie", "Documentation technique interne", "Veille CVE CERT-FR & CISA KEV", "Wiki personnel"].map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>✦</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(232,232,240,0.5)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Login panel */}
            <div style={{ ...panel }} className="reveal-up">
              <HudCorners color="#a78bfa" />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "#a78bfa", marginBottom: 20 }}>
                AUTHENTIFICATION REQUISE
              </div>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,232,240,0.4)", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>
                    CLEF D'ACCÈS
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      style={{
                        width: "100%", padding: "12px 16px",
                        fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: "0.2em",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${error ? "rgba(244,63,94,0.4)" : "rgba(167,139,250,0.2)"}`,
                        borderRadius: 4, color: "#e8e8f0", outline: "none",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = "rgba(167,139,250,0.5)"; }}
                      onBlur={e => { (e.target as HTMLElement).style.borderColor = error ? "rgba(244,63,94,0.4)" : "rgba(167,139,250,0.2)"; }}
                    />
                  </div>
                  {error && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#f43f5e", marginTop: 8, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>⚠</span> {error}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={submitting || !password} style={{
                  width: "100%", padding: "13px", cursor: submitting || !password ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em",
                  background: submitting || !password ? "rgba(167,139,250,0.08)" : "rgba(167,139,250,0.12)",
                  color: submitting || !password ? "rgba(167,139,250,0.4)" : "#a78bfa",
                  border: "1px solid rgba(167,139,250,0.25)", borderRadius: 4,
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { if (!submitting && password) { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(167,139,250,0.15)"; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  {submitting ? "VÉRIFICATION..." : "ACCÉDER AU SYSTÈME →"}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "24px 5vw" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: mob ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: mob ? 8 : 0, textAlign: mob ? "center" : undefined }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,232,240,0.2)", letterSpacing: "0.1em" }}>
            © 2025 JEAN-BAPTISTE CHAGNAT
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,232,240,0.2)", letterSpacing: "0.1em" }}>
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      </footer>

      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; box-shadow: 0 0 8px #34d399; } 50% { opacity:0.5; box-shadow: 0 0 4px #34d399; } }
      `}</style>

    </div>
  );
}
