"use client";

import { useState, useEffect } from "react";

interface DownloadInfo {
  installer_exe_url: string | null;
  installer_ps1_url: string;
  exe_available: boolean;
  ssh_client_available: boolean;
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

  const isExe = info?.exe_available ?? false;
  const downloadUrl = isExe ? "/api/download/installer.exe" : "/api/download/installer.ps1";
  const fileName = isExe ? "cmdmem-installer.exe" : "cmdmem-installer.ps1";

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
            Installe l&apos;agent sur n&apos;importe quel PC Windows. Toutes les commandes tapées dans PowerShell seront automatiquement capturées.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 100px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Main download card */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid rgba(108,99,255,0.3)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(108,99,255,0.08)",
        }}>
          {/* Hero download zone */}
          <div style={{
            padding: "48px 40px",
            background: "linear-gradient(135deg, rgba(108,99,255,0.1), rgba(79,70,229,0.05))",
            textAlign: "center",
            borderBottom: "1px solid var(--border)",
          }}>
            {/* Icon */}
            <div style={{
              width: 72, height: 72,
              background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(79,70,229,0.1))",
              border: "1px solid rgba(108,99,255,0.3)",
              borderRadius: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 32,
            }}>
              {isExe ? "⬇" : "📄"}
            </div>

            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              {fileName}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em", marginBottom: 32 }}>
              {isExe ? "Installateur Windows · Double-cliquez pour installer" : "Script PowerShell · Windows 10/11"}
            </div>

            <a
              href={downloadUrl}
              download={fileName}
              style={{
                background: "linear-gradient(135deg, var(--accent), #4f46e5)",
                color: "white",
                textDecoration: "none",
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.03em",
                padding: "16px 40px",
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(108,99,255,0.4)",
                transition: "all 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(108,99,255,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(108,99,255,0.4)"; }}
            >
              Télécharger
            </a>
          </div>

          {/* Install steps */}
          <div style={{ padding: "32px 40px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24 }}>
              {isExe ? "Installation en 1 étape" : "Installation en 2 étapes"}
            </div>

            {isExe ? (
              /* EXE: one step */
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{
                  width: 36, height: 36, flexShrink: 0,
                  background: "rgba(108,99,255,0.1)",
                  border: "1px solid rgba(108,99,255,0.2)",
                  borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent2)", fontWeight: 700,
                }}>01</div>
                <div style={{ flex: 1, paddingTop: 6 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                    Double-cliquez sur <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent2)" }}>cmdmem-installer.exe</code>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                    L&apos;installateur configure tout automatiquement. Ouvrez un nouveau PowerShell — vos commandes sont désormais capturées.
                  </div>
                </div>
              </div>
            ) : (
              /* PS1: two steps */
              [
                {
                  num: "01",
                  title: "Télécharger le fichier",
                  desc: "Clique sur le bouton ci-dessus pour télécharger l'installateur.",
                  code: null,
                },
                {
                  num: "02",
                  title: "Exécuter dans PowerShell",
                  desc: "Ouvre PowerShell en tant qu'administrateur et exécute le fichier :",
                  code: ".\\cmdmem-installer.ps1",
                },
              ].map((step) => (
                <div key={step.num} style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                  <div style={{
                    width: 36, height: 36, flexShrink: 0,
                    background: "rgba(108,99,255,0.1)",
                    border: "1px solid rgba(108,99,255,0.2)",
                    borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent2)", fontWeight: 700,
                  }}>{step.num}</div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: step.code ? 12 : 0 }}>{step.desc}</div>
                    {step.code && (
                      <code style={{
                        display: "block",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "#c4b5fd",
                        background: "rgba(108,99,255,0.08)",
                        border: "1px solid rgba(108,99,255,0.15)",
                        padding: "10px 16px",
                        borderRadius: 8,
                      }}>
                        {step.code}
                      </code>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* One-liner alternative */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
            Alternative — Installation en une ligne
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
            Colle directement dans PowerShell :
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
              {info?.install_command ?? 'irm "http://localhost:8000/api/download/installer.ps1" | iex'}
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
              { icon: "📁", label: "Répertoire courant", ok: true },
              { icon: "✓", label: "Code de retour", ok: true },
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

        {/* SSH Client */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "28px 32px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            background: "linear-gradient(135deg, rgba(56,189,248,0.06), transparent)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 48, height: 48,
                background: "rgba(56,189,248,0.1)",
                border: "1px solid rgba(56,189,248,0.25)",
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>🖥</div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, marginBottom: 3 }}>
                  cmdmem-ssh.exe
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em" }}>
                  Client SSH avec capture automatique · Windows
                </div>
              </div>
            </div>
            <a
              href="/api/download/ssh-client.exe"
              download="cmdmem-ssh.exe"
              style={{
                background: info?.ssh_client_available
                  ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                  : "var(--surface2)",
                color: info?.ssh_client_available ? "white" : "var(--muted)",
                textDecoration: "none",
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.03em",
                padding: "12px 28px",
                borderRadius: 10,
                boxShadow: info?.ssh_client_available ? "0 4px 18px rgba(14,165,233,0.35)" : "none",
                border: info?.ssh_client_available ? "none" : "1px solid var(--border2)",
                pointerEvents: info?.ssh_client_available ? "auto" : "none",
                opacity: info?.ssh_client_available ? 1 : 0.5,
                transition: "all 0.2s",
                display: "inline-block",
                whiteSpace: "nowrap",
              }}
            >
              {info?.ssh_client_available ? "⬇ Télécharger" : "Indisponible"}
            </a>
          </div>

          {/* Features */}
          <div style={{ padding: "20px 32px", display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              "Multi-onglets SSH",
              "Capture automatique des commandes",
              "Filtrage intelligent des doublons",
              "Autocomplétion Tab",
              "Gestionnaire de sessions",
            ].map((feat) => (
              <span key={feat} style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--muted)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                padding: "5px 12px",
                borderRadius: 20,
              }}>
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Connection test */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Vérifier la connexion</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {status === "ok" && <span style={{ color: "var(--green)" }}>✓ Backend accessible — tout est prêt</span>}
              {status === "error" && <span style={{ color: "var(--red)" }}>✗ Backend inaccessible</span>}
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
