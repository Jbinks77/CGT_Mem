"""
cmdmem SSH — Client SSH multi-onglets avec capture automatique des commandes
Raccourcis : Ctrl+T = nouvel onglet | Ctrl+W = fermer | Ctrl+Tab = suivant
             Ctrl+L = effacer | Ctrl+C = copier/SIGINT
"""
import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox, filedialog
import paramiko
import threading
import requests
import json
import re
import os
import socket

# ── Config ────────────────────────────────────────────────────────────────────
CMDMEM_URL   = os.environ.get("CMDMEM_URL", "http://46.225.130.235:8000")
CONFIG_DIR   = os.path.join(os.path.expanduser("~"), ".cmdmem")
SESSIONS_FILE = os.path.join(CONFIG_DIR, "sessions.json")
os.makedirs(CONFIG_DIR, exist_ok=True)

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# ── Palette ───────────────────────────────────────────────────────────────────
BG       = "#06060c"
SURF     = "#0d0d18"
SURF2    = "#13131f"
SURF3    = "#1a1a28"
BORDER   = "#1e1e30"
BORDER2  = "#252538"
ACCENT   = "#6c63ff"
ACCENT2  = "#a78bfa"
ACCENTHV = "#5a51e8"
TEXT     = "#e8e8f4"
MUTED    = "#52526a"
GREEN    = "#10b981"
RED      = "#f43f5e"

ANSI_RE  = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
CTRL_RE  = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')

def clean_output(text):
    text = ANSI_RE.sub("", text)
    text = text.replace("\r\n", "\n").replace("\r", "")
    text = CTRL_RE.sub("", text)
    return text

FONT_MONO = ("Consolas", 10)
FONT_UI   = ("Segoe UI", 10)
FONT_SM   = ("Segoe UI", 9)

# ── Sessions persistence ──────────────────────────────────────────────────────
def load_sessions():
    try:
        with open(SESSIONS_FILE) as f:
            return json.load(f)
    except Exception:
        return {"groups": [{"name": "Sessions", "sessions": []}]}

def persist(data):
    with open(SESSIONS_FILE, "w") as f:
        json.dump(data, f, indent=2)

# ── Connection dialog ─────────────────────────────────────────────────────────
class ConnDialog(ctk.CTkToplevel):
    def __init__(self, parent, session=None, on_connect=None, on_save=None):
        super().__init__(parent)
        self.on_connect = on_connect
        self.on_save    = on_save
        self.title("Connexion SSH")
        self.geometry("420x520")
        self.resizable(False, False)
        self.configure(fg_color=SURF)
        self.grab_set()
        self.focus()
        # Centre
        self.update_idletasks()
        px = parent.winfo_x() + parent.winfo_width()  // 2 - 210
        py = parent.winfo_y() + parent.winfo_height() // 2 - 260
        self.geometry(f"+{px}+{py}")
        self._build(session or {})

    def _build(self, s):
        hdr = ctk.CTkFrame(self, fg_color=SURF2, corner_radius=0)
        hdr.pack(fill="x")
        ctk.CTkLabel(hdr, text="Nouvelle connexion SSH",
                     font=("Segoe UI", 13, "bold"),
                     text_color=ACCENT2).pack(padx=20, pady=14, anchor="w")

        form = ctk.CTkScrollableFrame(self, fg_color=SURF, label_text="")
        form.pack(fill="both", expand=True)

        self.v = {}
        for label, key, default, pw in [
            ("Nom de la session", "name",     s.get("name", ""),     False),
            ("Hôte / IP",         "host",     s.get("host", ""),     False),
            ("Port",              "port",     s.get("port", "22"),   False),
            ("Utilisateur",       "user",     s.get("user", ""),     False),
            ("Mot de passe",      "password", s.get("password", ""), True),
        ]:
            ctk.CTkLabel(form, text=label, font=FONT_SM, text_color=MUTED
                         ).pack(padx=20, pady=(12, 2), anchor="w")
            var = ctk.StringVar(value=default)
            self.v[key] = var
            ctk.CTkEntry(form, textvariable=var, show="●" if pw else "",
                         fg_color=SURF3, border_color=BORDER2,
                         text_color=TEXT, font=FONT_UI, height=36
                         ).pack(fill="x", padx=20)

        # Clé SSH
        ctk.CTkLabel(form, text="Clé SSH (optionnel)", font=FONT_SM,
                     text_color=MUTED).pack(padx=20, pady=(12, 2), anchor="w")
        kf = ctk.CTkFrame(form, fg_color="transparent")
        kf.pack(fill="x", padx=20)
        self.v["keyfile"] = ctk.StringVar(value=s.get("keyfile", ""))
        ctk.CTkEntry(kf, textvariable=self.v["keyfile"],
                     fg_color=SURF3, border_color=BORDER2,
                     text_color=TEXT, font=FONT_UI, height=36,
                     placeholder_text="Chemin vers la clé privée..."
                     ).pack(side="left", fill="x", expand=True)
        ctk.CTkButton(kf, text="…", width=36, height=36,
                      fg_color=SURF3, hover_color=BORDER2,
                      command=self._browse).pack(side="right", padx=(4, 0))

        # Groupe
        ctk.CTkLabel(form, text="Groupe", font=FONT_SM, text_color=MUTED
                     ).pack(padx=20, pady=(12, 2), anchor="w")
        self.v["group"] = ctk.StringVar(value=s.get("group", "Sessions"))
        ctk.CTkEntry(form, textvariable=self.v["group"],
                     fg_color=SURF3, border_color=BORDER2,
                     text_color=TEXT, font=FONT_UI, height=36
                     ).pack(fill="x", padx=20)

        # Boutons
        btns = ctk.CTkFrame(self, fg_color=SURF2, corner_radius=0)
        btns.pack(fill="x", side="bottom")
        ctk.CTkButton(btns, text="Annuler", fg_color=SURF3,
                      hover_color=BORDER2, text_color=MUTED, width=100,
                      command=self.destroy).pack(side="right", padx=(8, 16), pady=12)
        if self.on_connect:
            ctk.CTkButton(btns, text="Connecter",
                          fg_color=ACCENT, hover_color=ACCENTHV,
                          width=120, command=self._connect
                          ).pack(side="right", padx=4, pady=12)
        ctk.CTkButton(btns, text="Sauvegarder",
                      fg_color=SURF3, hover_color=BORDER2,
                      text_color=TEXT, width=120,
                      command=self._save).pack(side="right", padx=4, pady=12)

    def _browse(self):
        p = filedialog.askopenfilename(title="Clé SSH privée")
        if p:
            self.v["keyfile"].set(p)

    def _data(self):
        return {k: v.get() for k, v in self.v.items()}

    def _connect(self):
        d = self._data()
        if not d["host"] or not d["user"]:
            messagebox.showerror("Erreur", "Hôte et utilisateur requis.", parent=self)
            return
        if self.on_connect:
            self.on_connect(d)
        self.destroy()

    def _save(self):
        if self.on_save:
            self.on_save(self._data())
        self.destroy()

# ── SSH Tab (terminal individuel) ─────────────────────────────────────────────
class SSHTab(ctk.CTkFrame):
    def __init__(self, parent, session=None, on_title=None, on_sync=None):
        super().__init__(parent, fg_color=BG, corner_radius=0)
        self.session   = session or {}
        self.on_title  = on_title
        self.on_sync   = on_sync
        self.ssh            = None
        self.channel        = None
        self.reading        = False
        self.connected      = False
        self.history        = []
        self.hist_idx       = 0
        self._tab_pending = False
        self._tab_base    = ""
        self._tab_sent    = ""
        self._tab_accum   = ""
        self._server_buf  = ""
        self._cmd_seen    = {}   # base_cmd → set(full_commands) pour déduplication
        self._build()
        if self.session.get("host"):
            self.after(150, self._auto_connect)

    # ── Build UI ──────────────────────────────────────────────────────────────
    def _build(self):
        # Terminal output
        self.out = tk.Text(self,
                           bg="#07070f", fg="#d4d4e0",
                           font=FONT_MONO,
                           insertbackground=ACCENT2,
                           selectbackground="#2d2b55",
                           selectforeground=TEXT,
                           relief="flat", borderwidth=0,
                           wrap="word", state="disabled",
                           padx=14, pady=10, spacing1=1)
        self.out.pack(fill="both", expand=True)
        self.out.tag_config("err",  foreground=RED)
        self.out.tag_config("ok",   foreground=GREEN)
        self.out.tag_config("info", foreground=ACCENT2)
        self.out.tag_config("dim",  foreground=MUTED)
        self.out.bind("<Control-c>", self._copy)
        self.out.bind("<Control-l>", lambda e: self.clear())

        # Input bar
        bar = ctk.CTkFrame(self, fg_color=SURF2, height=44, corner_radius=0)
        bar.pack(fill="x", side="bottom")
        bar.pack_propagate(False)

        self.prompt = ctk.CTkLabel(bar, text="›",
                                   font=("Segoe UI", 18, "bold"),
                                   text_color=MUTED, width=24)
        self.prompt.pack(side="left", padx=(10, 2))

        self.ivar = ctk.StringVar()
        self.inp  = ctk.CTkEntry(bar, textvariable=self.ivar,
                                  fg_color="transparent", border_width=0,
                                  text_color=TEXT, font=FONT_MONO,
                                  placeholder_text="Non connecté…",
                                  placeholder_text_color=MUTED)
        self.inp.pack(side="left", fill="x", expand=True, pady=6)
        self.inp.bind("<Return>",    self._send)
        self.inp.bind("<Up>",        self._hist_up)
        self.inp.bind("<Down>",      self._hist_down)
        self.inp.bind("<Tab>",       self._tab_complete)
        self.inp.bind("<Control-c>", self._sigint)
        self.inp.bind("<Control-l>", lambda e: self.clear())
        self.inp.configure(state="disabled")

    # ── Connect ───────────────────────────────────────────────────────────────
    def _auto_connect(self):
        self.connect(self.session)

    def connect(self, session):
        self.session = session
        host = session.get("host", "").strip()
        port = int(session.get("port") or 22)
        user = session.get("user", "").strip()
        pw   = session.get("password", "")
        key  = session.get("keyfile", "")

        if self.on_title:
            self.on_title(f"{user}@{host}")

        self._write(f"\n  Connexion à {user}@{host}:{port}…\n", "info")

        def run():
            try:
                c = paramiko.SSHClient()
                c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                kw = dict(timeout=15, banner_timeout=20,
                          allow_agent=True, look_for_keys=True)
                if key and os.path.exists(key):
                    kw["key_filename"] = key
                if pw:
                    kw["password"] = pw
                c.connect(host, port=port, username=user, **kw)
                ch = c.invoke_shell(term="vt100", width=200, height=50)
                ch.settimeout(0.5)
                self.ssh = c; self.channel = ch
                self.reading = True; self.connected = True
                self.after(0, lambda: self._on_connected(user, host))
                threading.Thread(target=self._reader, daemon=True).start()
            except Exception as e:
                msg = str(e)
                self.after(0, lambda: self._write(f"\n  ✗ {msg}\n", "err"))

        threading.Thread(target=run, daemon=True).start()

    def _on_connected(self, user, host):
        self.prompt.configure(text_color=ACCENT2)
        self.inp.configure(state="normal", placeholder_text="Commande…")
        self.inp.focus()
        self._write(f"\n  ✓ Connecté à {user}@{host}\n\n", "ok")

    def disconnect(self):
        self.reading = False; self.connected = False
        for x in [self.channel, self.ssh]:
            try: x and x.close()
            except: pass
        self.channel = self.ssh = None
        self.prompt.configure(text_color=MUTED)
        self.inp.configure(state="disabled", placeholder_text="Non connecté…")
        self._write("\n  Session fermée.\n", "dim")

    def _reader(self):
        while self.reading and self.channel and not self.channel.closed:
            try:
                data = self.channel.recv(8192)
                if data:
                    raw = data.decode("utf-8", errors="replace")
                    if self._tab_pending:
                        self._tab_accum += raw
                    t = clean_output(raw)
                    self.after(0, lambda x=t: self._write(x))
            except socket.timeout:
                continue
            except: break
        if self.reading:
            self.after(0, self.disconnect)

    # ── Input handlers ────────────────────────────────────────────────────────
    def _send(self, _=None):
        if not self.channel or self.channel.closed: return
        cmd = self.ivar.get()
        # Efface le buffer serveur avec des backspaces, puis envoie la commande
        clear = "\x08" * len(self._server_buf)
        diff  = cmd[len(self._server_buf):] if cmd.startswith(self._server_buf) else cmd
        to_send = (clear if not cmd.startswith(self._server_buf) else "") + diff
        self.channel.send(to_send + "\n")
        self._server_buf = ""
        self.ivar.set("")
        if cmd.strip():
            self.history.append(cmd)
            self.hist_idx = len(self.history)
            if self._should_send(cmd):
                h = self.session.get("host", "")
                u = self.session.get("user", "")
                threading.Thread(target=self._push, args=(cmd, h, u), daemon=True).start()

    def _tab_complete(self, _=None):
        if not self.channel or self.channel.closed:
            return "break"
        current = self.ivar.get()
        self._tab_base    = current
        self._tab_accum   = ""
        self._tab_pending = True
        if current.startswith(self._server_buf):
            to_send = current[len(self._server_buf):]   # diff seulement
        else:
            # Désynchronisé : backspaces pour effacer, puis texte complet
            to_send = "\x08" * len(self._server_buf) + current
        self._server_buf = current
        self._tab_sent   = to_send   # mémorise ce qu'on envoie (sans \t)
        self.channel.send(to_send + "\t")
        self.after(800, self._apply_tab)
        return "break"

    def _apply_tab(self):
        self._tab_pending = False
        raw   = self._tab_accum
        clean = clean_output(raw)

        if not clean.strip():
            return

        # Supprimer l'écho du texte envoyé (le PTY réécho ce qu'on a tapé)
        sent = self._tab_sent.lstrip("\x08")
        if sent and clean.startswith(sent):
            clean = clean[len(sent):]

        has_newline = "\n" in clean

        # ── Cas 1 : complétion unique — pas de saut de ligne ──
        if not has_newline and clean.strip():
            suffix = clean.strip()
            # Rejeter si ça ressemble à un prompt ou une commande complète
            if not any(c in suffix for c in ["#", "$", "%", "\n"]):
                completed = self._tab_base + suffix
                self.ivar.set(completed)
                self._server_buf = completed
                self.inp.icursor("end")
                return

        # ── Cas 2 : cherche une ligne commençant par notre base ──
        # (réaffichage complet ou plusieurs complétions)
        lines = [l.strip() for l in clean.split("\n") if l.strip()]
        for line in reversed(lines):
            if line.startswith(self._tab_base) and line != self._tab_base:
                self.ivar.set(line)
                self._server_buf = line
                self.inp.icursor("end")
                return

        # ── Cas 3 : le clean contient le _tab_base en entier (redraw ligne) ──
        idx = clean.rfind(self._tab_base)
        if idx != -1:
            rest = clean[idx + len(self._tab_base):].split("\n")[0].split()[0] if clean[idx + len(self._tab_base):].strip() else ""
            if rest:
                completed = self._tab_base + rest
                self.ivar.set(completed)
                self._server_buf = completed
                self.inp.icursor("end")
                return

        # Plusieurs options affichées → serveur garde le texte original
        self._server_buf = self._tab_base

    def _sigint(self, _=None):
        if self.channel and not self.channel.closed:
            self.channel.send("\x03")
        return "break"

    def _hist_up(self, _=None):
        if self.hist_idx > 0:
            self.hist_idx -= 1
            self.ivar.set(self.history[self.hist_idx])
        return "break"

    def _hist_down(self, _=None):
        if self.hist_idx < len(self.history) - 1:
            self.hist_idx += 1
            self.ivar.set(self.history[self.hist_idx])
        else:
            self.hist_idx = len(self.history)
            self.ivar.set("")
        return "break"

    def _copy(self, _=None):
        try:
            sel = self.out.get(tk.SEL_FIRST, tk.SEL_LAST)
            self.clipboard_clear(); self.clipboard_append(sel)
        except: pass
        return "break"

    def clear(self):
        self.out.configure(state="normal")
        self.out.delete("1.0", "end")
        self.out.configure(state="disabled")

    def _write(self, text, tag=None):
        self.out.configure(state="normal")
        if tag: self.out.insert("end", text, tag)
        else:   self.out.insert("end", text)
        self.out.see("end")
        self.out.configure(state="disabled")

    # ── Filtre déduplication ──────────────────────────────────────────────────
    def _should_send(self, command):
        """
        Retourne True si la commande mérite d'être envoyée à cmdmem.
        Règles :
          - Même base + mêmes flags (commençant par -) → False
            (les arguments positionnels comme chemins/fichiers sont ignorés)
          - Même base, flags différents → True  (nouvelle variante utile)
          - Nouvelle commande → True
        Exemples :
          cd /var  puis  cd /etc  → même clé "cd|"  → ignoré
          ls -al /var  puis  ls -al /tmp  → même clé "ls|-al"  → ignoré
          ls  puis  ls -al  → clés "ls|" et "ls|-al"  → les deux envoyés
        """
        cmd = command.strip()
        if not cmd:
            return False

        parts = cmd.split()
        base  = parts[0].lower()
        # Seuls les flags (commençant par -) entrent dans la clé ; les chemins/args sont ignorés
        flags = " ".join(sorted(p for p in parts[1:] if p.startswith("-")))
        key   = f"{base}|{flags}"

        if base not in self._cmd_seen:
            self._cmd_seen[base] = set()

        if key in self._cmd_seen[base]:
            return False          # même commande + mêmes options déjà vue

        self._cmd_seen[base].add(key)
        return True

    # ── cmdmem push ───────────────────────────────────────────────────────────
    def _push(self, cmd, host, user):
        try:
            requests.post(f"{CMDMEM_URL}/api/commands/ingest",
                          json={"command": cmd, "shell": "ssh",
                                "hostname": host, "username": user}, timeout=4)
            if self.on_sync: self.after(0, lambda: self.on_sync(True))
        except:
            if self.on_sync: self.after(0, lambda: self.on_sync(False))

# ── Custom tab bar ────────────────────────────────────────────────────────────
class TabBar(ctk.CTkFrame):
    def __init__(self, parent, on_new, on_select, on_close):
        super().__init__(parent, fg_color=SURF2, height=40, corner_radius=0)
        self.pack_propagate(False)
        self.on_new = on_new; self.on_select = on_select; self.on_close = on_close
        self._tabs = []

        self.scroll = ctk.CTkScrollableFrame(self, fg_color=SURF2,
                                              orientation="horizontal",
                                              height=40, label_text="")
        self.scroll.pack(side="left", fill="both", expand=True)

        ctk.CTkButton(self, text="+", width=40, height=40,
                      fg_color=SURF2, hover_color=SURF3,
                      text_color=ACCENT2, font=("Segoe UI", 16),
                      corner_radius=0, command=on_new).pack(side="right")

    def add(self, tid, title):
        wrap = ctk.CTkFrame(self.scroll, fg_color=SURF3,
                             height=40, corner_radius=0)
        wrap.pack(side="left", padx=1)
        wrap.pack_propagate(False)

        btn = ctk.CTkButton(wrap, text=self._short(title),
                             width=150, height=40,
                             fg_color=SURF3, hover_color=SURF3,
                             text_color=MUTED, font=FONT_SM,
                             corner_radius=0, anchor="w",
                             command=lambda t=tid: self.on_select(t))
        btn.pack(side="left", fill="y")

        x = ctk.CTkButton(wrap, text="×", width=26, height=40,
                           fg_color=SURF3, hover_color="#3d0a14",
                           text_color=MUTED, font=("Segoe UI", 12),
                           corner_radius=0,
                           command=lambda t=tid: self.on_close(t))
        x.pack(side="left", fill="y")

        self._tabs.append({"id": tid, "wrap": wrap, "btn": btn, "x": x})
        self.activate(tid)

    def activate(self, tid):
        for t in self._tabs:
            on = t["id"] == tid
            c = BG if on else SURF3
            t["btn"].configure(fg_color=c, text_color=TEXT if on else MUTED)
            t["x"].configure(fg_color=c)
            t["wrap"].configure(fg_color=c)

    def retitle(self, tid, title):
        for t in self._tabs:
            if t["id"] == tid:
                t["btn"].configure(text=self._short(title))

    def remove(self, tid):
        for t in self._tabs:
            if t["id"] == tid:
                t["wrap"].destroy()
        self._tabs = [t for t in self._tabs if t["id"] != tid]

    @staticmethod
    def _short(s):
        return s[:22] + "…" if len(s) > 22 else s

# ── Session sidebar ───────────────────────────────────────────────────────────
class Sidebar(ctk.CTkFrame):
    def __init__(self, parent, on_connect, on_new):
        super().__init__(parent, fg_color=SURF, width=230, corner_radius=0)
        self.pack_propagate(False)
        self.on_connect = on_connect
        self.on_new     = on_new
        self.data       = load_sessions()
        self._build()

    def _build(self):
        # Header
        hdr = ctk.CTkFrame(self, fg_color=SURF2, corner_radius=0, height=42)
        hdr.pack(fill="x"); hdr.pack_propagate(False)
        ctk.CTkLabel(hdr, text="SESSIONS",
                     font=("Segoe UI", 9, "bold"),
                     text_color=MUTED).pack(side="left", padx=14)
        ctk.CTkButton(hdr, text="+", width=28, height=28,
                      fg_color=SURF3, hover_color=ACCENT,
                      text_color=ACCENT2, font=("Segoe UI", 14, "bold"),
                      command=self.on_new).pack(side="right", padx=8, pady=6)

        # Search
        self.sq = ctk.StringVar()
        self.sq.trace("w", lambda *_: self.refresh())
        ctk.CTkEntry(self, textvariable=self.sq,
                     placeholder_text="Rechercher…",
                     fg_color=SURF2, border_color=BORDER,
                     text_color=TEXT, font=FONT_SM, height=30
                     ).pack(fill="x", padx=8, pady=6)

        # List
        self.lst = ctk.CTkScrollableFrame(self, fg_color=SURF, label_text="")
        self.lst.pack(fill="both", expand=True)

        self.refresh()

    def refresh(self):
        for w in self.lst.winfo_children():
            w.destroy()
        q = self.sq.get().lower()

        any_found = False
        for grp in self.data.get("groups", []):
            sessions = [
                s for s in grp.get("sessions", [])
                if q in s.get("name", "").lower() or q in s.get("host", "").lower()
            ]
            if not sessions and q:
                continue
            any_found = True

            # Group label
            gl = ctk.CTkFrame(self.lst, fg_color="transparent")
            gl.pack(fill="x", pady=(10, 2))
            ctk.CTkLabel(gl, text=grp["name"].upper(),
                         font=("Segoe UI", 8, "bold"),
                         text_color=MUTED).pack(side="left", padx=10)

            for s in sessions:
                self._row(s)

        if not any_found:
            ctk.CTkLabel(self.lst,
                         text="Aucune session\nCréez-en une avec +",
                         font=FONT_SM, text_color=MUTED,
                         justify="center").pack(pady=40)

    def _row(self, s):
        row = ctk.CTkFrame(self.lst, fg_color=SURF2,
                            corner_radius=8, cursor="hand2")
        row.pack(fill="x", padx=6, pady=2)

        dot = ctk.CTkLabel(row, text="●", font=("Segoe UI", 8),
                            text_color=MUTED, width=16)
        dot.pack(side="left", padx=(8, 0))

        info = ctk.CTkFrame(row, fg_color="transparent")
        info.pack(side="left", fill="x", expand=True, padx=6, pady=8)
        name = s.get("name") or f"{s.get('user','?')}@{s.get('host','?')}"
        ctk.CTkLabel(info, text=name, font=("Segoe UI", 10, "bold"),
                     text_color=TEXT, anchor="w").pack(fill="x")
        ctk.CTkLabel(info,
                     text=f"{s.get('user','?')}@{s.get('host','?')}:{s.get('port',22)}",
                     font=("Segoe UI", 8), text_color=MUTED, anchor="w").pack(fill="x")

        # Boutons action
        for icon, cmd in [("✕", lambda ss=s: self._delete(ss)),
                          ("✎", lambda ss=s: self._edit(ss))]:
            ctk.CTkButton(row, text=icon, width=24, height=24,
                          fg_color="transparent", hover_color=BORDER2,
                          text_color=MUTED, font=("Segoe UI", 10),
                          command=cmd).pack(side="right", padx=2)

        for w in (row, info, dot):
            w.bind("<Button-1>", lambda e, ss=s: self.on_connect(ss))

    def _edit(self, s):
        def save(data):
            for g in self.data["groups"]:
                for i, sess in enumerate(g["sessions"]):
                    if sess is s:
                        g["sessions"][i] = data
            persist(self.data)
            self.refresh()
        ConnDialog(self.winfo_toplevel(), session=s, on_save=save)

    def _delete(self, s):
        if messagebox.askyesno("Supprimer", "Supprimer cette session ?"):
            for g in self.data["groups"]:
                g["sessions"] = [x for x in g["sessions"] if x is not s]
            persist(self.data)
            self.refresh()

    def add_session(self, data):
        grp_name = data.get("group", "Sessions")
        for g in self.data["groups"]:
            if g["name"] == grp_name:
                g["sessions"].append(data)
                break
        else:
            self.data["groups"].append({"name": grp_name, "sessions": [data]})
        persist(self.data)
        self.refresh()

# ── Main App ──────────────────────────────────────────────────────────────────
class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("cmdmem SSH")
        self.geometry("1240x740")
        self.minsize(900, 550)
        self.configure(fg_color=BG)
        self.tabs: dict[int, SSHTab] = {}
        self._ctr    = 0
        self._active = None
        self._build()
        self._new_tab()
        self._ping_cmdmem()
        self.bind("<Control-t>",   lambda _: self._new_tab())
        self.bind("<Control-w>",   lambda _: self._close_active())
        self.bind("<Control-Tab>", lambda _: self._next_tab())

    # ── Layout ────────────────────────────────────────────────────────────────
    def _build(self):
        # Title bar
        tb = ctk.CTkFrame(self, fg_color=SURF2, height=46, corner_radius=0)
        tb.pack(fill="x"); tb.pack_propagate(False)
        ctk.CTkLabel(tb, text="cmdmem SSH",
                     font=("Segoe UI", 12, "bold"),
                     text_color=ACCENT2).pack(side="left", padx=16)
        self.sync_lbl = ctk.CTkLabel(tb, text="", font=FONT_SM, text_color=MUTED)
        self.sync_lbl.pack(side="right", padx=8)
        self.ping_lbl = ctk.CTkLabel(tb, text="● cmdmem", font=FONT_SM, text_color=MUTED)
        self.ping_lbl.pack(side="right", padx=12)

        # Shortcut hints
        ctk.CTkLabel(tb, text="Ctrl+T  Ctrl+W  Ctrl+Tab  Ctrl+L",
                     font=("Segoe UI", 8), text_color=MUTED
                     ).pack(side="right", padx=24)

        # Tab bar
        self.tbar = TabBar(self,
                           on_new=self._new_tab,
                           on_select=self._select,
                           on_close=self._close_tab)
        self.tbar.pack(fill="x")

        # Body
        body = ctk.CTkFrame(self, fg_color=BG, corner_radius=0)
        body.pack(fill="both", expand=True)

        # Sidebar
        self.sidebar = Sidebar(body,
                                on_connect=self._connect_in_active,
                                on_new=self._new_conn_dialog)
        self.sidebar.pack(side="left", fill="y")
        ctk.CTkFrame(body, width=1, fg_color=BORDER, corner_radius=0
                     ).pack(side="left", fill="y")

        # Terminal zone
        self.zone = ctk.CTkFrame(body, fg_color=BG, corner_radius=0)
        self.zone.pack(side="right", fill="both", expand=True)

    # ── Tab management ────────────────────────────────────────────────────────
    def _new_tab(self, session=None):
        tid = self._ctr; self._ctr += 1
        label = (session.get("name") or
                 f"{session.get('user','?')}@{session.get('host','?')}"
                 ) if session else f"Onglet {tid + 1}"
        tab = SSHTab(self.zone, session=session,
                     on_title=lambda t, i=tid: self.tbar.retitle(i, t),
                     on_sync=self._on_sync)
        self.tabs[tid] = tab
        self.tbar.add(tid, label)
        self._select(tid)
        return tid

    def _select(self, tid):
        if self._active is not None and self._active in self.tabs:
            self.tabs[self._active].pack_forget()
        self._active = tid
        self.tabs[tid].pack(fill="both", expand=True)
        self.tbar.activate(tid)
        self.tabs[tid].inp.focus_set()

    def _close_tab(self, tid):
        if len(self.tabs) <= 1:
            self.quit(); return
        self.tabs[tid].disconnect()
        self.tabs[tid].destroy()
        del self.tabs[tid]
        self.tbar.remove(tid)
        if self._active == tid:
            remaining = list(self.tabs)
            if remaining:
                self._select(remaining[-1])

    def _close_active(self):
        if self._active is not None:
            self._close_tab(self._active)

    def _next_tab(self):
        ids = list(self.tabs)
        if len(ids) < 2: return
        idx = ids.index(self._active)
        self._select(ids[(idx + 1) % len(ids)])

    # ── Connection helpers ────────────────────────────────────────────────────
    def _connect_in_active(self, session):
        if self._active is not None:
            tab = self.tabs[self._active]
            if tab.connected:
                self._new_tab(session)
            else:
                tab.connect(session)
                name = (session.get("name") or
                        f"{session.get('user','?')}@{session.get('host','?')}")
                self.tbar.retitle(self._active, name)

    def _new_conn_dialog(self):
        ConnDialog(self,
                   on_connect=self._connect_in_active,
                   on_save=self.sidebar.add_session)

    # ── Status ────────────────────────────────────────────────────────────────
    def _on_sync(self, ok):
        self.sync_lbl.configure(text="↑ envoyé" if ok else "↑ erreur",
                                 text_color=GREEN if ok else RED)
        self.after(2000, lambda: self.sync_lbl.configure(text=""))

    def _ping_cmdmem(self):
        def check():
            try:
                ok = requests.get(f"{CMDMEM_URL}/api/health", timeout=3).ok
            except: ok = False
            t = "● cmdmem" if ok else "● hors ligne"
            c = GREEN if ok else RED
            self.after(0, lambda: self.ping_lbl.configure(text=t, text_color=c))
        threading.Thread(target=check, daemon=True).start()
        self.after(30_000, self._ping_cmdmem)

# ── Entry ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    App().mainloop()
