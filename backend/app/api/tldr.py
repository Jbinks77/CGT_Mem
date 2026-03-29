"""
tldr-pages integration — fetch examples and import into the database.
No API key required: uses raw GitHub content (public, free, unlimited).
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


# ─── Parser ──────────────────────────────────────────────────────────────────

def parse_tldr_md(content: str) -> dict:
    """Parse a tldr markdown page into structured data."""
    lines = content.split("\n")
    summaries: list[str] = []
    examples: list[dict] = []
    current_desc = ""

    for line in lines:
        s = line.strip()
        if s.startswith("> ") and "More information" not in s and "See also" not in s:
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
    """Try to fetch a tldr page: French first, then English. Returns None if not found."""
    cmd = command.lower().split()[0]
    async with httpx.AsyncClient(timeout=6.0) as client:
        # Try French pages first, then English as fallback
        for base in [TLDR_BASE_FR, TLDR_BASE_EN]:
            for platform in PLATFORMS:
                url = f"{base}/{platform}/{cmd}.md"
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = parse_tldr_md(resp.text)
                        data["platform"] = platform
                        data["command"] = cmd
                        data["lang"] = "fr" if base == TLDR_BASE_FR else "en"
                        return data
                except Exception:
                    continue
    return None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _extract_tags(command: str, summary: str) -> list[str]:
    tags = [command]
    low = summary.lower()
    mapping = {
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
        "archive": ["archive", "compression"],
        "compress": ["compression"],
        "process": ["processus", "système"],
        "service": ["service", "système"],
        "user": ["utilisateur", "administration"],
        "permission": ["permissions", "administration"],
        "log": ["logs", "monitoring"],
        "git": ["git", "vcs"],
        "docker": ["docker", "conteneur", "devops"],
        "package": ["package", "installation"],
    }
    for kw, tag_list in mapping.items():
        if kw in low:
            tags.extend(tag_list)
    return list(dict.fromkeys(tags))[:10]  # deduplicate, keep order, max 10


def _guess_category(summary: str) -> str:
    low = summary.lower()
    if any(w in low for w in ["network", "http", "tcp", "dns", "ssh", "ssl", "tls", "firewall", "socket"]):
        return "réseau"
    if any(w in low for w in ["file", "directory", "archive", "compress", "disk", "path"]):
        return "fichiers"
    if any(w in low for w in ["process", "system", "service", "daemon", "kernel", "memory", "cpu"]):
        return "système"
    if any(w in low for w in ["user", "permission", "group", "sudo", "password", "auth"]):
        return "administration"
    if any(w in low for w in ["git", "docker", "container", "deploy", "ci", "pipeline"]):
        return "devops"
    if any(w in low for w in ["encrypt", "certificate", "hash", "sign", "key", "crypto"]):
        return "sécurité"
    return "général"


# ─── Background import ───────────────────────────────────────────────────────

async def _do_import(command: str) -> str:
    """Fetch tldr and upsert into DocumentationEntry. Returns status string."""
    cmd = command.lower().split()[0]
    data = await fetch_tldr(cmd)
    if not data or not data.get("summary"):
        return "not_found"

    async with async_session() as db:
        existing = await db.execute(
            select(DocumentationEntry).where(DocumentationEntry.command_normalized == cmd)
        )
        entry = existing.scalar_one_or_none()

        # Use example descriptions as synonyms → makes "vérifier certificat" findable!
        synonyms = list(dict.fromkeys(ex["description"] for ex in data["examples"][:10]))
        tags = _extract_tags(cmd, data["summary"])
        category = _guess_category(data["summary"])
        platform = data.get("platform", "common")
        section = "windows" if platform == "windows" else "linux"

        embedding_text = build_embedding_text({
            "command_normalized": cmd,
            "description": data["summary"],
            "tags": tags,
            "synonyms": synonyms,
            "category": category,
        })

        if entry:
            # Enrich existing entry with tldr synonyms if they're missing
            if not entry.synonyms:
                entry.synonyms = synonyms
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
    Fetch tldr examples for a command.
    Tries common → linux → windows → osx platforms.
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
    The entry becomes immediately searchable by description/intent
    thanks to the local sentence-transformers embedding model.
    """
    cmd = command.lower().split()[0]

    # Already in db?
    existing = await db.execute(
        select(DocumentationEntry).where(DocumentationEntry.command_normalized == cmd)
    )
    if existing.scalar_one_or_none():
        background_tasks.add_task(_do_import, cmd)  # enrich synonyms if missing
        return {"status": "already_exists"}

    background_tasks.add_task(_do_import, cmd)
    return {"status": "importing"}


@router.post("/tldr/import-bulk")
async def import_bulk(commands: list[str], background_tasks: BackgroundTasks):
    """
    Import multiple commands from tldr in background.
    Useful for pre-seeding the database with common security/admin tools.
    """
    for cmd in commands[:50]:  # max 50 at a time
        background_tasks.add_task(_do_import, cmd)
    return {"status": "queued", "count": min(len(commands), 50)}
