"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getDocEntry, updateDocEntry, type DocEntry } from "@/lib/api";

const sectionColor: Record<string, string> = {
  linux: "#10b981",
  windows: "#38bdf8",
  automation: "#f59e0b",
};

const SECTIONS = ["linux", "windows", "automation"];

/* ── small input primitives ────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "var(--font-display)",
  fontSize: 14,
  resize: "vertical",
  minHeight: 90,
  lineHeight: 1.6,
};

/* ── main page ─────────────────────────────────────────────────────────── */

export default function DocDetailPage() {
  const params = useParams();
  const [entry, setEntry] = useState<DocEntry | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // form state
  const [fDesc, setFDesc] = useState("");
  const [fSection, setFSection] = useState("linux");
  const [fCategory, setFCategory] = useState("");
  const [fTags, setFTags] = useState("");
  const [fSynonyms, setFSynonyms] = useState("");
  const [fSensitive, setFSensitive] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;
    getDocEntry(id).then(setEntry).catch(() => setError(true));
  }, [params.id]);

  const openEdit = () => {
    if (!entry) return;
    setFDesc(entry.description || "");
    setFSection(entry.section);
    setFCategory(entry.category || "");
    setFTags(entry.tags.join(", "));
    setFSynonyms(entry.synonyms.join(", "));
    setFSensitive(entry.is_sensitive);
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const save = async () => {
    if (!entry) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateDocEntry(entry.id, {
        description: fDesc || undefined,
        section: fSection,
        category: fCategory || undefined,
        tags: fTags.split(",").map((t) => t.trim()).filter(Boolean),
        synonyms: fSynonyms.split(",").map((s) => s.trim()).filter(Boolean),
        is_sensitive: fSensitive,
      });
      setEntry(updated);
      setEditing(false);
    } catch {
      setSaveError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

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
      {/* Top bar */}
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
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className={`section-pill ${entry.section}`} style={{ fontSize: 11, padding: "5px 12px" }}>
                  {entry.section.toUpperCase()}
                </span>
                {!editing && (
                  <button
                    onClick={openEdit}
                    style={{
                      background: "rgba(108,99,255,0.1)",
                      border: "1px solid rgba(108,99,255,0.25)",
                      color: "var(--accent2)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      padding: "5px 14px",
                      borderRadius: 7,
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                      fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,99,255,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(108,99,255,0.1)"; }}
                  >
                    ÉDITER
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── VIEW MODE ──────────────────────────────────────────────────── */}
          {!editing && (
            <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
              {entry.description && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Description</div>
                  <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.65, fontWeight: 300 }}>{entry.description}</p>
                </div>
              )}

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

              {entry.tags.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {entry.tags.map((tag) => <span key={tag} className="tag" style={{ fontSize: 12 }}>{tag}</span>)}
                  </div>
                </div>
              )}

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

              {entry.is_sensitive && (
                <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: "var(--red)", fontSize: 16 }}>⚠</span>
                  <p style={{ fontSize: 13, color: "var(--red)", fontFamily: "var(--font-mono)" }}>Cette commande a été marquée comme sensible</p>
                </div>
              )}
            </div>
          )}

          {/* ── EDIT MODE ──────────────────────────────────────────────────── */}
          {editing && (
            <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
              <Field label="Description">
                <textarea
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  placeholder="Décris ce que fait cette commande…"
                  style={textareaStyle}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Section">
                  <select
                    value={fSection}
                    onChange={(e) => setFSection(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Catégorie">
                  <input
                    type="text"
                    value={fCategory}
                    onChange={(e) => setFCategory(e.target.value)}
                    placeholder="ex: réseau, fichiers…"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Tags (séparés par des virgules)">
                <input
                  type="text"
                  value={fTags}
                  onChange={(e) => setFTags(e.target.value)}
                  placeholder="ex: ssh, réseau, connexion"
                  style={inputStyle}
                />
              </Field>

              <Field label="Recherches associées (séparées par des virgules)">
                <input
                  type="text"
                  value={fSynonyms}
                  onChange={(e) => setFSynonyms(e.target.value)}
                  placeholder="ex: changer dossier, naviguer"
                  style={inputStyle}
                />
              </Field>

              {/* Sensitive toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  onClick={() => setFSensitive(!fSensitive)}
                  style={{
                    width: 44, height: 24,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: fSensitive ? "rgba(244,63,94,0.7)" : "var(--border2)",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: "absolute",
                    top: 3, left: fSensitive ? 23 : 3,
                    width: 18, height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                  }} />
                </button>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: fSensitive ? "var(--red)" : "var(--text)", fontWeight: 600 }}>
                    {fSensitive ? "Commande sensible" : "Commande non sensible"}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                    Les commandes sensibles sont masquées dans les exports
                  </div>
                </div>
              </div>

              {saveError && (
                <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>
                  {saveError}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    background: saving ? "rgba(108,99,255,0.3)" : "linear-gradient(135deg, var(--accent), #4f46e5)",
                    color: "white",
                    border: "none",
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "12px 28px",
                    borderRadius: 9,
                    cursor: saving ? "wait" : "pointer",
                    transition: "all 0.2s",
                    letterSpacing: "0.02em",
                  }}
                >
                  {saving ? "Sauvegarde…" : "Sauvegarder"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  style={{
                    background: "var(--surface2)",
                    color: "var(--muted)",
                    border: "1px solid var(--border2)",
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "12px 24px",
                    borderRadius: 9,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

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
