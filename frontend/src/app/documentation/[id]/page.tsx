"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getDocEntry, type DocEntry } from "@/lib/api";

const sectionColor: Record<string, string> = {
  linux: "#10b981",
  windows: "#38bdf8",
  automation: "#f59e0b",
};

export default function DocDetailPage() {
  const params = useParams();
  const [entry, setEntry] = useState<DocEntry | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;
    getDocEntry(id).then(setEntry).catch(() => setError(true));
  }, [params.id]);

  if (error) return (
    <div style={{ minHeight: "100vh", paddingTop: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 48, opacity: 0.2 }}>404</div>
      <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Entrée introuvable</p>
      <Link href="/documentation" style={{ color: "var(--accent2)", fontFamily: "var(--font-mono)", fontSize: 12, textDecoration: "none" }}>← Retour</Link>
    </div>
  );

  if (!entry) return (
    <div style={{ minHeight: "100vh", paddingTop: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em" }}>CHARGEMENT…</div>
    </div>
  );

  const color = sectionColor[entry.section] || "var(--accent2)";

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60 }}>
      {/* Top bar with section color */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 100px" }}>
        {/* Back */}
        <Link href="/documentation" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 40, transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
        >
          ← DOCUMENTATION
        </Link>

        {/* Main card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "32px 32px 24px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <code style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(15px, 2.5vw, 20px)",
                color: "var(--accent2)",
                background: "rgba(108,99,255,0.08)",
                border: "1px solid rgba(108,99,255,0.15)",
                padding: "10px 18px",
                borderRadius: 10,
                wordBreak: "break-all",
              }}>
                {entry.command_normalized}
              </code>
              <span className={`section-pill ${entry.section}`} style={{ fontSize: 11, padding: "5px 12px" }}>
                {entry.section.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Description */}
            {entry.description && (
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Description</div>
                <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.65, fontWeight: 300 }}>{entry.description}</p>
              </div>
            )}

            {/* Grid metadata */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              {[
                { label: "Catégorie", value: entry.category || "—" },
                { label: "Section", value: entry.section },
                { label: "Utilisations", value: String(entry.usage_count) },
                { label: "Sensible", value: entry.is_sensitive ? "Oui" : "Non" },
              ].map((m) => (
                <div key={m.label} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>Tags</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {entry.tags.map((tag) => <span key={tag} className="tag" style={{ fontSize: 12 }}>{tag}</span>)}
                </div>
              </div>
            )}

            {/* Synonyms */}
            {entry.synonyms.length > 0 && (
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>Recherches associées</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {entry.synonyms.map((s) => (
                    <span key={s} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", background: "var(--surface2)", border: "1px solid var(--border)", padding: "4px 12px", borderRadius: 20 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sensitive warning */}
            {entry.is_sensitive && (
              <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "var(--red)", fontSize: 16 }}>⚠</span>
                <p style={{ fontSize: 13, color: "var(--red)", fontFamily: "var(--font-mono)" }}>Cette commande a été marquée comme sensible</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border)", display: "flex", gap: 24 }}>
            {[
              { label: "Ajoutée le", value: new Date(entry.created_at).toLocaleDateString("fr-FR") },
              { label: "Mise à jour le", value: new Date(entry.updated_at).toLocaleDateString("fr-FR") },
            ].map((d) => (
              <div key={d.label} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
                <span style={{ color: "var(--muted2)" }}>{d.label} </span>{d.value}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
