"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const privateLinks = [
  { href: "/search", label: "Recherche" },
  { href: "/documentation", label: "Documentation" },
  { href: "/scripts", label: "Scripts" },
  { href: "/download", label: "Téléchargement" },
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(getCookie("cmdmem_authed") === "1");
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50">
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: 19,
            fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)",
          }}>
            JB<span style={{ color: "var(--accent2)" }}>.</span>
          </span>
        </Link>

        {/* Private nav links */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {authed && privateLinks.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--text)" : "var(--muted)",
                  padding: "6px 14px", borderRadius: 8,
                  background: active ? "rgba(108,99,255,0.1)" : "transparent",
                  border: `1px solid ${active ? "rgba(108,99,255,0.2)" : "transparent"}`,
                  transition: "all 0.2s", display: "block", letterSpacing: "0.01em",
                }}>
                  {l.label}
                </span>
              </Link>
            );
          })}
          {authed && (
            <button
              onClick={logout}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "var(--muted)", padding: "6px 12px",
                borderRadius: 8, background: "transparent",
                border: "1px solid transparent", cursor: "pointer",
                letterSpacing: "0.06em", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--red)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,63,94,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              }}
            >
              DÉCO
            </button>
          )}
        </div>

        {/* Right status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: authed ? "var(--accent2)" : "var(--green)",
            boxShadow: `0 0 8px ${authed ? "var(--accent2)" : "var(--green)"}`,
          }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>
            {authed ? "PRIVÉ" : "LIVE"}
          </span>
        </div>
      </div>
    </nav>
  );
}
