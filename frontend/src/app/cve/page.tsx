"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getCveFeed, refreshCveCache, type CveItem, type CveSeverity } from "@/lib/api";

// ── Constantes ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<CveSeverity, { label: string; color: string; bg: string; icon: string }> = {
  critical: { label: "Critique",  color: "#ff3d00", bg: "rgba(255,61,0,0.12)",    icon: "🔴" },
  high:     { label: "Élevé",     color: "#ff9800", bg: "rgba(255,152,0,0.12)",   icon: "🟠" },
  medium:   { label: "Moyen",     color: "#ffd600", bg: "rgba(255,214,0,0.1)",    icon: "🟡" },
  low:      { label: "Faible",    color: "#4caf50", bg: "rgba(76,175,80,0.1)",    icon: "🟢" },
  unknown:  { label: "Inconnu",   color: "#888",    bg: "rgba(136,136,136,0.08)", icon: "⚪" },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "cert-fr":  { label: "CERT-FR 🇫🇷", color: "#6c63ff", bg: "rgba(108,99,255,0.12)" },
  "cisa-kev": { label: "CISA KEV 🇺🇸", color: "#ff9800", bg: "rgba(255,152,0,0.1)"   },
  "nvd":      { label: "NVD",          color: "#00e5ff", bg: "rgba(0,229,255,0.08)"  },
};

const TYPE_COLORS: Record<string, string> = {
  alerte: "#ff3d00",
  avis:   "#6c63ff",
  ioc:    "#ff9800",
  cve:    "#00e5ff",
  kev:    "#ff3d00",
};

const DEFAULT_KEYWORDS = ["openssl", "windows", "linux", "apache", "nginx", "ssh", "ssl", "tls"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch { return raw; }
}

function timeAgo(raw: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 3600)   return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400)  return `il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
    return formatDate(raw);
  } catch { return ""; }
}

// ── Composant carte CVE ───────────────────────────────────────────────────────

function CveCard({ item, keywords }: { item: CveItem; keywords: string[] }) {
  const sev  = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.unknown;
  const src  = SOURCE_CONFIG[item.source]     ?? SOURCE_CONFIG.nvd;
  const typeColor = TYPE_COLORS[item.type]    ?? "#888";

  // Highlight matched keywords in description
  const highlightDesc = (text: string) => {
    if (!keywords.length) return text;
    const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return text.replace(pattern, "**$1**");
  };

  const desc = highlightDesc(item.description);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${sev.color}22`,
          borderLeft: `3px solid ${sev.color}`,
          borderRadius: 10,
          padding: "14px 18px",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = `${sev.bg}`;
          (e.currentTarget as HTMLElement).style.borderColor = `${sev.color}44`;
          (e.currentTarget as HTMLElement).style.transform = "translateX(2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
          (e.currentTarget as HTMLElement).style.borderColor = `${sev.color}22`;
          (e.currentTarget as HTMLElement).style.transform = "none";
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {/* Severity badge */}
          <span style={{
            background: sev.bg, color: sev.color,
            border: `1px solid ${sev.color}40`,
            borderRadius: 5, padding: "2px 8px",
            fontFamily: "var(--font-mono)", fontSize: 10,
            fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {sev.icon} {sev.label}
          </span>

          {/* Source badge */}
          <span style={{
            background: src.bg, color: src.color,
            border: `1px solid ${src.color}30`,
            borderRadius: 5, padding: "2px 8px",
            fontFamily: "var(--font-mono)", fontSize: 10,
            letterSpacing: "0.05em",
          }}>
            {src.label}
          </span>

          {/* Type badge */}
          <span style={{
            background: `${typeColor}10`, color: typeColor,
            border: `1px solid ${typeColor}25`,
            borderRadius: 5, padding: "2px 8px",
            fontFamily: "var(--font-mono)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {item.type_label}
          </span>

          {/* CVSS score */}
          {item.cvss_score !== null && item.cvss_score !== undefined && (
            <span style={{
              marginLeft: "auto",
              fontFamily: "var(--font-display)", fontSize: 16,
              fontWeight: 800, color: sev.color,
            }}>
              {item.cvss_score.toFixed(1)}
            </span>
          )}

          {/* Date */}
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "var(--muted)", marginLeft: item.cvss_score ? 0 : "auto",
          }}>
            {timeAgo(item.published)}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontFamily: item.source === "cert-fr" ? "var(--font-body)" : "var(--font-mono)",
          fontSize: item.source === "cert-fr" ? 14 : 13,
          fontWeight: 600,
          color: "var(--text)",
          margin: "0 0 6px",
          lineHeight: 1.4,
        }}>
          {item.title}
        </p>

        {/* Description */}
        {item.description && (
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.5,
          }}>
            {desc.split("**").map((part, i) =>
              i % 2 === 1
                ? <mark key={i} style={{ background: `${sev.color}25`, color: sev.color, borderRadius: 2, padding: "0 2px" }}>{part}</mark>
                : <span key={i}>{part}</span>
            )}
          </p>
        )}
      </div>
    </a>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function CVEPage() {
  const [items, setItems]           = useState<CveItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string>("");
  const [certFrCount, setCertFrCount] = useState(0);
  const [nvdCount, setNvdCount]     = useState(0);
  const [error, setError]           = useState("");

  // Filters
  const [search, setSearch]         = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter]     = useState<string>("");
  const [days, setDays]             = useState(30);

  // Keywords watchlist (persisted in localStorage)
  const [keywords, setKeywords]     = useState<string[]>([]);
  const [newKw, setNewKw]           = useState("");
  const [kwActive, setKwActive]     = useState(false);  // filter by keywords

  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Load keywords from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cve_keywords");
      setKeywords(saved ? JSON.parse(saved) : DEFAULT_KEYWORDS);
    } catch { setKeywords(DEFAULT_KEYWORDS); }
  }, []);

  const saveKeywords = (kws: string[]) => {
    setKeywords(kws);
    try { localStorage.setItem("cve_keywords", JSON.stringify(kws)); } catch {}
  };

  const fetchFeed = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError("");
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await refreshCveCache();
        setRefreshing(false);
      }
      const kws = kwActive ? keywords.join(",") : "";
      const data = await getCveFeed(days, kws);
      setItems(data.items);
      setCertFrCount(data.cert_fr_count);
      setNvdCount(data.nvd_count);
      setRefreshedAt(data.refreshed_at);
    } catch (e) {
      setError("Impossible de charger les CVEs. Vérifiez que le backend est accessible.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, keywords, kwActive]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Auto-refresh every 30 min
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => fetchFeed(), 30 * 60 * 1000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [fetchFeed]);

  // Filtered items
  const filtered = items.filter((i) => {
    const text = (i.title + " " + i.description).toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (severityFilter && i.severity !== severityFilter) return false;
    if (sourceFilter && i.source !== sourceFilter) return false;
    return true;
  });

  // Stats
  const criticalCount = items.filter(i => i.severity === "critical").length;
  const highCount     = items.filter(i => i.severity === "high").length;

  return (
    <main style={{ minHeight: "100vh", paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>
              Veille sécurité
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 800, letterSpacing: "-0.03em",
              color: "var(--text)", margin: "0 0 6px",
            }}>
              CVE<span style={{ color: "#ff3d00" }}>.</span>
            </h1>
            {refreshedAt && (
              <p style={{ color: "var(--muted)", fontSize: 11, margin: 0, fontFamily: "var(--font-mono)" }}>
                Mis à jour {timeAgo(refreshedAt)} · auto-refresh 30 min
              </p>
            )}
          </div>

          {/* Stats pills */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "CERT-FR", value: certFrCount,   color: "#6c63ff" },
              { label: "NVD",     value: nvdCount,       color: "#00e5ff" },
              { label: "🔴",      value: criticalCount,  color: "#ff3d00" },
              { label: "🟠",      value: highCount,      color: "#ff9800" },
            ].map(s => (
              <div key={s.label} style={{
                background: `${s.color}12`,
                border: `1px solid ${s.color}30`,
                borderRadius: 8, padding: "6px 14px",
                textAlign: "center",
              }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
            <button
              onClick={() => fetchFeed(true)}
              disabled={refreshing}
              style={{
                background: refreshing ? "rgba(108,99,255,0.1)" : "rgba(108,99,255,0.15)",
                border: "1px solid rgba(108,99,255,0.3)",
                color: "#6c63ff", borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "var(--font-mono)", fontSize: 11,
                cursor: refreshing ? "wait" : "pointer",
                letterSpacing: "0.06em", transition: "all 0.2s",
              }}
            >
              {refreshing ? "↻ …" : "↻ Actualiser"}
            </button>
          </div>
        </div>

        {/* ── Layout ── */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

          {/* ── Sidebar filtres ── */}
          <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 80 }}>

            {/* Recherche */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Recherche</div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="CVE ID, mot-clé…"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                  padding: "8px 12px", color: "var(--text)",
                  fontFamily: "var(--font-body)", fontSize: 13,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Période */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Période</div>
              {[7, 14, 30, 60, 90].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 12px", marginBottom: 3, borderRadius: 7,
                    background: days === d ? "rgba(108,99,255,0.1)" : "transparent",
                    border: `1px solid ${days === d ? "rgba(108,99,255,0.25)" : "transparent"}`,
                    color: days === d ? "var(--text)" : "var(--muted)",
                    fontFamily: "var(--font-body)", fontSize: 13,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {{7:"7 derniers jours",14:"14 derniers jours",30:"30 derniers jours",60:"60 derniers jours",90:"90 derniers jours"}[d]}
                </button>
              ))}
            </div>

            {/* Sévérité */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Sévérité</div>
              {[
                { key: "", label: "Toutes" },
                ...Object.entries(SEVERITY_CONFIG).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` }))
              ].map(s => (
                <button key={s.key} onClick={() => setSeverityFilter(s.key)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 12px", marginBottom: 3, borderRadius: 7,
                    background: severityFilter === s.key ? "rgba(108,99,255,0.1)" : "transparent",
                    border: `1px solid ${severityFilter === s.key ? "rgba(108,99,255,0.25)" : "transparent"}`,
                    color: severityFilter === s.key ? "var(--text)" : "var(--muted)",
                    fontFamily: "var(--font-body)", fontSize: 13,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Source */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Source</div>
              {[
                { key: "",          label: "Toutes" },
                { key: "cert-fr",   label: "CERT-FR 🇫🇷" },
                { key: "cisa-kev",  label: "CISA KEV 🇺🇸" },
              ].map(s => (
                <button key={s.key} onClick={() => setSourceFilter(s.key)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 12px", marginBottom: 3, borderRadius: 7,
                    background: sourceFilter === s.key ? "rgba(108,99,255,0.1)" : "transparent",
                    border: `1px solid ${sourceFilter === s.key ? "rgba(108,99,255,0.25)" : "transparent"}`,
                    color: sourceFilter === s.key ? "var(--text)" : "var(--muted)",
                    fontFamily: "var(--font-body)", fontSize: 13,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Keywords watchlist */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Mots-clés surveillés</div>
                <button
                  onClick={() => setKwActive(!kwActive)}
                  style={{
                    background: kwActive ? "rgba(108,99,255,0.2)" : "transparent",
                    border: `1px solid ${kwActive ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: kwActive ? "#6c63ff" : "var(--muted)",
                    borderRadius: 4, padding: "2px 6px",
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    cursor: "pointer", letterSpacing: "0.06em",
                  }}
                >
                  {kwActive ? "ON" : "OFF"}
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {keywords.map(kw => (
                  <span key={kw} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "rgba(108,99,255,0.1)",
                    border: "1px solid rgba(108,99,255,0.2)",
                    color: "#6c63ff", borderRadius: 4,
                    padding: "2px 7px", fontSize: 11,
                    fontFamily: "var(--font-mono)",
                  }}>
                    {kw}
                    <button
                      onClick={() => saveKeywords(keywords.filter(k => k !== kw))}
                      style={{ background: "none", border: "none", color: "#6c63ff", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  value={newKw}
                  onChange={e => setNewKw(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newKw.trim()) {
                      saveKeywords([...keywords, newKw.trim().toLowerCase()]);
                      setNewKw("");
                    }
                  }}
                  placeholder="+ mot-clé"
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
                    padding: "5px 8px", color: "var(--text)",
                    fontFamily: "var(--font-mono)", fontSize: 11, outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    if (newKw.trim()) {
                      saveKeywords([...keywords, newKw.trim().toLowerCase()]);
                      setNewKw("");
                    }
                  }}
                  style={{
                    background: "rgba(108,99,255,0.15)",
                    border: "1px solid rgba(108,99,255,0.3)",
                    color: "#6c63ff", borderRadius: 6,
                    padding: "5px 10px", cursor: "pointer",
                    fontFamily: "var(--font-mono)", fontSize: 12,
                  }}
                >+</button>
              </div>
            </div>
          </aside>

          {/* ── Main feed ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {error && (
              <div style={{
                background: "rgba(255,61,0,0.08)", border: "1px solid rgba(255,61,0,0.2)",
                borderRadius: 10, padding: "12px 18px", marginBottom: 16,
                color: "#ff6b6b", fontFamily: "var(--font-body)", fontSize: 13,
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Result count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", margin: 0 }}>
                {loading ? "Chargement…" : `${filtered.length} entrée${filtered.length !== 1 ? "s" : ""}`}
                {(search || severityFilter || sourceFilter) && " · filtré"}
              </p>
              {(search || severityFilter || sourceFilter) && (
                <button
                  onClick={() => { setSearch(""); setSeverityFilter(""); setSourceFilter(""); }}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11 }}
                >
                  Réinitialiser ×
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{
                    height: 90, background: "rgba(255,255,255,0.03)",
                    borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)",
                    opacity: 0.5 - i * 0.05,
                  }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                  Aucune entrée pour ces critères
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* CERT-FR section */}
                {filtered.some(i => i.source === "cert-fr") && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, marginTop: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6c63ff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        🇫🇷 CERT-FR — Avis & Alertes
                      </span>
                      <div style={{ flex: 1, height: 1, background: "rgba(108,99,255,0.15)" }} />
                    </div>
                    {filtered.filter(i => i.source === "cert-fr").map(item => (
                      <CveCard key={item.id} item={item} keywords={kwActive ? keywords : []} />
                    ))}
                  </>
                )}

                {/* CISA KEV section */}
                {filtered.some(i => i.source === "cisa-kev") && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#ff9800", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        🇺🇸 CISA KEV — Vulnérabilités activement exploitées
                      </span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,152,0,0.15)" }} />
                    </div>
                    {filtered.filter(i => i.source === "cisa-kev").map(item => (
                      <CveCard key={item.id} item={item} keywords={kwActive ? keywords : []} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
