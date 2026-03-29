"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createWikiDoc } from "@/lib/api";

const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });

const COVER_COLORS = [
  "#6c63ff", "#00e5ff", "#ff3d00", "#00ff94",
  "#ffd600", "#ff00ff", "#4caf50", "#ff6b6b",
  "#ff9800", "#e91e63", "#2196f3", "#9c27b0",
];

export default function NewWikiPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [section, setSection] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [coverColor, setCoverColor] = useState("#6c63ff");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const save = async () => {
    if (!title.trim()) { titleRef.current?.focus(); return; }
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const doc = await createWikiDoc({ title: title.trim(), content, section, tags, cover_color: coverColor });
      router.push(`/wiki/${doc.id}`);
    } catch {
      setSaving(false);
      alert("Erreur lors de la création du document");
    }
  };

  return (
    <main style={{ minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <button
            onClick={() => router.push("/wiki")}
            style={{
              background: "none", border: "none",
              color: "var(--muted)", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: 12,
              letterSpacing: "0.06em",
            }}
          >
            ← Wiki
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            style={{
              background: saving || !title.trim() ? "rgba(108,99,255,0.3)" : "var(--accent)",
              color: saving || !title.trim() ? "rgba(255,255,255,0.4)" : "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 22px",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 13,
              cursor: saving || !title.trim() ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {saving ? "Enregistrement…" : "Créer le document"}
          </button>
        </div>

        {/* Color band + title */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 20,
        }}>
          <div style={{ height: 6, background: coverColor, opacity: 0.85 }} />
          <div style={{ padding: "24px 28px 20px" }}>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Titre du document…"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text)",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 20,
                boxSizing: "border-box",
              }}
            />

            {/* Metadata row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Section</label>
                <input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Linux, Sécurité, Réseau…"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    color: "var(--text)",
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 2, minWidth: 200 }}>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tags (séparés par des virgules)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="openssl, certificat, tls…"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    color: "var(--text)",
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Color picker */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Couleur
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COVER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCoverColor(c)}
                    style={{
                      width: 22, height: 22,
                      borderRadius: "50%",
                      background: c,
                      border: coverColor === c ? `3px solid #fff` : "2px solid transparent",
                      cursor: "pointer",
                      padding: 0,
                      transition: "all 0.15s",
                      boxShadow: coverColor === c ? `0 0 0 1px ${c}` : "none",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={coverColor}
                  onChange={(e) => setCoverColor(e.target.value)}
                  style={{ width: 22, height: 22, padding: 0, border: "none", borderRadius: "50%", cursor: "pointer", background: "none" }}
                  title="Couleur personnalisée"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <RichEditor
          content={content}
          onChange={setContent}
          readOnly={false}
        />
      </div>
    </main>
  );
}
