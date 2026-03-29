"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SKILLS = [
  {
    category: "Sécurité",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.07)",
    border: "rgba(244,63,94,0.18)",
    items: ["Qualys", "Akamai", "Check Point", "Palo Alto", "Juniper"],
  },
  {
    category: "Infrastructure",
    color: "#10b981",
    bg: "rgba(16,185,129,0.07)",
    border: "rgba(16,185,129,0.18)",
    items: ["Centreon", "Active Directory", "Windows Server", "Linux", "GPO"],
  },
  {
    category: "DevOps & Outils",
    color: "#6c63ff",
    bg: "rgba(108,99,255,0.07)",
    border: "rgba(108,99,255,0.18)",
    items: ["Jenkins", "Puppet", "GitLab", "Tanium", "Git"],
  },
];

const EXPERIENCES = [
  {
    company: "Pluxee",
    role: "Ingénieur Sécurité et Système",
    period: "Juin 2023 — Présent",
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
    current: false,
    tasks: [
      "Prise en charge des incidents N2 sur infrastructures de sécurité réseau",
      "Administration firewalls : Check Point, Palo Alto, Juniper",
      "Communication avec les supports constructeurs",
    ],
  },
  {
    company: "Hutchinson",
    role: "Alternance — Administrateur Système & Réseau",
    period: "2019 — 2020",
    current: false,
    tasks: [
      "Administration d'un parc de ~300 serveurs (Windows & Linux)",
      "Gestion des utilisateurs et accès (Active Directory, GPO)",
      "Maintenance et support de l'infrastructure",
    ],
  },
];

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      color: "var(--accent2)",
      letterSpacing: "0.25em",
      textTransform: "uppercase",
      marginBottom: 10,
    }}>{label}</div>
  );
}

function SectionTitle({ label, title, small = false }: { label: string; title: string; small?: boolean }) {
  return (
    <div style={{ marginBottom: small ? 22 : 44 }}>
      <SectionLabel label={label} />
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: small ? 22 : "clamp(26px, 3.5vw, 38px)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color: "var(--text)",
        margin: 0,
      }}>{title}</h2>
    </div>
  );
}

export default function PortfolioPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        setError("Mot de passe incorrect");
        setPassword("");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60 }}>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "80px 24px",
      }}>
        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(108,99,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(108,99,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(108,99,255,0.06), transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 220, zIndex: 1,
          background: "linear-gradient(transparent, var(--bg))",
        }} />

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 680 }}>
          {/* Status badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "var(--accent2)", letterSpacing: "0.15em",
            padding: "6px 18px", borderRadius: 20,
            border: "1px solid rgba(108,99,255,0.25)",
            background: "rgba(108,99,255,0.06)",
            marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 7px var(--green)", display: "inline-block" }} />
            En poste · Île-de-France
          </div>

          {/* Name */}
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(44px, 8vw, 88px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.02,
            marginBottom: 18,
          }}>
            <span style={{ color: "var(--text)" }}>Jean-Baptiste</span>
            <br />
            <span className="gradient-text">Chagnat</span>
          </h1>

          {/* Title */}
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(12px, 1.8vw, 15px)",
            color: "var(--muted)", letterSpacing: "0.12em",
            textTransform: "uppercase", marginBottom: 24,
          }}>
            Ingénieur Cybersécurité
          </div>

          {/* Bio */}
          <p style={{
            fontSize: 16, color: "var(--muted)", fontWeight: 300,
            lineHeight: 1.75, maxWidth: 500, margin: "0 auto 40px",
          }}>
            Spécialisé dans la protection des systèmes d&apos;information,
            la gestion des vulnérabilités et l&apos;administration d&apos;infrastructures sécurisées.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:chagnat-jb@outlook.fr" style={{
              background: "linear-gradient(135deg, var(--accent), #4f46e5)",
              color: "white", textDecoration: "none",
              fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
              padding: "13px 30px", borderRadius: 10, letterSpacing: "0.02em",
              boxShadow: "0 4px 22px rgba(108,99,255,0.38)",
              transition: "all 0.2s", display: "inline-block",
            }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(0)"}
            >
              Me contacter
            </a>
            <a href="#experience" style={{
              background: "var(--surface)", color: "var(--text)",
              textDecoration: "none",
              fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600,
              padding: "13px 30px", borderRadius: 10,
              border: "1px solid var(--border)", letterSpacing: "0.02em",
              transition: "all 0.2s", display: "inline-block",
            }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "rgba(108,99,255,0.4)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
            >
              Mon parcours ↓
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 2, opacity: 0.3 }}>
          <svg width="14" height="24" viewBox="0 0 14 24" fill="none">
            <rect x="1" y="1" width="12" height="22" rx="6" stroke="currentColor" strokeWidth="1.5" />
            <rect x="6" y="6" width="2" height="5" rx="1" fill="currentColor" style={{ animation: "float 2s ease-in-out infinite" }} />
          </svg>
        </div>
      </section>

      {/* ── EXPÉRIENCES ── */}
      <section id="experience" style={{ maxWidth: 820, margin: "0 auto", padding: "80px 24px" }}>
        <SectionTitle label="Parcours professionnel" title="Expériences" />
        <div style={{ position: "relative" }}>
          {/* Timeline line */}
          <div style={{
            position: "absolute", left: 19, top: 6, bottom: 20, width: 2,
            background: "linear-gradient(180deg, var(--accent) 0%, rgba(108,99,255,0.08) 100%)",
            borderRadius: 2,
          }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {EXPERIENCES.map((exp, i) => (
              <div key={i} style={{ display: "flex", gap: 32 }}>
                {/* Dot */}
                <div style={{ width: 40, flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 5 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", zIndex: 1,
                    background: exp.current ? "var(--accent)" : "var(--surface2)",
                    border: `2.5px solid ${exp.current ? "var(--accent)" : "var(--border2)"}`,
                    boxShadow: exp.current ? "0 0 14px rgba(108,99,255,0.7)" : "none",
                  }} />
                </div>
                {/* Card */}
                <div style={{
                  flex: 1,
                  background: "var(--surface)",
                  border: `1px solid ${exp.current ? "rgba(108,99,255,0.28)" : "var(--border)"}`,
                  borderRadius: 14,
                  padding: "22px 26px",
                  boxShadow: exp.current ? "0 0 40px rgba(108,99,255,0.06)" : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 3 }}>{exp.company}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent2)", letterSpacing: "0.05em" }}>{exp.role}</div>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 10,
                      color: exp.current ? "var(--green)" : "var(--muted)",
                      background: exp.current ? "rgba(16,185,129,0.1)" : "var(--surface2)",
                      border: `1px solid ${exp.current ? "rgba(16,185,129,0.22)" : "var(--border)"}`,
                      padding: "4px 12px", borderRadius: 6,
                      letterSpacing: "0.05em", whiteSpace: "nowrap",
                    }}>{exp.period}</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                    {exp.tasks.map((task, j) => (
                      <li key={j} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                        <span style={{ color: "var(--accent2)", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 10, marginTop: 3 }}>▸</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPÉTENCES ── */}
      <section style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        padding: "80px 24px",
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <SectionTitle label="Stack technique" title="Compétences" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
            {SKILLS.map((group) => (
              <div key={group.category} style={{
                background: group.bg, border: `1px solid ${group.border}`,
                borderRadius: 14, padding: "22px 24px",
              }}>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  color: group.color, letterSpacing: "0.15em",
                  textTransform: "uppercase", marginBottom: 14,
                }}>{group.category}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {group.items.map((item) => (
                    <span key={item} style={{
                      fontFamily: "var(--font-mono)", fontSize: 12,
                      color: "var(--text)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "5px 12px", borderRadius: 8,
                    }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMATION + CERTIFS + PROJETS ── */}
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 36 }}>

          {/* Formation */}
          <div>
            <SectionTitle label="Académique" title="Formation" small />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { school: "ESGI Paris", diploma: "Expert Cybersécurité (Bac+5)", year: "2022" },
                { school: "LPASSR — Lieusaint 77", diploma: "Licence Admin. Sécurité Système & Réseau", year: "2020" },
              ].map((f) => (
                <div key={f.school} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "16px 20px",
                }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{f.school}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, marginBottom: 8 }}>{f.diploma}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)" }}>{f.year}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <SectionTitle label="Certifications" title="Certifications" small />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { name: "Akamai Web App Security", year: "2025", icon: "🛡" },
                { name: "ITIL V4 Foundation", year: "2020", icon: "🏅" },
              ].map((c) => (
                <div key={c.name} style={{
                  background: "var(--surface)",
                  border: "1px solid rgba(108,99,255,0.2)",
                  borderRadius: 12, padding: "16px 20px",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, flexShrink: 0,
                    background: "rgba(108,99,255,0.1)",
                    border: "1px solid rgba(108,99,255,0.2)",
                    borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>{c.icon}</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)" }}>{c.year}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Projets */}
        <div style={{ marginTop: 52 }}>
          <SectionTitle label="Réalisations" title="Projets" small />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {[
              {
                name: "HTB Platform",
                desc: "Plateforme type HackTheBox : déploiement automatisé d'une VM Kali Linux avec authentification et vulnérabilité à exploiter. Projet de 5e année de Master.",
                tags: ["Kali Linux", "Virtualisation", "Cybersécurité"],
                icon: "🎯",
              },
              {
                name: "cmdmem",
                desc: "Mémoire de commandes shell intelligente. Capture automatique, enrichissement IA et recherche par intention en langage naturel.",
                tags: ["Python", "FastAPI", "Next.js", "SSH", "Hetzner"],
                icon: "⌨",
              },
            ].map((p) => (
              <div key={p.name} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 14, padding: "22px 24px",
                display: "flex", flexDirection: "column", gap: 12,
                transition: "border-color 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "rgba(108,99,255,0.3)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, flexShrink: 0,
                    background: "rgba(108,99,255,0.1)",
                    border: "1px solid rgba(108,99,255,0.2)",
                    borderRadius: 11,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>{p.icon}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>{p.name}</div>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{p.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {p.tags.map((t) => (
                    <span key={t} style={{
                      fontFamily: "var(--font-mono)", fontSize: 10,
                      color: "var(--muted)", background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      padding: "3px 10px", borderRadius: 6,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT + ACCÈS PRIVÉ ── */}
      <section style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "70px 24px 90px",
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>

          {/* Contact */}
          <div style={{ textAlign: "center" }}>
            <SectionLabel label="Contact" />
            <a href="mailto:chagnat-jb@outlook.fr" style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(20px, 3.5vw, 32px)",
              fontWeight: 800, letterSpacing: "-0.02em",
              color: "var(--text)", textDecoration: "none",
              display: "block", marginBottom: 8,
              transition: "color 0.2s",
            }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--accent2)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text)"}
            >
              chagnat-jb@outlook.fr
            </a>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em" }}>
              Pringy · 77310 · France
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "100%", maxWidth: 320, height: 1, background: "var(--border)" }} />

          {/* Accès privé */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              fontFamily: "var(--font-mono)", fontSize: 10,
              color: "var(--muted)", letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}>
              <span>🔒</span> Accès privé
            </div>
            <form onSubmit={handleLogin} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  background: "var(--surface2)",
                  border: `1px solid ${error ? "rgba(244,63,94,0.35)" : "var(--border2)"}`,
                  borderRadius: 8,
                  padding: "10px 16px",
                  color: "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  outline: "none",
                  width: 190,
                  letterSpacing: "0.2em",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "rgba(108,99,255,0.5)"}
                onBlur={(e) => e.currentTarget.style.borderColor = error ? "rgba(244,63,94,0.35)" : "var(--border2)"}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "rgba(108,99,255,0.12)",
                  border: "1px solid rgba(108,99,255,0.28)",
                  color: "var(--accent2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  padding: "10px 18px",
                  borderRadius: 8,
                  cursor: loading ? "wait" : "pointer",
                  fontWeight: 700,
                  opacity: loading ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "rgba(108,99,255,0.22)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(108,99,255,0.12)"; }}
              >
                {loading ? "…" : "→"}
              </button>
            </form>
            {error && (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: "var(--red)", letterSpacing: "0.08em",
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
