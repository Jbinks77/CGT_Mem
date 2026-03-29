"use client";

import { useState } from "react";
import { addScript } from "@/lib/api";

const SECTIONS = [
  { value: "linux", label: "Linux", color: "#10b981" },
  { value: "windows", label: "Windows", color: "#38bdf8" },
  { value: "automation", label: "Automatisation", color: "#f59e0b" },
];

export default function ScriptsPage() {
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [section, setSection] = useState("linux");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !script.trim()) { setError("Titre et script sont requis."); return; }
    setLoading(true);
    setError("");
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await addScript({ title: title.trim(), script: script.trim(), description: description.trim(), tags, section });
      setSuccess(true);
      setTitle(""); setScript(""); setDescription(""); setTagsInput("");
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError("Erreur lors de l'ajout. Vérifie que le backend tourne.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60 }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(108,99,255,0.04), transparent)", paddingTop: 64, paddingBottom: 40 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
            Ajout manuel
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Scripts
          </h1>
          <p style={{ marginTop: 10, color: "var(--muted)", fontSize: 14, fontWeight: 300 }}>
            Ajoute manuellement un script ou une commande complexe à ta documentation
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 100px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Section selector */}
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
                Section *
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {SECTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSection(s.value)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: `1px solid ${section === s.value ? s.color + "55" : "var(--border2)"}`,
                      background: section === s.value ? s.color + "15" : "var(--surface)",
                      color: section === s.value ? s.color : "var(--muted)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: section === s.value ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Titre *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Backup base de données PostgreSQL"
                className="input-base"
                style={{ padding: "14px 16px", fontSize: 14 }}
              />
            </div>

            {/* Script */}
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Script / Commande *
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 36,
                  background: "var(--surface2)",
                  borderRadius: "10px 10px 0 0",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  gap: 6,
                  pointerEvents: "none",
                  zIndex: 1,
                }}>
                  {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                    <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
                  ))}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginLeft: 6 }}>script</span>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder={"#!/bin/bash\n# Colle ton script ici…"}
                  className="input-base"
                  style={{
                    paddingTop: 48,
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingBottom: 16,
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1.7,
                    minHeight: 200,
                    borderRadius: 10,
                    background: "var(--surface2)",
                    color: "#c4b5fd",
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décris ce que fait ce script, dans quel contexte l'utiliser…"
                className="input-base"
                style={{ padding: "14px 16px", fontSize: 14, minHeight: 90, lineHeight: 1.6 }}
              />
            </div>

            {/* Tags */}
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Tags{" "}
                <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 10, color: "var(--muted2)" }}>(séparés par des virgules)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="backup, postgres, cron, automatisation"
                className="input-base"
                style={{ padding: "14px 16px", fontSize: 14 }}
              />
              {/* Tag preview */}
              {tagsInput && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {tagsInput.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, padding: "12px 16px", color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                ⚠ {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 16px", color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>✓</span>
                Script ajouté avec succès et disponible dans la documentation !
              </div>
            )}

            {/* Submit */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Ajout en cours…" : "Ajouter à la documentation →"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
