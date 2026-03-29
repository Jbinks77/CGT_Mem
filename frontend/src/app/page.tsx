"use client";

import { useState, useRef, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import CommandCard from "@/components/CommandCard";
import { search, getStats, type SearchResult, type Stats } from "@/lib/api";

const VIDEO_URL = "/bg.mp4";

export default function Home() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setLastQuery(query);
    try {
      const data = await search(query);
      setResults(data.results);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ── HERO with video ── */}
      <section style={{ position: "relative", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>

        {/* Video background */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            opacity: 0.35,
          }}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>

        {/* Gradient overlays */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(5,5,8,0.5) 0%, rgba(5,5,8,0.2) 40%, rgba(5,5,8,0.7) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(108,99,255,0.06) 0%, transparent 70%)" }} />

        {/* Vignette */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, boxShadow: "inset 0 0 200px rgba(5,5,8,0.8)" }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 24px", gap: 0 }}>

          {/* Eyebrow */}
          <div className="opacity-0-init animate-fade-up" style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "var(--accent2)",
            textTransform: "uppercase",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ width: 24, height: 1, background: "var(--accent2)", display: "inline-block", opacity: 0.5 }} />
            Mémoire de commandes intelligente
            <span style={{ width: 24, height: 1, background: "var(--accent2)", display: "inline-block", opacity: 0.5 }} />
          </div>

          {/* Title */}
          <h1 className="opacity-0-init animate-fade-up delay-100" style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(42px, 8vw, 84px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            textAlign: "center",
            marginBottom: 8,
          }}>
            <span className="gradient-text">cmd</span>
            <span style={{ color: "var(--text)" }}>mem</span>
          </h1>

          {/* Subtitle */}
          <p className="opacity-0-init animate-fade-up delay-200" style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(14px, 2vw, 17px)",
            color: "var(--muted)",
            fontWeight: 300,
            marginBottom: 48,
            letterSpacing: "0.01em",
          }}>
            Retrouvez n&apos;importe quelle commande par intention, en langage naturel
          </p>

          {/* Search */}
          <div className="opacity-0-init animate-fade-up delay-300" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <SearchBar onSearch={handleSearch} loading={loading} autoFocus size="hero" />
          </div>

          {/* Stats */}
          {stats && (
            <div className="opacity-0-init animate-fade-up delay-500" style={{ display: "flex", gap: 32, marginTop: 48, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { label: "commandes", value: stats.total_commands },
                { label: "documentées", value: stats.total_docs },
                { label: "machines", value: stats.total_hosts },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>
                    {s.value}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        {!searched && (
          <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.4 }}>
            <svg width="14" height="24" viewBox="0 0 14 24" fill="none">
              <rect x="1" y="1" width="12" height="22" rx="6" stroke="currentColor" strokeWidth="1.5" />
              <rect x="6" y="6" width="2" height="5" rx="1" fill="currentColor" style={{ animation: "float 2s ease-in-out infinite" }} />
            </svg>
          </div>
        )}
      </section>

      {/* ── RESULTS ── */}
      {searched && (
        <section style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 100px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                Résultats
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
                &ldquo;{lastQuery}&rdquo;
              </h2>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 12px", borderRadius: 6 }}>
              {results.length} résultat{results.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="divider" style={{ marginBottom: 32 }} />

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 100, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, marginBottom: 12, opacity: 0.3 }}>∅</div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.05em" }}>Aucun résultat trouvé</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {results.map((r, i) => (
                <div
                  key={r.id}
                  className="opacity-0-init animate-fade-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <CommandCard
                    id={r.id}
                    command={r.command_normalized}
                    description={r.description}
                    section={r.section}
                    category={r.category}
                    tags={r.tags}
                    score={r.score}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
