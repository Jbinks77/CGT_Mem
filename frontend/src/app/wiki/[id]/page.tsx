"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getWikiDoc, updateWikiDoc, WikiDoc } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.chagnat.fr";

const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });

const COVER_COLORS = [
  "#6c63ff", "#00e5ff", "#ff3d00", "#00ff94",
  "#ffd600", "#ff00ff", "#4caf50", "#ff6b6b",
  "#ff9800", "#e91e63", "#2196f3", "#9c27b0",
];

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function WikiDocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<WikiDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [section, setSection] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [coverColor, setCoverColor] = useState("#6c63ff");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiStatus, setAiStatus] = useState<"none"|"processing"|"done"|"error">("none");
  const aiPollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    getWikiDoc(Number(id))
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
        setContent(d.content);
        setSection(d.section);
        setTagsInput(d.tags.join(", "));
        setCoverColor(d.cover_color);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const startEdit = () => setEditing(true);

  const cancelEdit = () => {
    if (!doc) return;
    setTitle(doc.title);
    setContent(doc.content);
    setSection(doc.section);
    setTagsInput(doc.tags.join(", "));
    setCoverColor(doc.cover_color);
    setEditing(false);
  };

  const startAiPolling = (docId: number) => {
    setAiStatus("processing");
    if (aiPollRef.current) clearInterval(aiPollRef.current);
    aiPollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/wiki/${docId}/ai-status`);
        const data = await r.json();
        if (data.status === "done" || data.status === "error") {
          setAiStatus(data.status);
          if (aiPollRef.current) clearInterval(aiPollRef.current);
          // Recharge le contenu mis à jour par l'IA
          if (data.status === "done") {
            const refreshed = await getWikiDoc(docId);
            setDoc(refreshed);
            setContent(refreshed.content);
          }
        }
      } catch { /* silencieux */ }
    }, 2500);
  };

  const save = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const updated = await updateWikiDoc(doc.id, {
        title: title.trim(),
        content,
        section,
        tags,
        cover_color: coverColor,
      });
      setDoc(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Lancer le polling IA si le contenu contient du code
      if (content.includes('"codeBlock"')) startAiPolling(doc.id);
    } catch {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", paddingTop: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Chargement…</p>
      </main>
    );
  }

  if (!doc) {
    return (
      <main style={{ minHeight: "100vh", paddingTop: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>Document introuvable</p>
          <button onClick={() => router.push("/wiki")} style={{ marginTop: 12, color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            ← Retour au wiki
          </button>
        </div>
      </main>
    );
  }

  const activeColor = editing ? coverColor : doc.cover_color;

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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {aiStatus === "processing" && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#f59e0b", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ animation: "pulse 1.2s infinite" }}>⚡</span> IA en cours…
              </span>
            )}
            {aiStatus === "done" && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green)" }}>
                ✦ Commenté par IA
              </span>
            )}
            {aiStatus === "error" && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#f43f5e" }}>
                ⚠ Erreur IA
              </span>
            )}
            {saved && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)" }}>
                ✓ Enregistré
              </span>
            )}
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--muted)",
                    borderRadius: 8,
                    padding: "7px 16px",
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    background: saving ? "rgba(108,99,255,0.3)" : "var(--accent)",
                    color: saving ? "rgba(255,255,255,0.4)" : "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 20px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: saving ? "default" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {saving ? "Enregistrement…" : "Sauvegarder"}
                </button>
              </>
            ) : (
              <button
                onClick={startEdit}
                style={{
                  background: "rgba(108,99,255,0.12)",
                  border: "1px solid rgba(108,99,255,0.25)",
                  color: "#6c63ff",
                  borderRadius: 8,
                  padding: "7px 18px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.12)")}
              >
                ✏ Modifier
              </button>
            )}
          </div>
        </div>

        {/* Doc card */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 24,
        }}>
          <div style={{ height: 6, background: activeColor, opacity: 0.85 }} />
          <div style={{ padding: "24px 28px 20px" }}>

            {editing ? (
              <>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Section</label>
                    <input
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="Linux, Sécurité…"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 2, minWidth: 200 }}>
                    <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tags</label>
                    <input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="openssl, tls, certificat…"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Couleur</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCoverColor(c)}
                        style={{
                          width: 20, height: 20, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
                          border: coverColor === c ? "3px solid #fff" : "2px solid transparent",
                          boxShadow: coverColor === c ? `0 0 0 1px ${c}` : "none",
                          transition: "all 0.15s",
                        }}
                      />
                    ))}
                    <input type="color" value={coverColor} onChange={(e) => setCoverColor(e.target.value)}
                      style={{ width: 20, height: 20, padding: 0, border: "none", borderRadius: "50%", cursor: "pointer", background: "none" }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "var(--text)",
                  margin: "0 0 12px",
                }}>
                  {doc.title}
                </h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {doc.section && (
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 11,
                      color: doc.cover_color,
                      background: `${doc.cover_color}15`,
                      border: `1px solid ${doc.cover_color}30`,
                      borderRadius: 4, padding: "2px 8px",
                      letterSpacing: "0.06em",
                    }}>
                      {doc.section}
                    </span>
                  )}
                  {doc.tags.map((t) => (
                    <span key={t} style={{
                      fontFamily: "var(--font-mono)", fontSize: 10,
                      color: "var(--muted)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 4, padding: "2px 8px",
                    }}>
                      {t}
                    </span>
                  ))}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
                    Modifié le {timeAgo(doc.updated_at)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Editor / Reader */}
        <RichEditor
          content={editing ? content : doc.content}
          onChange={setContent}
          readOnly={!editing}
        />
      </div>
    </main>
  );
}
