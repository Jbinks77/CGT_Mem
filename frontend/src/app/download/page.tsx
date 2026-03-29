"use client";

import { useState, useEffect } from "react";

interface DownloadInfo {
  installer_url: string;
  backend_url: string;
  install_command: string;
  supported_shells: string[];
}

export default function DownloadPage() {
  const [info, setInfo] = useState<DownloadInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    fetch("/api/download/info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  const copyCommand = () => {
    if (!info) return;
    navigator.clipboard.writeText(info.install_command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const testConnection = async () => {
    setChecking(true);
    try {
      const r = await fetch("/api/health");
      setStatus(r.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60 }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        background: "linear-gradient(180deg, rgba(108,99,255,0.06), transparent)",
        paddingTop: 64,
        paddingBottom: 48,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative glow */}
        <div style={{
          position: "absolute", top: -40, right: "10%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", position: "relative" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
            Agent de capture
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14 }}>
            Téléchargement
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, fontWeight: 300, maxWidth: 520, lineHeight: 1.65 }}>
            Installe l&apos;agent sur n&apos;importe quel PC Windows. Toutes les commandes tapées dans PowerShell seront automatiquement capturées et ajoutées à ta documentation.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 100px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Main download card */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid rgba(108,99,255,0.25)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(108,99,255,0.06)",
        }}>
          {/* Top bar */}
          <div style={{
            padding: "24px 28px",
            borderBottom: "1px solid var(--border)",
            background: "linear-gradient(135deg, rgba(108,99,255,0.08), rgba(79,70,229,0.04))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44,
                background: "rgba(108,99,255,0.15)",
                border: "1px solid rgba(108,99,255,0.25)",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>⬇</div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>cmdmem-installer.ps1</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.05em" }}>PowerShell Script · ~3KB · Windows 10/11</div>
              </div>
            </div>

            <a
              href="/api/download/installer.ps1"
              download="cmdmem-installer.ps1"
              style={{
                background: "linear-gradient(135deg, var(--accent), #4f46e5)",
                color: "white",
                textDecoration: "none",
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.05em",
                padding: "12px 24px",
                borderRadius: 10,
                boxShadow: "0 4px 20px rgba(108,99,255,0.35)",
                transition: "all 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Télécharger
            </a>
          </div>

          {/* Install steps */}
          <div style={{ padding: "28px 28px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 20 }}>
              Installation en 2 étapes
            </div>

            {[
              {
                num: "01",
                title: "Télécharger le fichier",
                desc: "Clique sur le bouton ci-dessus pour télécharger l'installateur.",
                code: null,
              },
              {
                num: "02",
                title: "Exécuter dans PowerShell",
                desc: "Ouvre PowerShell et exécute le fichier. Une seule fois suffit — le hook sera permanent.",
                code: ".\\cmdmem-installer.ps1",
              },
            ].map((step) => (
              <div key={step.num} style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  background: "rgba(108,99,255,0.1)",
                  border: "1px solid rgba(108,99,255,0.2)",
                  borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent2)", fontWeight: 600,
                }}>
                  {step.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: step.code ? 10 : 0 }}>{step.desc}</div>
                  {step.code && (
                    <code style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "#c4b5fd",
                      background: "rgba(108,99,255,0.08)",
                      border: "1px solid rgba(108,99,255,0.15)",
                      padding: "10px 14px",
                      borderRadius: 8,
                    }}>
                      {step.code}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* One-liner alternative */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
            Alternative — Installation en une ligne
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
            Colle directement dans PowerShell pour installer sans télécharger de fichier :
          </p>
          <div style={{ position: "relative" }}>
            <code style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#a78bfa",
              background: "var(--surface2)",
              border: "1px solid var(--border2)",
              padding: "14px 100px 14px 16px",
              borderRadius: 10,
              wordBreak: "break-all",
              lineHeight: 1.6,
            }}>
              {info?.install_command || "irm \"http://localhost:8000/api/download/installer.ps1\" | iex"}
            </code>
            <button
              onClick={copyCommand}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: copied ? "rgba(16,185,129,0.15)" : "rgba(108,99,255,0.12)",
                border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(108,99,255,0.2)"}`,
                color: copied ? "var(--green)" : "var(--accent2)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                padding: "6px 14px",
                borderRadius: 7,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              {copied ? "COPIÉ ✓" : "COPIER"}
            </button>
          </div>
        </div>

        {/* What gets captured */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 20 }}>
            Ce qui est capturé
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { icon: "⌨", label: "La commande exacte", ok: true },
              { icon: "🖥", label: "Nom de la machine", ok: true },
              { icon: "👤", label: "Utilisateur Windows", ok: true },
              { icon: "📁", label: "Répertoire courant", ok: true },
              { icon: "✓", label: "Code de retour", ok: true },
              { icon: "⏱", label: "Durée d'exécution", ok: true },
              { icon: "🔑", label: "Mots de passe", ok: false },
              { icon: "🔐", label: "Tokens / Clés API", ok: false },
            ].map((item) => (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: item.ok ? "rgba(16,185,129,0.04)" : "rgba(244,63,94,0.04)",
                border: `1px solid ${item.ok ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)"}`,
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: item.ok ? "var(--text)" : "var(--muted)", flex: 1 }}>{item.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: item.ok ? "var(--green)" : "var(--red)" }}>
                  {item.ok ? "OUI" : "MASQUÉ"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection test */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Vérifier la connexion</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {status === "ok" && <span style={{ color: "var(--green)" }}>✓ Backend accessible — tout est prêt</span>}
              {status === "error" && <span style={{ color: "var(--red)" }}>✗ Backend inaccessible — lancez le serveur</span>}
              {status === "idle" && "Teste si le serveur cmdmem est joignable depuis ce PC"}
            </div>
          </div>
          <button
            onClick={testConnection}
            disabled={checking}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border2)",
              color: "var(--text)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "10px 20px",
              borderRadius: 9,
              cursor: checking ? "wait" : "pointer",
              transition: "all 0.2s",
              letterSpacing: "0.05em",
              opacity: checking ? 0.6 : 1,
            }}
          >
            {checking ? "TEST EN COURS…" : "TESTER"}
          </button>
        </div>

      </div>
    </div>
  );
}
