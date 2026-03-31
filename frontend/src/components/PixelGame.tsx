"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ground: "#5D9B3A", groundDark: "#4A7D2E", groundLight: "#6DB347",
  stone1: "#9B9B9B", stone2: "#7A7A7A", stone3: "#B8B8B8",
  path: "#C8A97A", pathDark: "#A8895A", pathLight: "#DCC090",
  trunk: "#6B3A2A", trunkDark: "#4A2518", leaf: "#2D7A1F", leafDark: "#1F5C13", leafLight: "#3D9A2F",
  pineLeaf: "#1A5C2A", pineLeafDark: "#0F3D1A",
  flower1: "#FF6B6B", flower2: "#FFE66D", flower3: "#A8E6CF", flower4: "#FF9FF3",
  water: "#4A9ECD", waterLight: "#6BB8E0", waterDark: "#2A7EAD",
  wall1: "#F5DEB3", wall2: "#EDD9A3", wall3: "#8B6914", wall4: "#6B4F10",
  door: "#8B4513", doorDark: "#5C2E0A",
  sign: "#DEB887", signText: "#4A2C0A",
  charHair: "#2C1810", charSkin: "#FDBCB4", charShirt: "#4A90D9",
  charPants: "#2C3E50", charShoes: "#6B4226",
  shadow: "rgba(0,0,0,0.18)",
  lamp: "#C8A850",
  terminal: "#0A1A0A", terminalText: "#00FF41",
  cable: "#3A3A3A",
  fence: "#B09060",
  hudBorder: "#00D4FF",
};

// ─── World constants ────────────────────────────────────────────────────────────
const WORLD_W = 4400;
const PX = 3;
const GROUND_Y = 0.72;
const CHAR_W = 12;
const RIVER_X1 = 1100, RIVER_X2 = 1200; // world units
const SECRET_WX = 4180;

const BUILDINGS = [
  { id: "skills",  wx: 680,  label: "Compétences",    color: "#27AE60", roofColor: "#1E8449" },
  { id: "xp",      wx: 1560, label: "Expériences",    color: "#2980B9", roofColor: "#1A5276" },
  { id: "certs",   wx: 2480, label: "Certifications", color: "#8E44AD", roofColor: "#6C3483" },
  { id: "contact", wx: 3380, label: "Contact",        color: "#E67E22", roofColor: "#CA6F1E" },
];
const ALL_ZONES = [...BUILDINGS, { id: "secret", wx: SECRET_WX, color: "#FF4444", roofColor: "#CC2222", label: "Secret" }];

// ─── Stars (pre-generated, fixed positions) ────────────────────────────────────
const STARS = Array.from({ length: 180 }, (_, i) => ({
  fx: ((i * 137.508) % 1),          // fractional world x
  fy: ((i * 73.13 * 3.7) % 0.88) * GROUND_Y,
  r: 0.5 + (i % 5) * 0.22,
  bright: 0.4 + (i % 4) * 0.18,
  twinkle: i * 0.37,
}));

// ─── TOD (Time of Day) helpers ─────────────────────────────────────────────────
// Maps scrollProgress (0..1) → time-of-day (0=dawn, 0.4=day, 0.65=sunset, 1=night)
function getTOD(sp: number): number {
  if (sp < 0.06) return (sp / 0.06) * 0.1;
  if (sp < 0.45) return 0.1 + ((sp - 0.06) / 0.39) * 0.30;
  if (sp < 0.62) return 0.4 + ((sp - 0.45) / 0.17) * 0.25;
  if (sp < 0.78) return 0.65 + ((sp - 0.62) / 0.16) * 0.15;
  return 0.8 + ((sp - 0.78) / 0.22) * 0.20;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpRGB(a: number[], b: number[], t: number) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
function rgb(c: number[]) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

const SKY_KF = [
  { t: 0.0,  top: [240, 120,  50], bot: [255, 190, 130] },
  { t: 0.1,  top: [ 70, 130, 200], bot: [180, 220, 248] },
  { t: 0.4,  top: [ 26,  63, 122], bot: [135, 206, 235] },
  { t: 0.65, top: [180,  65,  25], bot: [240, 125,  55] },
  { t: 0.8,  top: [ 28,  18,  68], bot: [ 55,  28,  88] },
  { t: 1.0,  top: [  5,   5,  22], bot: [ 10,  10,  38] },
];

function skyColors(tod: number) {
  let i = 0;
  while (i < SKY_KF.length - 2 && SKY_KF[i + 1].t <= tod) i++;
  const a = SKY_KF[i], b = SKY_KF[i + 1];
  const t = (tod - a.t) / (b.t - a.t);
  return { top: lerpRGB(a.top, b.top, t), bot: lerpRGB(a.bot, b.bot, t) };
}

// ─── CV Content ────────────────────────────────────────────────────────────────
const CV: Record<string, { title: string; icon: string; content: React.ReactNode }> = {
  skills: {
    title: "⚔️ Compétences", icon: "🗡️",
    content: (
      <div className="grid grid-cols-2 gap-4">
        {[
          { cat: "Réseau & Sécurité",  items: ["Firewall Check Point", "Palo Alto NGFW", "Akamai Web Security", "VPN/IPSec", "Zero Trust"] },
          { cat: "Cloud & DevOps",     items: ["Jenkins", "Puppet", "GitLab", "Docker", "Linux Admin", "Windows Server"] },
          { cat: "Monitoring & ITSM",  items: ["Centreon", "Qualys VMDR", "Tanium", "Active Directory", "GPO"] },
          { cat: "Cybersécurité",      items: ["SIEM/SOC (N2)", "Pentest", "ISO 27001", "ANSSI", "Gestion vulnérabilités"] },
        ].map(({ cat, items }) => (
          <div key={cat} className="bg-black/30 rounded-lg p-3 border border-white/10">
            <h3 className="text-yellow-300 font-bold text-sm mb-2">{cat}</h3>
            <div className="flex flex-wrap gap-1">
              {items.map(i => <span key={i} className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full border border-white/20">{i}</span>)}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  xp: {
    title: "📜 Expériences Pro", icon: "💼",
    content: (
      <div className="space-y-4">
        {[
          { co: "PLUXEE", role: "Ingénieur Sécurité et Système", period: "2023 — PRÉSENT",
            tasks: ["Gestion et remédiation des vulnérabilités via Qualys", "Configuration sécurité sur la plateforme Akamai", "Supervision via Centreon, Jenkins, Puppet et GitLab", "Déploiement de Tanium pour les mises à jour serveurs"] },
          { co: "ORANGE CYBERDEFENSE", role: "Alternance — Sécurité Réseau", period: "2020 — 2022",
            tasks: ["Incidents de niveau 2 sur infrastructures de sécurité réseau", "Administration firewalls : Check Point, Palo Alto, Juniper", "Liaison et support avec les équipes constructeurs"] },
          { co: "HUTCHINSON", role: "Alternance — Admin. Système & Réseau", period: "2019 — 2020",
            tasks: ["Administration d'un parc de ~300 serveurs Windows & Linux", "Gestion des utilisateurs et accès (Active Directory, GPO)", "Maintenance et support de l'infrastructure réseau"] },
        ].map(({ co, role, period, tasks }) => (
          <div key={co} className="bg-black/30 rounded-lg p-3 border border-white/10">
            <div className="flex justify-between items-start mb-1">
              <div><h3 className="text-blue-300 font-bold">{co}</h3><p className="text-yellow-200 text-sm">{role}</p></div>
              <span className="text-gray-400 text-xs bg-black/40 px-2 py-1 rounded">{period}</span>
            </div>
            <ul className="space-y-0.5 mt-2">
              {tasks.map(t => <li key={t} className="text-gray-300 text-xs flex gap-2"><span className="text-green-400">▶</span>{t}</li>)}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
  certs: {
    title: "🏆 Certifications", icon: "🛡️",
    content: (
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: "ITIL V4 Foundation",       org: "Axelos",  icon: "⚙️", color: "from-purple-600 to-purple-800" },
          { name: "Akamai Web Security App",  org: "Akamai",  icon: "🛡️", color: "from-blue-600 to-cyan-700" },
        ].map(({ name, org, icon, color }) => (
          <div key={name} className={`bg-gradient-to-br ${color} rounded-lg p-4 text-center border border-white/20`}>
            <div className="text-3xl mb-2">{icon}</div>
            <h3 className="text-white font-bold text-sm mb-1">{name}</h3>
            <p className="text-white/70 text-xs">{org}</p>
            <div className="mt-2 inline-block bg-white/10 border border-white/20 px-2 py-0.5 rounded text-white/80 text-xs">VALIDÉ</div>
          </div>
        ))}
      </div>
    ),
  },
  contact: {
    title: "📮 Contact", icon: "✉️",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto flex items-center justify-center text-3xl mb-2">👨‍💻</div>
          <h2 className="text-white text-xl font-bold">Jean-Baptiste Chagnat</h2>
          <p className="text-gray-400 text-sm">Ingénieur Cybersécurité · Paris, France</p>
        </div>
        {[
          { icon: "📧", label: "Email",    value: "chagnat-jb@outlook.fr",                       href: "mailto:chagnat-jb@outlook.fr" },
          { icon: "📞", label: "Téléphone",value: "06 21 23 50 08",                               href: "tel:+33621235008" },
          { icon: "💼", label: "LinkedIn", value: "jean-baptiste-chagnat-418b22187",              href: "https://www.linkedin.com/in/jean-baptiste-chagnat-418b22187/" },
          { icon: "🌐", label: "Site",     value: "www.chagnat.fr",                               href: "https://www.chagnat.fr" },
        ].map(({ icon, label, value, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
             className="flex items-center gap-3 bg-black/30 rounded-lg p-3 border border-white/10 hover:border-white/30 transition-colors group">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-gray-400 text-xs">{label}</p>
              <p className="text-white text-sm group-hover:text-blue-300 transition-colors">{value}</p>
            </div>
          </a>
        ))}
      </div>
    ),
  },
  secret: {
    title: "☠️ Zone Secrète", icon: "💀",
    content: (
      <div className="font-mono text-sm space-y-1 p-2">
        <p className="text-green-400">$ whoami</p>
        <p className="text-white ml-4">jbchagnat — ingénieur, pas hacker (enfin, les deux)</p>
        <p className="text-green-400 mt-2">$ cat /var/log/career_fails.log</p>
        <div className="ml-4 space-y-1 text-yellow-200 text-xs">
          <p>[2019] Premier firewall Check Point... et première règle <span className="text-red-400">ANY ANY ALLOW</span> 💀</p>
          <p>[2020] <span className="text-red-400">sudo rm -rf /</span> sur un serveur de prod. Silence radio pendant 3h.</p>
          <p>[2021] <span className="text-cyan-300">git push --force origin main</span> → "Ça va aller les gars"</p>
          <p>[2022] <span className="text-purple-300">ping work-life-balance</span> → Request timeout (100% loss)</p>
          <p>[2023] <span className="text-green-300">apt install wisdom</span> → E: Unable to locate package</p>
        </div>
        <p className="text-green-400 mt-2">$ ./hack_the_planet.sh</p>
        <p className="text-red-400 ml-4">Permission denied. Try sudo.</p>
        <p className="text-green-400">$ sudo ./hack_the_planet.sh</p>
        <p className="text-green-300 ml-4 animate-pulse">██████████ 100% — Done. Planet secured.</p>
        <div className="mt-3 border border-cyan-500/30 rounded p-2 bg-cyan-500/5 text-xs text-cyan-300">
          🎉 Félicitations ! Vous avez trouvé la zone secrète.<br/>
          Ce portfolio tourne sur un VPS Ubuntu 24.04 durci à la main :<br/>
          fail2ban · UFW · Nginx · Let&apos;s Encrypt · SSH hardening · sysctl<br/>
          <span className="text-white/50">...et beaucoup de café.</span>
        </div>
      </div>
    ),
  },
};

// ─── Drawing helpers ────────────────────────────────────────────────────────────
function px(n: number) { return n * PX; }
function R(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ─── Sky (TOD-aware) ───────────────────────────────────────────────────────────
const BIN_TOKENS = ["01001011","0xFF","0xDEAD","sudo","ssh","nmap","PING","ACK","SYN","chmod 777","iptables","01 10","0.0.0.0"];
function drawSky(ctx: CanvasRenderingContext2D, W: number, H: number, camX: number, t: number, tod: number) {
  const sc = skyColors(tod);
  const grd = ctx.createLinearGradient(0, 0, 0, H * GROUND_Y);
  grd.addColorStop(0, rgb(sc.top));
  grd.addColorStop(1, rgb(sc.bot));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H * GROUND_Y + 4);

  // Stars (visible when tod > 0.6)
  if (tod > 0.6) {
    const starAlpha = Math.min(1, (tod - 0.6) / 0.25);
    for (const s of STARS) {
      const wx = s.fx * WORLD_W * PX;
      const sx = wx - camX * 0.05;
      const screenX = ((sx % (W + 200)) + W + 200) % (W + 200) - 100;
      const twinkle = s.bright * (0.6 + Math.sin(t * 0.001 + s.twinkle) * 0.4);
      ctx.fillStyle = `rgba(255,245,200,${twinkle * starAlpha})`;
      ctx.beginPath(); ctx.arc(screenX, s.fy * H, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Moon (visible when tod > 0.72)
  if (tod > 0.72) {
    const moonAlpha = Math.min(1, (tod - 0.72) / 0.2);
    const mx = W * 0.8 + Math.sin(t * 0.00005) * 20;
    const my = H * 0.12;
    // glow
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 45);
    mg.addColorStop(0, `rgba(220,220,180,${0.12 * moonAlpha})`);
    mg.addColorStop(1, "rgba(220,220,180,0)");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 45, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = `rgba(230,228,195,${moonAlpha})`;
    ctx.beginPath(); ctx.arc(mx, my, 18, 0, Math.PI * 2); ctx.fill();
    // craters
    ctx.fillStyle = `rgba(190,188,158,${moonAlpha * 0.5})`;
    for (const [dx, dy, r] of [[-5, -3, 4], [4, 5, 3], [-2, 6, 2]] as [number, number, number][]) {
      ctx.beginPath(); ctx.arc(mx + dx, my + dy, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Mountains (parallax 0.12x)
  const mP = camX * 0.12;
  const mtCol = tod > 0.6 ? lerpRGB([107, 127, 148], [20, 15, 50], (tod - 0.6) / 0.4) : [107, 127, 148];
  for (let i = 0; i < 10; i++) {
    const raw = i * 520 - mP;
    const bx = ((raw % (5200 + W)) + 5200 + W) % (5200 + W) - 200;
    const bh = 70 + (i % 4) * 35;
    ctx.fillStyle = rgb(mtCol);
    ctx.beginPath(); ctx.moveTo(bx, H * GROUND_Y + 4); ctx.lineTo(bx + 130, H * GROUND_Y + 4 - bh); ctx.lineTo(bx + 260, H * GROUND_Y + 4); ctx.fill();
    if (tod < 0.7) {
      ctx.fillStyle = "rgba(230,240,255,0.7)";
      ctx.beginPath(); ctx.moveTo(bx + 100, H * GROUND_Y + 4 - bh + 22); ctx.lineTo(bx + 130, H * GROUND_Y + 4 - bh); ctx.lineTo(bx + 160, H * GROUND_Y + 4 - bh + 22); ctx.fill();
    }
  }

  // Floating binary tokens
  ctx.font = "9px monospace"; ctx.textBaseline = "top";
  for (let i = 0; i < 14; i++) {
    const seed = i * 137.5;
    const wx = (seed * 200 + t * 0.01 * (0.3 + (i % 4) * 0.15)) % (WORLD_W * PX);
    const sx = wx - camX * (0.18 + (i % 3) * 0.04);
    const screenX = ((sx % (W + 300)) + W + 300) % (W + 300) - 50;
    const y = 18 + (i * 53) % (H * GROUND_Y * 0.65);
    const base = tod > 0.7 ? 0.1 : 0.055;
    const alpha = base + Math.sin(t * 0.0007 + i) * 0.025;
    ctx.fillStyle = tod > 0.7
      ? `rgba(100,200,255,${alpha})`
      : `rgba(${i % 2 === 0 ? "80,220,100" : "100,180,255"},${alpha})`;
    ctx.fillText(BIN_TOKENS[i % BIN_TOKENS.length], screenX, y);
  }
}

// ─── Birds ─────────────────────────────────────────────────────────────────────
function drawBirds(ctx: CanvasRenderingContext2D, W: number, H: number, camX: number, t: number, tod: number) {
  if (tod > 0.75) return; // no birds at night
  const flocks = [
    { base: 800,  speed: 0.025, y: 55, count: 4 },
    { base: 2200, speed: 0.018, y: 40, count: 3 },
    { base: 3600, speed: 0.032, y: 68, count: 5 },
  ];
  ctx.strokeStyle = `rgba(30,30,60,${tod > 0.55 ? 0.3 : 0.55})`;
  ctx.lineWidth = 1.5;
  for (const fl of flocks) {
    for (let b = 0; b < fl.count; b++) {
      const wx = (fl.base + b * 28 + t * fl.speed) % (WORLD_W * PX + 300);
      const sx = wx - camX * 0.22;
      const screenX = ((sx % (W + 300)) + W + 300) % (W + 300) - 50;
      const wf = Math.sin(t * 0.006 + b * 1.3) * 4;
      const by = fl.y + Math.sin(t * 0.0015 + b * 0.7) * 6;
      ctx.beginPath();
      ctx.moveTo(screenX - 7, by + wf);
      ctx.quadraticCurveTo(screenX - 3, by, screenX, by + 1);
      ctx.quadraticCurveTo(screenX + 3, by, screenX + 7, by + wf);
      ctx.stroke();
    }
  }
}

// ─── Clouds ────────────────────────────────────────────────────────────────────
function drawClouds(ctx: CanvasRenderingContext2D, W: number, H: number, camX: number, t: number, tod: number) {
  if (tod > 0.82) return;
  const alpha = tod > 0.65 ? 1 - (tod - 0.65) / 0.17 : 0.88;
  const clouds = [
    { bx: 300, by: 65, s: 1.3 }, { bx: 900, by: 42, s: 0.9 }, { bx: 1500, by: 80, s: 1.6 },
    { bx: 2100, by: 52, s: 1.0 }, { bx: 2700, by: 68, s: 1.4 }, { bx: 3300, by: 44, s: 0.8 },
    { bx: 3900, by: 72, s: 1.2 }, { bx: 550, by: 30, s: 0.7 },
  ];
  const cloudTint = tod > 0.55
    ? lerpRGB([255,255,255], [240,140,80], Math.min(1,(tod-0.55)/0.1))
    : [255,255,255];
  for (const cl of clouds) {
    const sx = cl.bx - camX * 0.28 + Math.sin(t * 0.00025 + cl.bx * 0.01) * 10;
    const screenX = ((sx % (W + 500)) + W + 500) % (W + 500) - 250;
    const s = cl.s;
    ctx.fillStyle = `rgba(${cloudTint[0]|0},${cloudTint[1]|0},${cloudTint[2]|0},${alpha})`;
    for (const [dx, dy, r] of [
      [0,0,30*s],[46*s,-9*s,26*s],[-38*s,-6*s,22*s],[22*s,-24*s,24*s],[-18*s,-22*s,19*s],[0,-18*s,20*s],
    ] as [number,number,number][]) {
      ctx.beginPath(); ctx.arc(screenX+dx, cl.by+dy, r, 0, Math.PI*2); ctx.fill();
    }
  }
}

// ─── Ground ─────────────────────────────────────────────────────────────────────
function drawGround(ctx: CanvasRenderingContext2D, W: number, H: number, camX: number, tod: number) {
  const gy = H * GROUND_Y;
  const groundCol = tod > 0.7
    ? lerpRGB([93,155,58], [25,35,20], (tod - 0.7) / 0.3)
    : [93, 155, 58];
  R(ctx, 0, gy, W, H - gy, rgb(groundCol));
  const tileW = px(5);
  const stT = Math.floor(camX / tileW) - 1;
  for (let ti = stT; ti < stT + Math.ceil(W / tileW) + 2; ti++) {
    const tx = ti * tileW - camX;
    if (ti % 3 === 0) ctx.fillStyle = rgb(lerpRGB([74,125,46],[18,28,16],(tod-0.7<0?0:(tod-0.7)/0.3)));
    else if (ti % 3 === 2) ctx.fillStyle = rgb(lerpRGB([109,179,71],[30,42,22],(tod-0.7<0?0:(tod-0.7)/0.3)));
    else continue;
    ctx.fillRect(Math.round(tx), gy, tileW, H - gy);
  }
  // Skip path in river zone
  const pathY = gy + px(1.5), pathH = px(7);
  const riverSX1 = RIVER_X1 * PX - camX, riverSX2 = RIVER_X2 * PX - camX;
  // Left segment
  if (riverSX1 > 0) R(ctx, 0, pathY, Math.min(riverSX1, W), pathH, C.path);
  // Right segment
  if (riverSX2 < W) R(ctx, Math.max(riverSX2, 0), pathY, W - Math.max(riverSX2, 0), pathH, C.path);
  // Cobblestone
  const cw = px(5), ch = px(3);
  const cSt = Math.floor(camX / cw) - 1;
  for (let ci = cSt; ci < cSt + Math.ceil(W / cw) + 2; ci++) {
    const csx = ci * cw - camX;
    if (csx + cw < riverSX1 || csx > riverSX2) {
      const off = (Math.floor(ci / 2) % 2) * (cw / 2);
      const cx2 = ci * cw - camX + off;
      for (const ry of [pathY + px(0.5), pathY + ch + px(1)]) {
        R(ctx, cx2, ry, cw - px(0.5), ch, C.pathLight);
        R(ctx, cx2 + px(0.3), ry + px(0.3), cw - px(1.2), ch - px(0.6), C.path);
      }
    }
  }
  R(ctx, 0, pathY, riverSX1 > 0 ? Math.min(riverSX1, W) : 0, px(0.8), C.pathDark);
  if (riverSX2 < W) R(ctx, Math.max(riverSX2, 0), pathY, W, px(0.8), C.pathDark);
  // Grass tufts
  for (let wx = 80; wx < WORLD_W; wx += 55) {
    const sx = wx * PX - camX;
    if (sx < -10 || sx > W + 10) continue;
    if (wx * PX > RIVER_X1 * PX - px(3) && wx * PX < RIVER_X2 * PX + px(3)) continue;
    const h2 = px(1.5 + (wx * 0.037 % 2));
    R(ctx, sx, pathY - h2 - px(0.5), px(1), h2, "#3A8A20");
  }
}

// ─── River ──────────────────────────────────────────────────────────────────────
function drawRiver(ctx: CanvasRenderingContext2D, camX: number, H: number, W: number, t: number, tod: number) {
  const gy = H * GROUND_Y;
  const sx1 = RIVER_X1 * PX - camX, sx2 = RIVER_X2 * PX - camX;
  if (sx2 < 0 || sx1 > W) return;
  const rw = sx2 - sx1, ry = gy, rh = H - gy;
  // River banks (darker earth)
  R(ctx, sx1 - px(4), ry, px(4), rh, "#3D6B20");
  R(ctx, sx2, ry, px(4), rh, "#3D6B20");
  // Water body
  const waterTop = tod > 0.7
    ? lerpRGB([74,158,205], [15,30,60], (tod-0.7)/0.3)
    : [74,158,205];
  R(ctx, sx1, ry, rw, rh, rgb(waterTop));
  // Animated ripples
  for (let wr = 0; wr < 5; wr++) {
    const wy = ry + px(2) + wr * px(3);
    const wOff = Math.sin(t * 0.002 + wr * 0.9) * px(4);
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + wr * 0.02})`;
    ctx.lineWidth = px(0.6);
    ctx.beginPath();
    ctx.moveTo(sx1 + px(2), wy + wOff);
    ctx.bezierCurveTo(sx1 + rw * 0.33, wy + wOff - px(1.5), sx1 + rw * 0.66, wy + wOff + px(1.5), sx2 - px(2), wy + wOff);
    ctx.stroke();
  }
  // Light reflection (day only)
  if (tod < 0.6) {
    const refAlpha = (1 - tod / 0.6) * 0.18;
    const refX = sx1 + rw * 0.3 + Math.sin(t * 0.0015) * px(4);
    ctx.fillStyle = `rgba(255,255,255,${refAlpha})`;
    ctx.beginPath(); ctx.ellipse(refX, ry + rh * 0.3, px(8), px(2), 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // Bank grass
  for (let i = 0; i < 6; i++) {
    const gx = sx1 - px(3) + i * px(1.2);
    R(ctx, gx, ry - px(1.5), px(0.8), px(2), "#3A8A1A");
    const gx2 = sx2 + i * px(1.2);
    R(ctx, gx2, ry - px(1.5), px(0.8), px(2), "#3A8A1A");
  }
}

// ─── Bridge ─────────────────────────────────────────────────────────────────────
function drawBridge(ctx: CanvasRenderingContext2D, camX: number, H: number) {
  const gy = H * GROUND_Y;
  const bx1 = (RIVER_X1 + 10) * PX - camX;
  const bx2 = (RIVER_X2 - 10) * PX - camX;
  if (bx2 < -20 || bx1 > ctx.canvas.width + 20) return;
  const bw = bx2 - bx1, by = gy + px(1.2);
  // Side rails
  R(ctx, bx1 - px(2), by - px(5), bw + px(4), px(1.5), "#8B5C2A");
  R(ctx, bx1 - px(2), by + px(6), bw + px(4), px(1.5), "#8B5C2A");
  // Rail posts
  for (let p = 0; p <= 4; p++) {
    const px2 = bx1 + (p / 4) * bw;
    R(ctx, px2 - px(0.8), by - px(6), px(1.6), px(9), "#6B3A10");
  }
  // Planks
  const plankW = px(3.5), gap = px(1);
  for (let px3 = bx1; px3 < bx2; px3 += plankW + gap) {
    R(ctx, px3, by, plankW, px(6), "#A0703A");
    R(ctx, px3 + px(0.3), by + px(0.3), plankW - px(0.6), px(0.8), "#B8844A");
    R(ctx, px3, by + px(5.2), plankW, px(0.8), "#7A5020");
  }
  // Shadow under bridge
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(Math.round(bx1), Math.round(by + px(6)), bw, px(3));
}

// ─── Tree (oak) ─────────────────────────────────────────────────────────────────
function drawTree(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, tod: number) {
  const sx = wx * PX - camX;
  if (sx < -100 || sx > ctx.canvas.width + 100) return;
  const gy = H * GROUND_Y;
  const leafMod = tod > 0.65 ? lerpRGB([45,122,31],[10,30,8],(tod-0.65)/0.35) : [45,122,31];
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(sx, gy+px(1), px(7), px(2), 0, 0, Math.PI*2); ctx.fill();
  R(ctx, sx-px(2.5), gy-px(12), px(5), px(12), C.trunkDark);
  R(ctx, sx-px(1.5), gy-px(12), px(3), px(12), C.trunk);
  R(ctx, sx-px(4), gy-px(2), px(3), px(2), C.trunkDark);
  R(ctx, sx+px(1.5), gy-px(2), px(3), px(2), C.trunkDark);
  for (const [off, wide, tall, darken] of [
    [0, px(20), px(18), 0.35],
    [-px(2), px(16), px(14), 0.15],
    [-px(6), px(12), px(10), 0],
  ] as [number, number, number, number][]) {
    const col = lerpRGB(leafMod, [0,0,0], darken);
    ctx.fillStyle = rgb(col);
    ctx.beginPath();
    ctx.moveTo(sx-wide/2, gy-px(12)+off+tall); ctx.lineTo(sx, gy-px(12)+off-2); ctx.lineTo(sx+wide/2, gy-px(12)+off+tall);
    ctx.fill();
  }
}

// ─── Pine ───────────────────────────────────────────────────────────────────────
function drawPine(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, tod: number) {
  const sx = wx * PX - camX;
  if (sx < -80 || sx > ctx.canvas.width + 80) return;
  const gy = H * GROUND_Y;
  R(ctx, sx-px(1.5), gy-px(10), px(3), px(10), C.trunkDark);
  for (let layer = 0; layer < 4; layer++) {
    const lw = px(10 - layer*1.5), lh = px(7);
    const ly = gy - px(10) - layer*px(6);
    const baseCol = layer % 2 === 0 ? [26,92,42] : [15,61,26];
    const col = tod > 0.7 ? lerpRGB(baseCol,[5,15,8],(tod-0.7)/0.3) : baseCol;
    ctx.fillStyle = rgb(col);
    ctx.beginPath(); ctx.moveTo(sx-lw/2, ly+lh); ctx.lineTo(sx, ly-px(2)); ctx.lineTo(sx+lw/2, ly+lh); ctx.fill();
    if (layer === 3 && tod < 0.6) {
      ctx.fillStyle = "rgba(220,240,255,0.6)";
      ctx.beginPath(); ctx.moveTo(sx-lw*0.3, ly+lh*0.3); ctx.lineTo(sx, ly-px(2)); ctx.lineTo(sx+lw*0.3, ly+lh*0.3); ctx.fill();
    }
  }
}

// ─── Bush ────────────────────────────────────────────────────────────────────────
function drawBush(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, large = false, glowing = false, t = 0) {
  const sx = wx * PX - camX;
  if (sx < -60 || sx > ctx.canvas.width + 60) return;
  const gy = H * GROUND_Y;
  const s = large ? 1.6 : 1.0;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(sx, gy+px(0.5), px(7*s), px(1.5), 0, 0, Math.PI*2); ctx.fill();
  if (glowing) {
    const ga = 0.2 + Math.sin(t*0.002)*0.1;
    ctx.shadowColor = "#00FF65"; ctx.shadowBlur = 18*ga;
  }
  for (const [dx, dy, r, col] of [
    [0, 0, px(5*s), C.leaf],
    [-px(5*s), -px(1), px(4*s), C.leafDark],
    [px(5*s), -px(1), px(4*s), C.leafDark],
    [0, -px(4*s), px(3.5*s), "#5DBB3F"],
  ] as [number, number, number, string][]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx+dx, gy-px(1)+dy, r, 0, Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  // berries
  for (const [dx, dy] of [[-px(4),-px(3)],[px(2),-px(5)],[px(5),-px(2)]] as [number,number][]) {
    ctx.fillStyle = Math.abs(dx) > px(3) ? "#CC3333" : "#3355AA";
    ctx.beginPath(); ctx.arc(sx+dx*s, gy-px(1)+dy*s, px(0.8), 0, Math.PI*2); ctx.fill();
  }
}

// ─── Flowers ───────────────────────────────────────────────────────────────────
function drawFlowers(ctx: CanvasRenderingContext2D, camX: number, H: number, W: number) {
  const gy = H * GROUND_Y;
  const spots = [
    {wx:190,c:C.flower1},{wx:340,c:C.flower2},{wx:490,c:C.flower3},{wx:600,c:C.flower4},
    {wx:820,c:C.flower1},{wx:1050,c:C.flower2},{wx:1370,c:C.flower1},{wx:1720,c:C.flower2},
    {wx:1840,c:C.flower3},{wx:2030,c:C.flower4},{wx:2170,c:C.flower1},{wx:2620,c:C.flower2},
    {wx:2850,c:C.flower3},{wx:3000,c:C.flower4},{wx:3140,c:C.flower1},{wx:3540,c:C.flower2},
    {wx:3780,c:C.flower3},{wx:4050,c:C.flower4},
  ];
  for (const f of spots) {
    const sx = f.wx*PX - camX;
    if (sx < -20 || sx > W+20) continue;
    R(ctx, sx-px(0.5), gy+px(3), px(1), px(3), "#3A8A20");
    for (let p = 0; p < 5; p++) {
      const angle = (p/5)*Math.PI*2;
      ctx.fillStyle = f.c;
      ctx.beginPath();
      ctx.ellipse(sx+Math.cos(angle)*px(1.8), gy+px(3)-px(0.5)+Math.sin(angle)*px(1.8), px(1.2), px(0.8), angle, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = "#FFDD44"; ctx.beginPath(); ctx.arc(sx, gy+px(3)-px(0.5), px(1), 0, Math.PI*2); ctx.fill();
  }
}

// ─── Rocks ──────────────────────────────────────────────────────────────────────
function drawRocks(ctx: CanvasRenderingContext2D, camX: number, H: number, W: number) {
  const gy = H*GROUND_Y, pY = gy+px(2.5);
  const rocks = [{wx:145,r:1.4},{wx:390,r:1.0},{wx:720,r:1.8},{wx:1080,r:1.2},{wx:1650,r:1.5},
    {wx:2100,r:1.1},{wx:2350,r:1.7},{wx:2820,r:0.8},{wx:3100,r:1.3},{wx:3450,r:1.0},{wx:3900,r:1.6}];
  for (const rock of rocks) {
    const sx = rock.wx*PX - camX;
    if (sx < -20 || sx > W+20) continue;
    const r = px(rock.r);
    ctx.fillStyle = C.stone2; ctx.beginPath(); ctx.ellipse(sx, pY+r*0.5, r*1.4, r*0.8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = C.stone3; ctx.beginPath(); ctx.ellipse(sx-r*0.3, pY+r*0.2, r*0.6, r*0.4, -0.3, 0, Math.PI*2); ctx.fill();
  }
}

// ─── Fence ─────────────────────────────────────────────────────────────────────
function drawFence(ctx: CanvasRenderingContext2D, wx1: number, wx2: number, camX: number, H: number) {
  const gy = H*GROUND_Y;
  const sx1 = wx1*PX-camX, sx2 = wx2*PX-camX;
  for (const ry of [gy+px(1.5), gy+px(3.5)]) {
    ctx.fillStyle = C.fence; ctx.fillRect(Math.round(sx1), Math.round(ry), sx2-sx1, px(1));
  }
  for (let wx = wx1; wx <= wx2; wx += 9) {
    const sx = wx*PX-camX;
    if (sx < -10 || sx > ctx.canvas.width+10) continue;
    R(ctx, sx-px(1), gy-px(2), px(2), px(8), "#A08050");
    ctx.fillStyle = "#C0A060";
    ctx.beginPath(); ctx.moveTo(sx, gy-px(4)); ctx.lineTo(sx-px(1), gy-px(2)); ctx.lineTo(sx+px(1), gy-px(2)); ctx.fill();
  }
}

// ─── Lamp ──────────────────────────────────────────────────────────────────────
function drawLamp(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, t: number, tod: number) {
  const sx = wx*PX-camX;
  if (sx < -40 || sx > ctx.canvas.width+40) return;
  const gy = H*GROUND_Y, postH = px(22);
  const glowStrength = tod > 0.55 ? Math.min(1,(tod-0.55)/0.2) : 0;
  if (glowStrength > 0) {
    const glowR = 15 + glowStrength*20;
    const g = ctx.createRadialGradient(sx+px(3), gy-postH, 0, sx+px(3), gy-postH, glowR);
    g.addColorStop(0, `rgba(255,200,60,${(0.3+Math.sin(t*0.002)*0.05)*glowStrength})`);
    g.addColorStop(1, "rgba(255,180,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx+px(3), gy-postH, glowR, 0, Math.PI*2); ctx.fill();
  }
  R(ctx, sx-px(1), gy-postH, px(2), postH, "#6A6A7A");
  R(ctx, sx-px(0.5), gy-postH, px(1), postH, "#8A8A9A");
  R(ctx, sx, gy-postH+px(1), px(5), px(1.5), "#6A6A7A");
  R(ctx, sx+px(3), gy-postH-px(4), px(4), px(5), "#4A4A5A");
  const lampCol = glowStrength > 0 ? `rgba(255,${200+Math.floor(glowStrength*55)},60,1)` : C.lamp;
  R(ctx, sx+px(3.5), gy-postH-px(3.5), px(3), px(4), lampCol);
  R(ctx, sx-px(2), gy-px(2), px(4), px(2), "#5A5A6A");
}

// ─── Server rack ────────────────────────────────────────────────────────────────
function drawServerRack(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, t: number) {
  const sx = wx*PX-camX;
  if (sx < -60 || sx > ctx.canvas.width+60) return;
  const gy = H*GROUND_Y, bh = px(20), bw = px(10), by = gy-bh;
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(Math.round(sx-bw/2+4), gy-4, bw, 6);
  R(ctx, sx-bw/2, by, bw, bh, "#1A2530");
  R(ctx, sx-bw/2+px(0.5), by+px(0.5), bw-px(1), bh-px(1), "#0E1A22");
  for (let u = 0; u < 5; u++) {
    const uy = by+px(2)+u*px(3.5);
    R(ctx, sx-bw/2+px(1), uy, bw-px(2), px(2.5), "#162028");
    const ledCols = ["#00FF41","#FF4444","#4488FF","#FFAA00","#00FF41"];
    const on = Math.sin(t*0.004+u*1.3) > (u===1?0.2:-0.5);
    ctx.fillStyle = on ? ledCols[u] : "#222";
    if (on) { ctx.shadowColor=ledCols[u]; ctx.shadowBlur=6; }
    ctx.beginPath(); ctx.arc(sx-bw/2+px(2), uy+px(1.2), px(0.7), 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    for (let d = 0; d < 2; d++) R(ctx, sx-bw/2+px(3.5)+d*px(2.5), uy+px(0.5), px(2), px(1.5), "#0A1218");
  }
  ctx.strokeStyle="#223344"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(sx-bw/2+px(2),gy); ctx.bezierCurveTo(sx-px(8),gy-px(3),sx+px(5),gy-px(2),sx+bw/2-px(1),gy); ctx.stroke();
}

// ─── Terminal screen ────────────────────────────────────────────────────────────
const TERM_LINES = [">ssh jbadmin@srv","Connected!",">iptables -L","ACCEPT all","REJECT all",">nmap -sV 10.0.0.1","22/tcp open","80/tcp open",">ping 8.8.8.8","64 bytes ttl=56",">./scan.py --all","Found 3 CVEs",">sudo ufw status","Status: active"];
function drawTerminal(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, t: number) {
  const sx = wx*PX-camX;
  if (sx < -80 || sx > ctx.canvas.width+80) return;
  const gy = H*GROUND_Y;
  R(ctx, sx-px(1), gy-px(18), px(2), px(18), "#5A5A6A");
  R(ctx, sx-px(5), gy-px(18), px(10), px(1.5), "#5A5A6A");
  R(ctx, sx-px(5), gy-px(18), px(10), px(12), "#1A1A2A");
  R(ctx, sx-px(4.5), gy-px(17.5), px(9), px(11), C.terminal);
  const li = Math.floor(t/1800)%TERM_LINES.length;
  ctx.fillStyle = C.terminalText; ctx.font=`${px(1.5)}px monospace`; ctx.textAlign="left"; ctx.textBaseline="top";
  for (let l=0;l<3;l++) {
    ctx.globalAlpha = 1-l*0.3;
    ctx.fillText(TERM_LINES[(li+l)%TERM_LINES.length].substring(0,11), sx-px(4), gy-px(17)+l*px(2.8));
  }
  ctx.globalAlpha=1;
  if (Math.floor(t/500)%2===0) R(ctx, sx-px(4), gy-px(17)+3*px(2.8), px(1.5), px(1.8), C.terminalText);
}

// ─── Network cable ──────────────────────────────────────────────────────────────
function drawCable(ctx: CanvasRenderingContext2D, wx1: number, wx2: number, camX: number, H: number, t: number, color: string) {
  const sx1=wx1*PX-camX, sx2=wx2*PX-camX;
  if (sx2 < -50 || sx1 > ctx.canvas.width+50) return;
  const gy=H*GROUND_Y, cy=gy-px(40), sag=18;
  ctx.strokeStyle=C.cable; ctx.lineWidth=px(0.8);
  ctx.beginPath(); ctx.moveTo(sx1,cy); ctx.bezierCurveTo(sx1+(sx2-sx1)/3,cy+sag,sx1+(sx2-sx1)*2/3,cy+sag,sx2,cy); ctx.stroke();
  const p = (t*0.0004)%1;
  const bx=(1-p)**3*sx1+3*(1-p)**2*p*(sx1+(sx2-sx1)/3)+3*(1-p)*p**2*(sx1+(sx2-sx1)*2/3)+p**3*sx2;
  const by2=(1-p)**3*cy+3*(1-p)**2*p*(cy+sag)+3*(1-p)*p**2*(cy+sag)+p**3*cy;
  ctx.shadowColor=color; ctx.shadowBlur=8; ctx.fillStyle=color;
  ctx.beginPath(); ctx.arc(bx,by2,px(1.5),0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  for (let i=1;i<=3;i++) {
    const tp=Math.max(0,p-i*0.04);
    const tx2=(1-tp)**3*sx1+3*(1-tp)**2*tp*(sx1+(sx2-sx1)/3)+3*(1-tp)*tp**2*(sx1+(sx2-sx1)*2/3)+tp**3*sx2;
    const ty2=(1-tp)**3*cy+3*(1-tp)**2*tp*(cy+sag)+3*(1-tp)*tp**2*(cy+sag)+tp**3*cy;
    const [r,g2,b2] = color==="#00D4FF"?[0,212,255]:[167,139,250];
    ctx.fillStyle=`rgba(${r},${g2},${b2},${0.3/i})`;
    ctx.beginPath(); ctx.arc(tx2,ty2,px(1),0,Math.PI*2); ctx.fill();
  }
}

// ─── Well ──────────────────────────────────────────────────────────────────────
function drawWell(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number) {
  const sx=wx*PX-camX;
  if (sx < -80 || sx > ctx.canvas.width+80) return;
  const gy=H*GROUND_Y, bw=px(12), bh=px(8), bx=sx-bw/2, by2=gy-bh;
  ctx.fillStyle=C.shadow; ctx.beginPath(); ctx.ellipse(sx,gy+px(1),px(9),px(2),0,0,Math.PI*2); ctx.fill();
  for (let i=0;i<3;i++) R(ctx,bx+i*px(0.3),by2+bh-px(3)+i*px(0.8),bw-i*px(0.6),px(1.2),i%2===0?C.stone1:C.stone2);
  R(ctx,bx,by2,bw,bh-px(2),C.stone2);
  for (let row=0;row<3;row++) for (let col=0;col<4;col++) {
    const off=row%2===0?0:px(1.5);
    R(ctx,bx+px(0.5)+col*px(3)+off,by2+px(0.5)+row*px(2.3),px(2.5),px(1.8),C.stone1);
  }
  R(ctx,bx-px(1),by2-px(8),px(2.5),px(16),C.trunk);
  R(ctx,bx+bw-px(1.5),by2-px(8),px(2.5),px(16),C.trunk);
  R(ctx,bx-px(2),by2-px(8),bw+px(4),px(2),C.trunk);
  ctx.fillStyle="#8B3A2A"; ctx.beginPath(); ctx.moveTo(bx-px(3),by2-px(8)); ctx.lineTo(sx,by2-px(16)); ctx.lineTo(bx+bw+px(3),by2-px(8)); ctx.fill();
  ctx.strokeStyle="#C8A850"; ctx.lineWidth=px(0.5);
  ctx.beginPath(); ctx.moveTo(sx,by2-px(6)); ctx.lineTo(sx,by2-px(1)); ctx.stroke();
  R(ctx,sx-px(2),by2-px(1),px(4),px(3),"#8B4513"); R(ctx,sx-px(2.5),by2-px(1),px(5),px(1),"#6B3410");
  R(ctx,bx+px(1),by2+bh-px(3.5),bw-px(2),px(1.5),C.waterDark);
  ctx.fillStyle=C.water; ctx.globalAlpha=0.5;
  ctx.beginPath(); ctx.ellipse(sx,by2+bh-px(2.5),bw/2-px(1),px(0.8),0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  R(ctx,sx-px(7),by2-px(8),px(14),px(4),C.sign);
  ctx.strokeStyle=C.signText; ctx.lineWidth=0.8; ctx.strokeRect(Math.round(sx-px(7)),Math.round(by2-px(8)),px(14),px(4));
  ctx.fillStyle=C.signText; ctx.font=`bold ${px(1.8)}px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("192.168.1.1", sx, by2-px(6));
}

// ─── Signpost ──────────────────────────────────────────────────────────────────
function drawSignpost(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number) {
  const sx=wx*PX-camX;
  if (sx < -80 || sx > ctx.canvas.width+80) return;
  const gy=H*GROUND_Y;
  R(ctx,sx-px(1),gy-px(22),px(2),px(22),C.trunk);
  const signs=[
    {text:"COMPÉTENCES",dist:"→ 600m",color:"#27AE60",dy:0},
    {text:"EXPÉRIENCES",dist:"→ 1.5km",color:"#2980B9",dy:px(7)},
    {text:"CERTIFS",dist:"→ 2.5km",color:"#8E44AD",dy:px(14)},
  ];
  for (const sg of signs) {
    const sy=gy-px(22)+sg.dy;
    R(ctx,sx,sy,px(20),px(5),sg.color);
    ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=1; ctx.strokeRect(Math.round(sx),Math.round(sy),px(20),px(5));
    ctx.fillStyle="#FFF"; ctx.font=`bold ${px(1.8)}px monospace`; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillText(sg.text,sx+px(1.5),sy+px(1.5));
    ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.font=`${px(1.5)}px monospace`;
    ctx.fillText(sg.dist,sx+px(1.5),sy+px(3.5));
  }
}

// ─── Sat dish ──────────────────────────────────────────────────────────────────
function drawSatDish(ctx: CanvasRenderingContext2D, sx: number, roofTopY: number, t: number) {
  const angle=Math.sin(t*0.0005)*0.15-0.4;
  ctx.save(); ctx.translate(sx+px(8),roofTopY+px(3)); ctx.rotate(angle);
  R(ctx,-px(0.5),0,px(1),px(5),"#888");
  ctx.fillStyle="#CCCCDD"; ctx.beginPath(); ctx.ellipse(0,-px(1),px(5),px(3),0,Math.PI,0); ctx.fill();
  ctx.strokeStyle="#AAAACC"; ctx.lineWidth=px(0.5); ctx.stroke();
  const sa=0.25+Math.sin(t*0.004)*0.15;
  for (let w=1;w<=3;w++) {
    ctx.strokeStyle=`rgba(0,212,255,${sa/w})`; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,-px(1),px(3+w*3),-Math.PI*0.8+angle*0.5,-Math.PI*0.2+angle*0.5); ctx.stroke();
  }
  ctx.restore();
}

// ─── Antenna ───────────────────────────────────────────────────────────────────
function drawAntenna(ctx: CanvasRenderingContext2D, sx: number, roofTopY: number, t: number) {
  R(ctx,sx-px(14),roofTopY,px(1.5),px(10),"#888898");
  R(ctx,sx-px(17),roofTopY+px(3),px(7),px(1),"#888898");
  R(ctx,sx-px(16),roofTopY+px(6),px(5),px(1),"#888898");
  const on=Math.floor(t/600)%2===0;
  ctx.fillStyle=on?"#FF4444":"#440000";
  if(on){ctx.shadowColor="#FF4444";ctx.shadowBlur=8;}
  ctx.beginPath(); ctx.arc(sx-px(14)+px(0.75),roofTopY-px(1),px(1.2),0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  const ra=0.12+Math.sin(t*0.003)*0.06;
  for (let r=1;r<=3;r++) {
    ctx.strokeStyle=`rgba(255,170,0,${ra/r})`; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(sx-px(14)+px(0.75),roofTopY-px(1),px(r*4),-Math.PI*0.75,-Math.PI*0.25); ctx.stroke();
  }
}

// ─── Shield ────────────────────────────────────────────────────────────────────
function drawShield(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, t: number) {
  const sx=wx*PX-camX;
  if (sx < -40 || sx > ctx.canvas.width+40) return;
  const gy=H*GROUND_Y;
  R(ctx,sx-px(0.8),gy-px(16),px(1.6),px(16),C.trunkDark);
  ctx.shadowColor="#27AE60"; ctx.shadowBlur=10+Math.sin(t*0.0025)*4;
  ctx.fillStyle="#1E8449";
  ctx.beginPath(); ctx.moveTo(sx,gy-px(25)); ctx.lineTo(sx-px(6),gy-px(20)); ctx.lineTo(sx-px(6),gy-px(15)); ctx.quadraticCurveTo(sx-px(6),gy-px(12),sx,gy-px(10)); ctx.quadraticCurveTo(sx+px(6),gy-px(12),sx+px(6),gy-px(15)); ctx.lineTo(sx+px(6),gy-px(20)); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle="#27AE60";
  ctx.beginPath(); ctx.moveTo(sx,gy-px(24)); ctx.lineTo(sx-px(5),gy-px(20)); ctx.lineTo(sx-px(5),gy-px(15)); ctx.quadraticCurveTo(sx-px(5),gy-px(13),sx,gy-px(11.5)); ctx.quadraticCurveTo(sx+px(5),gy-px(13),sx+px(5),gy-px(15)); ctx.lineTo(sx+px(5),gy-px(20)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle="#FFF"; ctx.lineWidth=px(1.5);
  ctx.beginPath(); ctx.moveTo(sx-px(2.5),gy-px(17)); ctx.lineTo(sx,gy-px(14)); ctx.lineTo(sx+px(3.5),gy-px(20)); ctx.stroke();
}

// ─── Trophy ────────────────────────────────────────────────────────────────────
function drawTrophy(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number, t: number) {
  const sx=wx*PX-camX;
  if (sx < -40 || sx > ctx.canvas.width+40) return;
  const gy=H*GROUND_Y;
  ctx.shadowColor="#FFD700"; ctx.shadowBlur=12+Math.sin(t*0.003)*6;
  R(ctx,sx-px(4),gy-px(3),px(8),px(3),"#8B6914"); R(ctx,sx-px(3),gy-px(5),px(6),px(2),"#A0781C"); R(ctx,sx-px(1.5),gy-px(10),px(3),px(5),"#C8A820");
  ctx.fillStyle="#FFD700"; ctx.beginPath(); ctx.moveTo(sx-px(6),gy-px(18)); ctx.lineTo(sx-px(7),gy-px(10)); ctx.lineTo(sx+px(7),gy-px(10)); ctx.lineTo(sx+px(6),gy-px(18)); ctx.quadraticCurveTo(sx,gy-px(22),sx-px(6),gy-px(18)); ctx.fill();
  for (const side of [-1,1] as (-1|1)[]) {
    ctx.strokeStyle="#FFD700"; ctx.lineWidth=px(1.5);
    ctx.beginPath(); ctx.arc(sx+side*px(7),gy-px(14),px(2.5),-Math.PI*0.5,Math.PI*0.5,side===-1); ctx.stroke();
  }
  ctx.fillStyle="#FFF8DC"; ctx.font=`${px(4)}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("★",sx,gy-px(15));
  ctx.shadowBlur=0;
}

// ─── Mailbox ───────────────────────────────────────────────────────────────────
function drawMailbox(ctx: CanvasRenderingContext2D, wx: number, camX: number, H: number) {
  const sx=wx*PX-camX;
  if (sx < -40 || sx > ctx.canvas.width+40) return;
  const gy=H*GROUND_Y;
  R(ctx,sx-px(1),gy-px(6),px(2),px(6),"#556677"); R(ctx,sx-px(5),gy-px(11),px(10),px(6),"#CC3333");
  ctx.fillStyle="#DD4444"; ctx.beginPath(); ctx.ellipse(sx,gy-px(11),px(5),px(2.5),0,Math.PI,0); ctx.fill();
  R(ctx,sx-px(3),gy-px(8),px(6),px(0.8),"#881111");
  ctx.strokeStyle="#888"; ctx.lineWidth=px(0.5); ctx.beginPath(); ctx.moveTo(sx+px(4.5),gy-px(11)); ctx.lineTo(sx+px(4.5),gy-px(14)); ctx.stroke();
  R(ctx,sx+px(4.5),gy-px(14),px(3.5),px(2),"#FF4444");
}

// ─── Secret zone bush cluster ───────────────────────────────────────────────────
function drawSecretZone(ctx: CanvasRenderingContext2D, camX: number, H: number, W: number, t: number, near: boolean) {
  const sx = SECRET_WX * PX - camX;
  if (sx < -100 || sx > W + 100) return;
  const gy = H * GROUND_Y;
  // Dense suspicious bush cluster
  for (const [dx, s] of [[-px(10),1.3],[0,1.8],[px(12),1.2],[-px(5),0.9],[px(6),1.0]] as [number,number][]) {
    const g = near ? 0.3+Math.sin(t*0.002+dx)*0.15 : 0;
    if (g > 0) { ctx.shadowColor="#00FF65"; ctx.shadowBlur=g*20; }
    ctx.fillStyle = near ? `rgba(0,255,100,${g*0.05})` : "transparent";
    for (const [ddx,ddy,r,col] of [
      [0,0,px(5*s),C.leafDark],[-px(5*s),-px(1),px(4*s),C.leaf],[px(5*s),-px(1),px(4*s),C.leafDark],[0,-px(4*s),px(3.5*s),"#5DBB3F"],
    ] as [number,number,number,string][]) {
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(sx+dx+ddx,gy-px(1)+ddy,r,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0;
  }
  // Hidden terminal peeking through (only when near)
  if (near) {
    const alpha = Math.min(1,(Math.abs(SECRET_WX-(camX/PX+W/(2*PX)))<60?0.9:0.4));
    ctx.globalAlpha = alpha;
    R(ctx,sx-px(5),gy-px(16),px(10),px(11),"#0A1A0A");
    R(ctx,sx-px(4.5),gy-px(15.5),px(9),px(10),"#000000");
    ctx.fillStyle="#FF4444"; ctx.font=`${px(2)}px monospace`; ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(">rm -rf /",sx,gy-px(15));
    ctx.fillStyle="#FF6666"; ctx.font=`${px(1.5)}px monospace`;
    ctx.fillText("ACCES INTERDIT",sx,gy-px(12));
    if (Math.floor(t/600)%2===0) { ctx.fillStyle="#FF4444"; ctx.fillText("█",sx,gy-px(9)); }
    ctx.globalAlpha=1;
    // floating prompt
    const fa=0.6+Math.sin(t*0.003)*0.2;
    ctx.fillStyle=`rgba(0,255,100,${fa})`;
    ctx.font=`bold ${px(2.5)}px "Press Start 2P",monospace`; ctx.textAlign="center";
    ctx.fillText("[ ENTRER ]",sx,gy-px(24));
  }
}

// ─── Building ──────────────────────────────────────────────────────────────────
function drawBuilding(ctx: CanvasRenderingContext2D, bld: typeof BUILDINGS[0], camX: number, H: number, W: number, highlight: boolean, t: number, tod: number) {
  const sx=bld.wx*PX-camX;
  if (sx < -500 || sx > W+500) return;
  const gy=H*GROUND_Y, bw=px(44), bh=px(34), bx=sx-bw/2, by=gy-bh;
  ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(sx,gy+px(1),bw*0.55,px(2.5),0,0,Math.PI*2); ctx.fill();
  R(ctx,bx-px(2),gy-px(2),bw+px(4),px(2),C.stone2); R(ctx,bx-px(1),gy-px(2.5),bw+px(2),px(0.8),C.stone3);
  const wallBase = tod>0.7 ? lerpRGB([245,222,179],[60,45,30],(tod-0.7)/0.3) : [245,222,179];
  R(ctx,bx,by,bw,bh,rgb(wallBase));
  ctx.fillStyle=`rgba(0,0,0,${tod>0.7?(tod-0.7)/0.3*0.3:0})`;
  ctx.fillRect(Math.round(bx),Math.round(by),bw,bh);
  ctx.fillStyle=C.wall2;
  for (let i=px(4);i<bh;i+=px(4.5)) ctx.fillRect(Math.round(bx),Math.round(by+i),bw,px(0.6));
  R(ctx,bx,by,px(2.5),bh,C.wall3); R(ctx,bx+bw-px(2.5),by,px(2.5),bh,C.wall3);
  // roof
  ctx.fillStyle=bld.roofColor;
  ctx.beginPath(); ctx.moveTo(bx-px(5),by); ctx.lineTo(sx,by-px(18)); ctx.lineTo(bx+bw+px(5),by); ctx.fill();
  for (let row=0;row<3;row++) {
    const ry=by-px(18)+row*px(5), rw2=px(10+row*6);
    ctx.fillStyle=bld.color;
    ctx.beginPath(); ctx.moveTo(sx-rw2,ry+px(5)); ctx.lineTo(sx,ry); ctx.lineTo(sx+rw2,ry+px(5)); ctx.fill();
  }
  // chimney + smoke
  R(ctx,sx-px(10),by-px(14),px(5),px(10),C.stone2); R(ctx,sx-px(11),by-px(14),px(7),px(1.5),C.stone1);
  for (let s=0;s<3;s++) {
    const prog=((t*0.0006+s*0.33)%1);
    const puffY=by-px(14)-prog*px(12), ps=px(2+prog*3);
    ctx.fillStyle=`rgba(200,200,210,${0.4-prog*0.38})`;
    ctx.beginPath(); ctx.arc(sx-px(7.5)+Math.sin(t*0.001+s)*px(2),puffY,ps,0,Math.PI*2); ctx.fill();
  }
  R(ctx,sx-px(1.5),by-px(19),px(3),px(2.5),C.wall3);
  // door
  const dw=px(9),dh=px(16),dx=sx-dw/2,dy=gy-dh;
  R(ctx,dx,dy,dw,dh,C.door); R(ctx,dx,dy,dw,dh/2,C.doorDark);
  ctx.strokeStyle=C.doorDark; ctx.lineWidth=px(0.8); ctx.strokeRect(Math.round(dx),Math.round(dy),dw,dh);
  R(ctx,dx+dw/2-px(0.5),dy,px(1),dh,C.doorDark); R(ctx,dx,dy+dh/2,dw,px(0.8),C.doorDark);
  ctx.fillStyle="#F4D03F"; ctx.beginPath(); ctx.arc(dx+dw*0.72,dy+dh*0.56,px(1.2),0,Math.PI*2); ctx.fill();
  ctx.fillStyle=bld.roofColor; ctx.beginPath(); ctx.arc(sx,dy,dw/2+px(1.5),Math.PI,0); ctx.fill();
  // windows
  for (const winX of [bx+px(5.5), bx+bw-px(5.5)-px(11)]) {
    const wy2=by+px(9),ww=px(11),wh=px(9);
    R(ctx,winX-px(0.5),wy2-px(0.5),ww+px(1),wh+px(1),C.wall3);
    const nightLit = tod > 0.65;
    ctx.fillStyle=nightLit ? `rgba(255,240,150,${0.7+Math.sin(t*0.002)*0.15})` : "#7BAFC8";
    ctx.fillRect(Math.round(winX),Math.round(wy2),ww,wh);
    if (!nightLit) {
      ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.beginPath(); ctx.moveTo(winX+px(1),wy2+px(0.5)); ctx.lineTo(winX+px(4),wy2+px(0.5)); ctx.lineTo(winX+px(1.5),wy2+px(3.5)); ctx.fill();
    }
    if (nightLit) {
      const gw=ctx.createRadialGradient(winX+ww/2,wy2+wh/2,0,winX+ww/2,wy2+wh/2,ww);
      gw.addColorStop(0,`rgba(255,230,100,${0.15+Math.sin(t*0.002)*0.05})`); gw.addColorStop(1,"rgba(255,200,0,0)");
      ctx.fillStyle=gw; ctx.beginPath(); ctx.arc(winX+ww/2,wy2+wh/2,ww,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle=C.wall3;
    ctx.fillRect(Math.round(winX+ww/2-px(0.5)),Math.round(wy2),px(1),wh);
    ctx.fillRect(Math.round(winX),Math.round(wy2+wh/2),ww,px(0.8));
    ctx.strokeStyle=C.wall3; ctx.lineWidth=px(0.5); ctx.strokeRect(Math.round(winX),Math.round(wy2),ww,wh);
  }
  // badge
  ctx.textAlign="center"; ctx.textBaseline="middle";
  const badges:{[k:string]:[string,string,string]}={
    skills:["#1E8449","#FFFFFF","FIREWALL"],
    xp:["#1A5276","#5DADE2","10.0.0.1/24"],
    certs:["#6C3483","#BB8FCE","CERTIFIED"],
    contact:["#1C6E28","#00FF88","● ONLINE"],
  };
  const badge=badges[bld.id];
  if (badge) { R(ctx,sx-px(9),by+px(22),px(18),px(6),badge[0]); ctx.fillStyle=badge[1]; ctx.font=`${px(2)}px monospace`; ctx.fillText(badge[2],sx,by+px(25)); }
  // sign
  const sw=px(28),sh=px(7.5),signX=sx-sw/2,signY=by+px(3.5);
  R(ctx,signX-px(0.5),signY-px(0.5),sw+px(1),sh+px(1),C.wall4); R(ctx,signX,signY,sw,sh,C.sign);
  ctx.fillStyle=C.signText; ctx.font=`bold ${px(3.5)}px "Press Start 2P",monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(bld.label.substring(0,11),sx,signY+sh/2);
  // highlight
  if (highlight) {
    ctx.strokeStyle=bld.color; ctx.lineWidth=2.5; ctx.shadowColor=bld.color; ctx.shadowBlur=18;
    ctx.strokeRect(Math.round(bx-3),Math.round(by-px(19)),bw+6,bh+px(19)+2); ctx.shadowBlur=0;
    ctx.fillStyle="rgba(0,0,0,0.8)"; ctx.beginPath(); ctx.roundRect(sx-52,by-px(24)-13,104,26,7); ctx.fill();
    ctx.strokeStyle=bld.color; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle="#FFF"; ctx.font=`bold ${px(2.5)}px "Press Start 2P",monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("[ ENTRER ]",sx,by-px(24));
  }
}

// ─── Character ─────────────────────────────────────────────────────────────────
function drawChar(ctx: CanvasRenderingContext2D, sx: number, gy: number, frame: number, dir: number) {
  const by=gy-CHAR_W*PX*(20/12), bx=sx-(CHAR_W/2)*PX, f=frame%4;
  const legSwing=dir!==0?[[0,0],[px(1.2),-px(1.2)],[0,0],[-px(1.2),-px(1.2)]][f]:[0,0];
  const armSwing=dir!==0?[-legSwing[0],legSwing[0]]:[0,0];
  ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(sx,gy,px(7),px(2),0,0,Math.PI*2); ctx.fill();
  R(ctx,bx+px(8.5),by+px(7),px(4),px(7),"#7B4F2E"); R(ctx,bx+px(9),by+px(8),px(3),px(5),"#8B5F3E"); R(ctx,bx+px(9.5),by+px(10.5),px(2),px(1.5),"#7B4F2E");
  R(ctx,bx+px(1)+legSwing[0],by+px(14),px(4),px(5),C.charPants); R(ctx,bx+px(7)-legSwing[0],by+px(14),px(4),px(5),C.charPants);
  R(ctx,bx+px(0.5)+legSwing[0],by+px(19),px(5),px(2),C.charShoes); R(ctx,bx+px(6.5)-legSwing[0],by+px(19),px(5),px(2),C.charShoes);
  R(ctx,bx+px(1),by+px(7),px(10),px(7),C.charShirt); R(ctx,bx+px(4),by+px(7),px(4),px(2),"#3A80C9");
  R(ctx,bx-px(1)+armSwing[0],by+px(7),px(2.5),px(6),C.charShirt); R(ctx,bx-px(0.5)+armSwing[0],by+px(13),px(2.5),px(2),C.charSkin);
  R(ctx,bx+px(10.5)+armSwing[1],by+px(7),px(2.5),px(6),C.charShirt); R(ctx,bx+px(11)+armSwing[1],by+px(13),px(2.5),px(2),C.charSkin);
  R(ctx,bx+px(2),by+px(1),px(8),px(7),C.charSkin);
  R(ctx,bx+px(1.5),by+px(3),px(1.5),px(2.5),C.charSkin);
  R(ctx,bx+px(2),by+px(1),px(8),px(2.5),C.charHair); R(ctx,bx+px(2),by+px(3),px(2.5),px(1.5),C.charHair);
  if(dir<0) R(ctx,bx+px(7.5),by+px(3),px(2.5),px(1.5),C.charHair);
  ctx.fillStyle="#2C1810";
  if(dir>=0){ctx.fillRect(Math.round(bx+px(4)),Math.round(by+px(3.5)),px(2),px(2));ctx.fillRect(Math.round(bx+px(7)),Math.round(by+px(3.5)),px(2),px(2));}
  else{ctx.fillRect(Math.round(bx+px(3)),Math.round(by+px(3.5)),px(2),px(2));ctx.fillRect(Math.round(bx+px(6)),Math.round(by+px(3.5)),px(2),px(2));}
  R(ctx,bx+px(4),by+px(6.2),px(4),px(0.8),"#C07070");
}

// ─── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, W: number, H: number, charWX: number, zone: string|null, progress: number, tod: number) {
  // Journey progress bar (bottom)
  const pbY=H-44, pbH=6, pbPad=14;
  const pbW=W-pbPad*2;
  // Background bar
  ctx.fillStyle="rgba(0,8,20,0.85)"; ctx.fillRect(0,H-50,W,50);
  ctx.strokeStyle=C.hudBorder; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,H-50); ctx.lineTo(W,H-50); ctx.stroke();
  // Track
  ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.fillRect(pbPad,pbY,pbW,pbH);
  // Building zone segments
  for (const bld of BUILDINGS) {
    const bx2=pbPad+(bld.wx/WORLD_W)*pbW;
    ctx.fillStyle=bld.color+"55"; ctx.fillRect(bx2-2,pbY,4,pbH);
    ctx.fillStyle=bld.color; ctx.font=`6px monospace`; ctx.textAlign="center"; ctx.textBaseline="bottom";
    ctx.fillText(bld.label.substring(0,3),bx2,pbY-2);
  }
  // Filled progress
  const filled=pbPad+progress*pbW;
  const pg=ctx.createLinearGradient(pbPad,0,filled,0);
  pg.addColorStop(0,"#00D4FF"); pg.addColorStop(0.5,"#A78BFA"); pg.addColorStop(1,"#F59E0B");
  ctx.fillStyle=pg; ctx.fillRect(pbPad,pbY,progress*pbW,pbH);
  // Player dot on bar
  ctx.fillStyle="#FFD700"; ctx.shadowColor="#FFD700"; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.arc(filled,pbY+pbH/2,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  // Percentage
  ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font=`6px "Press Start 2P",monospace`; ctx.textAlign="right";
  ctx.fillText(`${(progress*100)|0}%`,W-pbPad,pbY-2);
  // Hint text
  const hint=zone?"Cliquez ou [E] pour entrer":"← Molette / Flèches pour explorer →";
  ctx.fillStyle="#00D4FF"; ctx.font=`7px "Press Start 2P",monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(hint,W/2,H-24);
  ctx.fillStyle="#A78BFA"; ctx.textAlign="left"; ctx.fillText("JB.CHAGNAT",14,H-24);
  // Status LEDs
  for (const [i,ic,col] of [[0,"SSH","#00FF41"],[1,"FW","#00D4FF"],[2,"VPN","#A78BFA"]] as [number,string,string][]) {
    const ix=14+i*42;
    ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(ix,H-10,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font=`6px monospace`; ctx.textAlign="left";
    ctx.fillText(ic,ix+6,H-10+2);
  }
  // Zone name right
  if (zone) {
    const bld=BUILDINGS.find(b=>b.id===zone)||(zone==='secret'?{color:"#FF4444",label:"Zone Secrète"}:null);
    if (bld) { ctx.fillStyle=bld.color; ctx.textAlign="right"; ctx.font=`7px "Press Start 2P",monospace`; ctx.fillText(`▶ ${bld.label}`,W-14,H-24); }
  }
  // Mini-map top-right
  const mw=200,mh=44,mx2=W-mw-12,my=12;
  ctx.fillStyle="rgba(0,8,20,0.82)"; ctx.fillRect(mx2,my,mw,mh);
  ctx.strokeStyle=C.hudBorder; ctx.lineWidth=1.5; ctx.strokeRect(mx2,my,mw,mh);
  ctx.strokeStyle="rgba(0,212,255,0.07)"; ctx.lineWidth=0.5;
  for (let gx=mx2+40;gx<mx2+mw;gx+=40) { ctx.beginPath(); ctx.moveTo(gx,my); ctx.lineTo(gx,my+mh); ctx.stroke(); }
  for (const bld of BUILDINGS) {
    const bx2=mx2+(bld.wx/WORLD_W)*mw;
    ctx.fillStyle=bld.color; ctx.fillRect(Math.round(bx2-4),my+6,8,mh-12);
  }
  // Secret zone marker
  const smx=mx2+(SECRET_WX/WORLD_W)*mw;
  ctx.fillStyle="#FF4444"; ctx.fillRect(Math.round(smx-3),my+8,6,mh-16);
  // Player dot
  const pdx=mx2+(charWX/WORLD_W)*mw;
  ctx.fillStyle="#FFD700"; ctx.shadowColor="#FFD700"; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.arc(pdx,my+mh/2,4.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle=C.hudBorder; ctx.font=`7px "Press Start 2P",monospace`; ctx.textAlign="left"; ctx.textBaseline="top";
  ctx.fillText("CARTE",mx2+4,my+4);
  // TOD icon
  const todLabel=tod<0.15?"🌅":tod<0.55?"☀️":tod<0.7?"🌇":tod<0.85?"🌆":"🌙";
  ctx.font="14px serif"; ctx.textAlign="right"; ctx.textBaseline="top";
  ctx.fillText(todLabel,mx2+mw-4,my+2);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PixelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    charWX: 60, targetCharWX: 60, camX: 0, frame: 0,
    animFrame: 0, lastTime: 0, dir: 1,
    scrollProgress: 0, touchStartY: 0,
    transitionAlpha: 0,
    transitionPhase: "none" as "none"|"in"|"hold"|"out",
    pendingPanel: null as string|null,
    // Enter-building animation
    enteringBuilding: null as string|null,
    enterPhase: 0 as 0|1,   // 0 = walking to door, 1 = shrinking into door
    enterProgress: 0,        // 0 → 1 during phase 1
  });
  const [activeZone, setActiveZone] = useState<string|null>(null);
  const [openPanel, setOpenPanel] = useState<string|null>(null);
  const activeZoneRef = useRef<string|null>(null);
  const openPanelRef = useRef<string|null>(null);

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W=canvas.width, H=canvas.height, s=stateRef.current;
    const dt=Math.min(time-s.lastTime,50); s.lastTime=time;

    // Transition
    if (s.transitionPhase==="in") {
      s.transitionAlpha=Math.min(0.78,s.transitionAlpha+dt*0.005);
      if (s.transitionAlpha>=0.77 && !openPanelRef.current) {
        openPanelRef.current=s.pendingPanel; setOpenPanel(s.pendingPanel); s.transitionPhase="hold";
      }
    } else if (s.transitionPhase==="hold") {
      s.transitionAlpha=0.78;
    } else if (s.transitionPhase==="out") {
      s.transitionAlpha=Math.max(0,s.transitionAlpha-dt*0.004);
      if (s.transitionAlpha<=0) s.transitionPhase="none";
    }

    // ── Enter-building animation phase 1 (shrinking into door) ──────────────
    if (s.enterPhase===1) {
      s.enterProgress=Math.min(1,s.enterProgress+dt*0.0022);
      s.dir=1; s.frame+=dt*0.014;   // walk anim continues while shrinking
      if (s.enterProgress>=1) {
        // kick off fade-to-black → open panel
        s.transitionPhase="in";
        s.pendingPanel=s.enteringBuilding;
        s.enteringBuilding=null; s.enterPhase=0; s.enterProgress=0;
      }
    } else {
      // Normal movement
      if (s.enterPhase===0 && s.enteringBuilding) {
        // Phase 0: walk character toward the building door
        const bld=ALL_ZONES.find(b=>b.id===s.enteringBuilding);
        if (bld) {
          s.targetCharWX=bld.wx;
          // Snap scrollProgress so camera follows
          s.scrollProgress=(bld.wx-60)/(WORLD_W-120);
          if (Math.abs(s.charWX-bld.wx)<6) {
            s.charWX=bld.wx;
            s.enterPhase=1; s.enterProgress=0;
          }
        }
      } else {
        s.targetCharWX=60+s.scrollProgress*(WORLD_W-120);
      }
      const diff=s.targetCharWX-s.charWX;
      if (Math.abs(diff)>0.4) { s.dir=diff>0?1:-1; s.charWX+=diff*Math.min(dt*0.008,0.3); s.frame+=Math.abs(diff)*0.028; }
      else s.dir=0;
    }
    const charSX=s.charWX*PX;
    const targetCamX=charSX-W/2+(CHAR_W/2)*PX;
    s.camX+=(targetCamX-s.camX)*Math.min(dt*0.01,0.25);
    s.camX=Math.max(0,Math.min(WORLD_W*PX-W,s.camX));

    // Zone detection
    let zone:string|null=null;
    for (const bld of BUILDINGS) { if (Math.abs(s.charWX-bld.wx)<90) { zone=bld.id; break; } }
    if (!zone && Math.abs(s.charWX-SECRET_WX)<55) zone="secret";
    if (zone!==activeZoneRef.current) { activeZoneRef.current=zone; setActiveZone(zone); }

    // TOD
    const tod=getTOD(s.scrollProgress);

    // ── Draw world (always visible, dimmed by transition overlay)
    {
      drawSky(ctx,W,H,s.camX,time,tod);
      drawBirds(ctx,W,H,s.camX,time,tod);
      drawClouds(ctx,W,H,s.camX,time,tod);
      drawGround(ctx,W,H,s.camX,tod);
      drawRiver(ctx,s.camX,H,W,time,tod);
      drawBridge(ctx,s.camX,H);
      drawRocks(ctx,s.camX,H,W);
      drawFlowers(ctx,s.camX,H,W);

      drawFence(ctx,100,500,s.camX,H); drawFence(ctx,900,1420,s.camX,H);
      drawFence(ctx,1800,2200,s.camX,H); drawFence(ctx,2800,3150,s.camX,H);

      for (const wx of [130,300,460,540,890,1050,1220,1400,1780,1940,2150,2300,2720,2900,3200,3600,3780,4000]) drawTree(ctx,wx,s.camX,H,tod);
      for (const wx of [200,410,970,1340,1870,2050,2600,3100,3700,4080]) drawPine(ctx,wx,s.camX,H,tod);
      for (const [wx,large] of [[250,false],[550,true],[780,false],[1130,true],[1460,false],[1700,true],[2080,false],[2400,false],[2660,true],[3050,false],[3400,true],[3870,false]] as [number,boolean][]) drawBush(ctx,wx,s.camX,H,large,false,time);

      drawSignpost(ctx,150,s.camX,H);
      for (const wx of [320,620,1000,1280,1700,2000,2300,2780,3080,3500,3900]) drawLamp(ctx,wx,s.camX,H,time,tod);
      drawWell(ctx,2050,s.camX,H);
      for (const wx of [830,1720,2600]) drawServerRack(ctx,wx,s.camX,H,time);
      for (const wx of [590,1380,2270,3210]) drawTerminal(ctx,wx,s.camX,H,time);
      drawCable(ctx,BUILDINGS[0].wx,BUILDINGS[1].wx,s.camX,H,time,"#00D4FF");
      drawCable(ctx,BUILDINGS[1].wx,BUILDINGS[2].wx,s.camX,H,time*1.3,"#A78BFA");
      drawCable(ctx,BUILDINGS[2].wx,BUILDINGS[3].wx,s.camX,H,time*0.8,"#F59E0B");
      drawShield(ctx,560,s.camX,H,time);
      drawTrophy(ctx,1430,s.camX,H,time);
      drawMailbox(ctx,3460,s.camX,H);

      // Secret zone
      const nearSecret=Math.abs(s.charWX-SECRET_WX)<70;
      drawSecretZone(ctx,s.camX,H,W,time,nearSecret);

      for (const bld of BUILDINGS) drawBuilding(ctx,bld,s.camX,H,W,bld.id===activeZoneRef.current&&!openPanelRef.current&&s.transitionPhase==="none",time,tod);

      // Roof extras
      const gy=H*GROUND_Y, bh=px(34);
      for (const [bld,fn] of [[BUILDINGS[0],drawSatDish],[BUILDINGS[2],drawSatDish]] as [typeof BUILDINGS[0],(ctx:CanvasRenderingContext2D,sx:number,y:number,t:number)=>void][]) {
        const bsx=bld.wx*PX-s.camX;
        if (Math.abs(bsx)<W+200) fn(ctx,bsx,gy-bh-px(18),time);
      }
      const csx=BUILDINGS[3].wx*PX-s.camX;
      if (Math.abs(csx)<W+200) drawAntenna(ctx,csx,gy-bh-px(18),time);

      if (s.enterPhase===1 && s.enteringBuilding===null) {
        // phase just ended, skip — fade overlay takes over
      } else if (s.enterPhase===1) {
        // Shrink + fade into the door
        const enterBld=ALL_ZONES.find(b=>b.id===s.enteringBuilding)||ALL_ZONES[0];
        const p=s.enterProgress;
        const doorScreenX=enterBld.wx*PX-s.camX;
        // feet move up toward door opening
        const feetY=H*GROUND_Y*(1-p*0.06);
        const scale=Math.max(0.05,1-p*0.85);
        ctx.save();
        ctx.globalAlpha=Math.max(0,1-p*1.15);
        ctx.translate(doorScreenX,feetY);
        ctx.scale(scale,scale);
        drawChar(ctx,0,0,Math.floor(s.frame),1);
        ctx.restore();
      } else {
        drawChar(ctx,s.charWX*PX-s.camX,H*GROUND_Y,Math.floor(s.frame),s.dir);
      }

      // Night ambient overlay
      if (tod>0.5) {
        const n=Math.min(1,(tod-0.5)/0.5);
        ctx.fillStyle=`rgba(5,8,35,${n*0.62})`; ctx.fillRect(0,0,W,H);
      }
      // Sunset warm overlay
      if (tod>0.45&&tod<0.75) {
        const sv=Math.sin((tod-0.45)/0.3*Math.PI);
        ctx.fillStyle=`rgba(200,75,15,${sv*0.14})`; ctx.fillRect(0,0,W,H);
      }
    }

    drawHUD(ctx,W,H,s.charWX,activeZoneRef.current,s.scrollProgress,tod);

    // Transition overlay
    if (s.transitionAlpha>0) {
      ctx.fillStyle=`rgba(0,0,0,${s.transitionAlpha})`; ctx.fillRect(0,0,W,H);
    }

    s.animFrame=requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    const canvas=canvasRef.current; if (!canvas) return;
    const resize=()=>{ canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    stateRef.current.lastTime=performance.now();
    stateRef.current.animFrame=requestAnimationFrame(loop);

    const isLocked=()=> !!(openPanelRef.current || stateRef.current.enteringBuilding);

    const onWheel=(e:WheelEvent)=>{
      if (isLocked()) return;
      e.preventDefault();
      stateRef.current.scrollProgress=Math.max(0,Math.min(1,stateRef.current.scrollProgress+e.deltaY*0.00015));
    };
    window.addEventListener("wheel",onWheel,{passive:false});

    const onTouchStart=(e:TouchEvent)=>{ stateRef.current.touchStartY=e.touches[0].clientY; };
    const onTouchMove=(e:TouchEvent)=>{
      if (isLocked()) return; e.preventDefault();
      const dy=stateRef.current.touchStartY-e.touches[0].clientY;
      stateRef.current.touchStartY=e.touches[0].clientY;
      stateRef.current.scrollProgress=Math.max(0,Math.min(1,stateRef.current.scrollProgress+dy*0.0008));
    };
    window.addEventListener("touchstart",onTouchStart,{passive:true});
    window.addEventListener("touchmove",onTouchMove,{passive:false});

    const onKey=(e:KeyboardEvent)=>{
      const s=stateRef.current;
      // Movement only when not locked
      if (!isLocked()) {
        if (e.key==="ArrowRight"||e.key==="d"||e.key==="D") s.scrollProgress=Math.min(1,s.scrollProgress+0.015);
        if (e.key==="ArrowLeft"||e.key==="a"||e.key==="A") s.scrollProgress=Math.max(0,s.scrollProgress-0.015);
      }
      if ((e.key==="e"||e.key==="E") && s.transitionPhase==="none" && !s.enteringBuilding) {
        if (activeZoneRef.current && !openPanelRef.current) {
          // Trigger walk-in animation
          s.enteringBuilding=activeZoneRef.current; s.enterPhase=0; s.enterProgress=0;
        } else if (openPanelRef.current) {
          openPanelRef.current=null; setOpenPanel(null); s.transitionPhase="out";
        }
      }
      if (e.key==="Escape"&&openPanelRef.current) { openPanelRef.current=null; setOpenPanel(null); s.transitionPhase="out"; }
    };
    window.addEventListener("keydown",onKey);

    return ()=>{
      window.removeEventListener("resize",resize);
      window.removeEventListener("wheel",onWheel);
      window.removeEventListener("touchstart",onTouchStart);
      window.removeEventListener("touchmove",onTouchMove);
      window.removeEventListener("keydown",onKey);
      cancelAnimationFrame(stateRef.current.animFrame);
    };
  },[loop]);

  const handleCanvasClick=()=>{
    const s=stateRef.current;
    if (activeZoneRef.current && !openPanelRef.current && s.transitionPhase==="none" && !s.enteringBuilding) {
      // Trigger walk-in animation
      s.enteringBuilding=activeZoneRef.current; s.enterPhase=0; s.enterProgress=0;
    }
  };
  const closePanel=()=>{
    openPanelRef.current=null; setOpenPanel(null); stateRef.current.transitionPhase="out";
  };

  const activeBld=BUILDINGS.find(b=>b.id===openPanel);
  const activeBldColor=openPanel==="secret"?"#FF4444":activeBld?.color??"#00D4FF";
  const content=openPanel?CV[openPanel]:null;

  return (
    <div className="relative w-full" style={{height:"100vh",overflow:"hidden"}}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-pointer z-20"
              style={{imageRendering:"pixelated"}} onClick={handleCanvasClick}/>

      {openPanel&&content&&(
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-4 px-4" style={{pointerEvents:"auto"}}>
          <div className="absolute inset-0" onClick={closePanel}/>
          <div className="relative w-full max-w-3xl max-h-[72vh] flex flex-col" style={{
            background:[
              `repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.018) 2px,rgba(255,255,255,0.018) 3px)`,
              `radial-gradient(ellipse at top left,${activeBldColor}0D 0%,transparent 60%)`,
              `linear-gradient(160deg,#06091A 0%,#04080F 100%)`,
            ].join(","),
            border:`2px solid ${activeBldColor}`,
            borderLeft:`3px solid ${activeBldColor}`,
            borderRadius:6,
            boxShadow:`0 0 40px ${activeBldColor}55,0 0 80px ${activeBldColor}20`,
          }}>
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{borderColor:activeBldColor+"44"}}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{content.icon}</span>
                <span className="font-bold" style={{fontFamily:'"Press Start 2P",monospace',fontSize:11,color:activeBldColor}}>{content.title}</span>
              </div>
              <button onClick={closePanel} className="text-gray-400 hover:text-white transition-colors"
                      style={{fontFamily:'"Press Start 2P",monospace',fontSize:8}}>[ESC]</button>
            </div>
            <div className="overflow-y-auto p-4 flex-1" style={{scrollbarWidth:"thin",scrollbarColor:`${activeBldColor} transparent`}}>
              {content.content}
            </div>
            {(["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"] as const).map((pos,i)=>(
              <div key={i} className={`absolute ${pos} w-3 h-3`} style={{
                borderTop:i<2?`2px solid ${activeBldColor}`:undefined,
                borderBottom:i>=2?`2px solid ${activeBldColor}`:undefined,
                borderLeft:i%2===0?`2px solid ${activeBldColor}`:undefined,
                borderRight:i%2===1?`2px solid ${activeBldColor}`:undefined,
              }}/>
            ))}
          </div>
        </div>
      )}

      {!openPanel&&(
        <div className="absolute bottom-14 right-4 z-30 flex flex-col items-center gap-1 pointer-events-none" style={{opacity:0.5}}>
          <span style={{fontFamily:'"Press Start 2P",monospace',fontSize:7,color:"#fff"}}>SCROLL</span>
          <span style={{fontSize:18,color:"#fff"}}>↕</span>
        </div>
      )}
    </div>
  );
}
