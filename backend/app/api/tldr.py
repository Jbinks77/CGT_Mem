"""
tldr-pages integration — fetch examples and import into the database.
No API key required: uses raw GitHub content (public, free, unlimited).
French pages have priority, English as fallback.
"""

import httpx
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.models import DocumentationEntry
from app.services.embeddings import generate_embedding, build_embedding_text

router = APIRouter()

TLDR_BASE_FR = "https://raw.githubusercontent.com/tldr-pages/tldr/main/pages.fr"
TLDR_BASE_EN = "https://raw.githubusercontent.com/tldr-pages/tldr/main/pages"
PLATFORMS = ["common", "linux", "windows", "osx"]

# PowerShell verb prefixes — used to detect PS cmdlets and set section = "powershell"
POWERSHELL_VERBS = {
    "get", "set", "new", "remove", "add", "clear", "copy", "move",
    "rename", "start", "stop", "restart", "test", "invoke", "write",
    "read", "out", "select", "where", "sort", "group", "measure",
    "format", "convert", "export", "import", "enable", "disable",
    "push", "pop", "show", "lock", "unlock", "save", "restore",
    "find", "split", "join", "update", "sync", "install", "uninstall",
    "register", "unregister", "connect", "disconnect", "enter", "exit",
    "publish", "use", "send", "receive", "wait", "suspend", "resume",
}


# ─── Parser ──────────────────────────────────────────────────────────────────

def parse_tldr_md(content: str) -> dict:
    """Parse a tldr markdown page into structured data."""
    lines = content.split("\n")
    summaries: list[str] = []
    examples: list[dict] = []
    current_desc = ""

    for line in lines:
        s = line.strip()
        # Skip "More information" / "See also" / "Voir aussi" lines
        if s.startswith("> ") and not any(x in s for x in [
            "More information", "See also", "Plus d'informations",
            "Voir aussi", "Pour plus", "Documentation"
        ]):
            summaries.append(s[2:].rstrip("."))
        elif s.startswith("- "):
            current_desc = s[2:].rstrip(":")
        elif s.startswith("`") and s.endswith("`") and len(s) > 2 and current_desc:
            examples.append({"description": current_desc, "command": s[1:-1]})
            current_desc = ""

    return {
        "summary": " ".join(summaries),
        "examples": examples,
    }


# ─── Fetcher ─────────────────────────────────────────────────────────────────

async def fetch_tldr(command: str) -> dict | None:
    """
    Fetch a tldr page: French first (pages.fr), then English (pages).
    Tries all platforms: common → linux → windows → osx.
    Returns None if not found anywhere.
    """
    cmd = command.lower().split()[0]
    async with httpx.AsyncClient(timeout=8.0) as client:
        for base, lang in [(TLDR_BASE_FR, "fr"), (TLDR_BASE_EN, "en")]:
            for platform in PLATFORMS:
                url = f"{base}/{platform}/{cmd}.md"
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = parse_tldr_md(resp.text)
                        if not data["summary"] and not data["examples"]:
                            continue  # empty parse → try next
                        data["platform"] = platform
                        data["command"] = cmd
                        data["lang"] = lang
                        return data
                except Exception:
                    continue
    return None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _is_powershell_cmdlet(cmd: str) -> bool:
    """Detect PowerShell cmdlets by Verb-Noun pattern."""
    parts = cmd.split("-")
    return len(parts) >= 2 and parts[0].lower() in POWERSHELL_VERBS


def _extract_tags(command: str, summary: str) -> list[str]:
    tags = [command]
    low = summary.lower()
    mapping = {
        # French keywords
        "certificat": ["ssl", "tls", "certificat", "sécurité"],
        "réseau": ["réseau"],
        "fichier": ["fichiers"],
        "répertoire": ["répertoire", "fichiers"],
        "archive": ["archive", "compression"],
        "processus": ["processus", "système"],
        "service": ["service", "système"],
        "utilisateur": ["utilisateur", "administration"],
        "permission": ["permissions", "administration"],
        "journal": ["logs", "monitoring"],
        "chiffr": ["chiffrement", "sécurité"],
        "pare-feu": ["firewall", "sécurité"],
        "mot de passe": ["sécurité", "administration"],
        # English keywords (fallback)
        "certificate": ["ssl", "tls", "certificat"],
        "ssl": ["ssl", "tls", "sécurité"],
        "tls": ["ssl", "tls", "sécurité"],
        "network": ["réseau"],
        "http": ["http", "web"],
        "ssh": ["ssh", "réseau"],
        "firewall": ["firewall", "sécurité"],
        "encrypt": ["chiffrement", "sécurité"],
        "file": ["fichiers"],
        "directory": ["répertoire", "fichiers"],
        "compress": ["compression"],
        "process": ["processus", "système"],
        "user": ["utilisateur", "administration"],
        "permission": ["permissions", "administration"],
        "log": ["logs", "monitoring"],
        "git": ["git", "vcs"],
        "docker": ["docker", "conteneur", "devops"],
        "package": ["package", "installation"],
        "powershell": ["powershell", "windows"],
        "cmdlet": ["powershell", "windows"],
    }
    for kw, tag_list in mapping.items():
        if kw in low:
            tags.extend(tag_list)
    if _is_powershell_cmdlet(command):
        tags.extend(["powershell", "windows"])
    return list(dict.fromkeys(tags))[:10]


def _guess_category(summary: str, command: str = "") -> str:
    low = summary.lower()
    # PowerShell → windows section
    if _is_powershell_cmdlet(command):
        # still categorize by function
        pass
    if any(w in low for w in ["réseau", "network", "http", "tcp", "dns", "ssh", "ssl", "tls", "firewall", "socket", "connexion", "web"]):
        return "réseau"
    if any(w in low for w in ["fichier", "répertoire", "archive", "compress", "disque", "file", "directory", "disk", "path"]):
        return "fichiers"
    if any(w in low for w in ["processus", "système", "service", "daemon", "mémoire", "cpu", "process", "system", "kernel", "memory"]):
        return "système"
    if any(w in low for w in ["utilisateur", "permission", "groupe", "sudo", "mot de passe", "auth", "user", "password", "group"]):
        return "administration"
    if any(w in low for w in ["git", "docker", "conteneur", "déployer", "container", "deploy", "ci", "pipeline"]):
        return "devops"
    if any(w in low for w in ["chiffr", "certificat", "hach", "signer", "clé", "encrypt", "certificate", "hash", "sign", "key", "crypto"]):
        return "sécurité"
    return "général"


# ─── Background import ───────────────────────────────────────────────────────

async def _do_import(command: str, force_update: bool = False) -> str:
    """
    Fetch tldr (FR first, EN fallback) and upsert into DocumentationEntry.
    force_update=True overwrites description even on existing entries.
    """
    cmd = command.lower().split()[0]
    data = await fetch_tldr(cmd)
    if not data or not data.get("summary"):
        return "not_found"

    is_ps = _is_powershell_cmdlet(cmd)
    platform = data.get("platform", "common")
    if is_ps:
        section = "powershell"
    elif platform == "windows":
        section = "windows"
    else:
        section = "linux"

    synonyms = list(dict.fromkeys(ex["description"] for ex in data["examples"][:12]))
    tags = _extract_tags(cmd, data["summary"])
    category = _guess_category(data["summary"], cmd)
    lang = data.get("lang", "en")

    embedding_text = build_embedding_text({
        "command_normalized": cmd,
        "description": data["summary"],
        "tags": tags,
        "synonyms": synonyms,
        "category": category,
    })

    async with async_session() as db:
        existing = await db.execute(
            select(DocumentationEntry).where(DocumentationEntry.command_normalized == cmd)
        )
        entry = existing.scalar_one_or_none()

        if entry:
            needs_update = False
            # Always update description when French is found OR forced
            if lang == "fr" or force_update or not entry.description:
                entry.description = data["summary"]
                needs_update = True
            # Always enrich synonyms
            if not entry.synonyms or force_update:
                entry.synonyms = synonyms
                needs_update = True
            if needs_update:
                entry.embedding = generate_embedding(embedding_text)
                await db.commit()
            return "enriched"

        # Create new entry
        new_entry = DocumentationEntry(
            command_normalized=cmd,
            description=data["summary"],
            section=section,
            category=category,
            tags=tags,
            synonyms=synonyms,
            is_sensitive=False,
            usage_count=0,
            embedding=generate_embedding(embedding_text),
        )
        db.add(new_entry)
        await db.commit()
        await db.refresh(new_entry)
        return "imported"


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/tldr/examples/{command}")
async def get_examples(command: str):
    """
    Fetch tldr examples for a command (French first, English fallback).
    """
    data = await fetch_tldr(command)
    if not data:
        return {"found": False, "summary": "", "examples": []}
    return {"found": True, **data}


@router.post("/tldr/import/{command}")
async def import_command(
    command: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Import a command from tldr-pages into the documentation database.
    Always tries French first. Overwrites English descriptions with French.
    """
    cmd = command.lower().split()[0]
    existing = await db.execute(
        select(DocumentationEntry).where(DocumentationEntry.command_normalized == cmd)
    )
    if existing.scalar_one_or_none():
        background_tasks.add_task(_do_import, cmd, True)  # force update
        return {"status": "already_exists"}

    background_tasks.add_task(_do_import, cmd)
    return {"status": "importing"}


@router.post("/tldr/import-bulk")
async def import_bulk(commands: list[str], background_tasks: BackgroundTasks):
    """Import multiple commands from tldr in background (max 50)."""
    for cmd in commands[:50]:
        background_tasks.add_task(_do_import, cmd)
    return {"status": "queued", "count": min(len(commands), 50)}


@router.post("/tldr/refresh-all")
async def refresh_all(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Force re-import all existing entries to get French descriptions.
    Useful after switching to French-first logic.
    """
    result = await db.execute(select(DocumentationEntry.command_normalized))
    commands = [row[0] for row in result.fetchall()]
    for cmd in commands:
        background_tasks.add_task(_do_import, cmd, True)
    return {"status": "queued", "count": len(commands)}
