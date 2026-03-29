"use client";

import Link from "next/link";

interface CommandCardProps {
  id: number;
  command: string;
  description: string | null;
  section: string;
  category: string | null;
  tags: string[];
  score?: number;
  usageCount?: number;
}

const sectionLabel: Record<string, string> = {
  linux: "Linux",
  windows: "Windows",
  automation: "Auto",
};

export default function CommandCard({ id, command, description, section, category, tags, score, usageCount }: CommandCardProps) {
  return (
    <Link href={`/documentation/${id}`} style={{ textDecoration: "none", display: "block" }}>
      <div className="card-glow" style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 20px",
        cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          {/* Command */}
          <div className="cmd-chip">{command.length > 60 ? command.slice(0, 60) + "…" : command}</div>
          {/* Section + score */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {score !== undefined && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.05em" }}>
                {(score * 100).toFixed(0)}%
              </span>
            )}
            <span className={`section-pill ${section}`}>{sectionLabel[section] || section}</span>
          </div>
        </div>

        {/* Score bar */}
        {score !== undefined && (
          <div style={{ height: 1.5, background: "var(--border)", borderRadius: 1, marginBottom: 10, overflow: "hidden" }}>
            <div className="score-bar" style={{ width: `${Math.min(score * 100, 100)}%` }} />
          </div>
        )}

        {/* Description */}
        {description && (
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 10 }}>
            {description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {category && (
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--muted2)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              padding: "2px 7px",
              borderRadius: 3,
              letterSpacing: "0.05em",
            }}>{category}</span>
          )}
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {usageCount !== undefined && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted2)", marginLeft: "auto" }}>
              ×{usageCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
