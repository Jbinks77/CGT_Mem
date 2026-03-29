"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Recherche" },
  { href: "/documentation", label: "Documentation" },
  { href: "/scripts", label: "Scripts" },
  { href: "/download", label: "Téléchargement" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>
            cmd<span style={{ color: "var(--accent2)" }}>mem</span>
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: "flex", gap: 4 }}>
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
                <span style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--text)" : "var(--muted)",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: active ? "rgba(108,99,255,0.1)" : "transparent",
                  border: `1px solid ${active ? "rgba(108,99,255,0.2)" : "transparent"}`,
                  transition: "all 0.2s",
                  display: "block",
                  letterSpacing: "0.01em",
                }}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Status dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em" }}>LIVE</span>
        </div>
      </div>
    </nav>
  );
}
