"use client";

import { useState, useEffect } from "react";
import CommandCard from "@/components/CommandCard";
import { getDocumentation, getStats, type DocEntry, type Stats } from "@/lib/api";

const SECTIONS = [
  { key: null, label: "Tout", icon: "#", color: "var(--accent2)" },
  { key: "linux", label: "Linux", icon: "$", color: "#10b981" },
  { key: "windows", label: "Windows", icon: ">", color: "#38bdf8" },
  { key: "automation", label: "Automatisation", icon: "@", color: "#f59e0b" },
] as const;

export default function DocumentationPage() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getDocumentation(activeSection || undefined)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [activeSection]);

  const grouped = SECTIONS.slice(1).map((s) => ({
    ...s,
    entries: entries.filter((e) => e.section === s.key),
  }));

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60 }}>
      {/* Header band */}
      <div style={{ borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(108,99,255,0.04), transparent)", paddingTop: 64, paddingBottom: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
            Base de connaissances
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Documentation
            </h1>
            {stats && (
              <div style={{ display: "flex", gap: 24 }}>
                {Object.entries(stats.by_section || {}).map(([sec, count]) => (
                  <div key={sec} style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: sec === "linux" ? "#10b981" : sec === "windows" ? "#38bdf8" : "#f59e0b" }}>
                      {count as number}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {sec}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 100px", display: "flex", gap: 32 }}>
        {/* Sidebar */}
        <aside style={{ width: 200, flexShrink: 0 }}>
          <div style={{ position: "sticky", top: 80 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
              Sections
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SECTIONS.map((s) => {
                const active = activeSection === s.key;
                return (
                  <button
                    key={String(s.key)}
                    onClick={() => setActiveSection(s.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${active ? "rgba(108,99,255,0.25)" : "transparent"}`,
                      background: active ? "rgba(108,99,255,0.08)" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: s.color, width: 16 }}>{s.icon}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: active ? "var(--text)" : "var(--muted)", fontWeight: active ? 500 : 400 }}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 90, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", opacity: 0.4 }} />
              ))}
            </div>
          ) : activeSection !== null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entries.length === 0 ? (
                <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Aucune commande dans cette section</p>
              ) : entries.map((e) => (
                <CommandCard key={e.id} id={e.id} command={e.command_normalized} description={e.description} section={e.section} category={e.category} tags={e.tags} usageCount={e.usage_count} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
              {grouped.map((sec) => (
                <div key={sec.key}>
                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: sec.color }}>{sec.icon}</span>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
                      {sec.label}
                    </h2>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 4 }}>
                      {sec.entries.length}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 8 }} />
                  </div>

                  {sec.entries.length === 0 ? (
                    <p style={{ color: "var(--muted2)", fontSize: 13, paddingLeft: 8 }}>Aucune commande</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {sec.entries.map((e) => (
                        <CommandCard key={e.id} id={e.id} command={e.command_normalized} description={e.description} section={e.section} category={e.category} tags={e.tags} usageCount={e.usage_count} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
