"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listWikiDocs, deleteWikiDoc, WikiDoc } from "@/lib/api";

const COVER_COLORS = [
  "#6c63ff", "#00e5ff", "#ff3d00", "#00ff94",
  "#ffd600", "#ff00ff", "#4caf50", "#ff6b6b",
];

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function WikiPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<WikiDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listWikiDocs()
      .then(setDocs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.section.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce document ?")) return;
    setDeleting(id);
    await deleteWikiDoc(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setDeleting(null);
  };

  // Group by section
  const sections = Array.from(new Set(filtered.map((d) => d.section || "Sans section")));

  return (
    <main style={{ minHeight: "100vh", paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 800, letterSpacing: "-0.03em",
              color: "var(--text)", margin: 0,
            }}>
              Wiki<span style={{ color: "var(--accent2)" }}>.</span>
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
              {docs.length} document{docs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/wiki/new")}
            style={{
              background: "var(--accent2)",
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              letterSpacing: "0.02em",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Nouveau document
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans le wiki…"
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "12px 18px",
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            marginBottom: 32,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {loading ? (
          <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Chargement…</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 15 }}>
              {search ? "Aucun document ne correspond" : "Aucun document pour l'instant"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/wiki/new")}
                style={{
                  marginTop: 16,
                  background: "rgba(108,99,255,0.15)",
                  border: "1px solid rgba(108,99,255,0.3)",
                  color: "#6c63ff",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Créer le premier document →
              </button>
            )}
          </div>
        ) : (
          sections.map((section) => (
            <div key={section} style={{ marginBottom: 40 }}>
              <h2 style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "var(--muted)",
                textTransform: "uppercase",
                marginBottom: 14,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                paddingBottom: 8,
              }}>
                {section}
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}>
                {filtered.filter((d) => (d.section || "Sans section") === section).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => router.push(`/wiki/${doc.id}`)}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${doc.cover_color}44`;
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${doc.cover_color}15`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLElement).style.transform = "none";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Color band */}
                    <div style={{
                      height: 4,
                      background: doc.cover_color,
                      opacity: 0.8,
                    }} />

                    <div style={{ padding: "16px 18px 14px" }}>
                      <h3 style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        fontSize: 15,
                        color: "var(--text)",
                        margin: "0 0 8px",
                        lineHeight: 1.3,
                        paddingRight: 28,
                      }}>
                        {doc.title}
                      </h3>

                      {doc.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                          {doc.tags.slice(0, 4).map((t) => (
                            <span key={t} style={{
                              background: `${doc.cover_color}18`,
                              border: `1px solid ${doc.cover_color}30`,
                              color: doc.cover_color,
                              borderRadius: 4,
                              padding: "1px 7px",
                              fontSize: 11,
                              fontFamily: "var(--font-mono)",
                            }}>{t}</span>
                          ))}
                        </div>
                      )}

                      <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--muted)",
                        margin: 0,
                      }}>
                        Modifié {timeAgo(doc.updated_at)}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      disabled={deleting === doc.id}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        background: "rgba(244,63,94,0.0)",
                        border: "none",
                        color: "rgba(255,255,255,0.2)",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "2px 4px",
                        borderRadius: 4,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "#f43f5e";
                        (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
