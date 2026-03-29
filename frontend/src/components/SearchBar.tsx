"use client";

import { useState, useCallback, useRef } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  autoFocus?: boolean;
  size?: "hero" | "normal";
}

export default function SearchBar({ onSearch, loading = false, autoFocus = false, size = "normal" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }, [query, onSearch]);

  const isHero = size === "hero";

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: isHero ? 680 : 600 }}>
      <div style={{ position: "relative" }}>
        {/* Search icon */}
        <svg
          style={{ position: "absolute", left: isHero ? 22 : 16, top: "50%", transform: "translateY(-50%)", color: loading ? "var(--accent2)" : "var(--muted)", transition: "color 0.3s", zIndex: 2 }}
          width={isHero ? 20 : 18} height={isHero ? 20 : 18} fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isHero ? "Rechercher une commande ou une intention…" : "Rechercher…"}
          autoFocus={autoFocus}
          className="search-input input-base"
          style={{
            paddingLeft: isHero ? 56 : 46,
            paddingRight: query ? (isHero ? 100 : 80) : (isHero ? 24 : 16),
            paddingTop: isHero ? 20 : 14,
            paddingBottom: isHero ? 20 : 14,
            fontSize: isHero ? 17 : 14,
            fontFamily: "var(--font-body)",
            borderRadius: isHero ? 16 : 10,
            background: isHero ? "rgba(14,14,20,0.85)" : "var(--surface)",
            backdropFilter: isHero ? "blur(20px)" : "none",
            border: isHero ? "1px solid rgba(108,99,255,0.25)" : "1px solid var(--border2)",
          }}
        />

        {/* Submit / Loading */}
        {query && (
          <button
            type="submit"
            disabled={loading}
            style={{
              position: "absolute",
              right: isHero ? 10 : 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: loading ? "rgba(108,99,255,0.2)" : "linear-gradient(135deg, var(--accent), #4f46e5)",
              border: "none",
              borderRadius: 10,
              padding: isHero ? "8px 18px" : "6px 14px",
              color: "white",
              fontFamily: "var(--font-mono)",
              fontSize: isHero ? 12 : 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 12px rgba(108,99,255,0.3)",
            }}
          >
            {loading ? "…" : "ENTER"}
          </button>
        )}
      </div>

      {/* Hint */}
      {isHero && !query && (
        <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {["espace disque", "logs nginx", "ports ouverts", "processus windows"].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => { setQuery(hint); onSearch(hint); }}
              style={{
                background: "rgba(108,99,255,0.06)",
                border: "1px solid rgba(108,99,255,0.15)",
                borderRadius: 20,
                padding: "4px 14px",
                color: "var(--muted)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.03em",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = "var(--accent2)";
                (e.target as HTMLElement).style.borderColor = "rgba(108,99,255,0.35)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = "var(--muted)";
                (e.target as HTMLElement).style.borderColor = "rgba(108,99,255,0.15)";
              }}
            >
              {hint}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
