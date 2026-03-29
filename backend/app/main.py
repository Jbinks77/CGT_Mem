from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database import init_db
from app.api import commands, search, documentation, stats, scripts, download, tldr, wiki

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


TLDR_SEED_COMMANDS = [
    # ── Linux / Sécurité ──────────────────────────────────────────────────────
    "openssl", "ssh", "ssh-keygen", "gpg", "fail2ban", "ufw", "iptables", "nmap",
    "tcpdump", "netstat", "ss", "curl", "wget",
    # Système / logs
    "ls", "cd", "cat", "tail", "head", "grep", "find", "chmod", "chown", "ps",
    "top", "htop", "df", "du", "free", "systemctl", "journalctl", "crontab",
    "sed", "awk", "sort", "uniq", "wc", "cut", "xargs", "tee", "less", "more",
    "echo", "env", "export", "which", "whereis", "man", "history",
    # Réseau Linux
    "ping", "traceroute", "dig", "nslookup", "ifconfig", "ip", "route", "nc",
    "host", "whois", "mtr", "arp",
    # Archives / fichiers
    "tar", "zip", "unzip", "gzip", "rsync", "scp", "cp", "mv", "rm", "mkdir",
    "ln", "touch", "file", "stat", "lsof", "mount", "umount",
    # Packages / devops
    "apt", "apt-get", "yum", "dnf", "pip", "git", "docker", "kubectl",
    "ansible", "terraform", "helm",
    # Utilisateurs / perms
    "sudo", "su", "useradd", "usermod", "userdel", "passwd", "id", "who",
    "groups", "visudo",
    # ── PowerShell ────────────────────────────────────────────────────────────
    # Navigation / fichiers
    "get-childitem", "set-location", "get-location", "get-item", "get-content",
    "set-content", "add-content", "copy-item", "move-item", "remove-item",
    "new-item", "rename-item", "test-path", "get-acl", "set-acl",
    # Processus / services
    "get-process", "stop-process", "start-process", "get-service",
    "start-service", "stop-service", "restart-service", "set-service",
    # Réseau PowerShell
    "test-netconnection", "invoke-webrequest", "invoke-restmethod",
    "get-netadapter", "get-netipaddress", "test-connection",
    # Utilisateurs / sécurité
    "get-localuser", "new-localuser", "set-localuser", "remove-localuser",
    "get-localgroup", "add-localgroupmember", "remove-localgroupmember",
    # Archives
    "compress-archive", "expand-archive",
    # Système Windows
    "get-eventlog", "get-winevent", "get-date", "get-variable",
    "set-variable", "get-command", "get-help", "get-module", "import-module",
    "get-executionpolicy", "set-executionpolicy",
    # Traitement de données
    "convertto-json", "convertfrom-json",
    "select-object", "where-object", "sort-object", "group-object",
    "measure-object", "foreach-object", "out-file", "out-gridview",
    "export-csv", "import-csv", "select-string",
    # WMI / CIM
    "get-ciminstance", "invoke-cimmethod",
    # Utilitaires PS
    "write-host", "write-output", "read-host", "format-table", "format-list",
    "compare-object", "get-random", "start-sleep", "clear-host",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Command Memory API")
    await init_db()
    logger.info("Database ready")
    from app.services.embeddings import get_model
    get_model()
    logger.info("Embedding model ready")
    # Background: seed tldr for common commands so search-by-description works
    import asyncio
    from app.api.tldr import _do_import
    async def _seed():
        for cmd in TLDR_SEED_COMMANDS:
            try:
                await _do_import(cmd)
                await asyncio.sleep(0.3)  # be polite with GitHub
            except Exception as e:
                logger.debug(f"tldr seed failed for {cmd}: {e}")
        logger.info("tldr seed complete")
    asyncio.create_task(_seed())

    # Re-import existing entries to get French descriptions (runs once, quick)
    from app.database import async_session as _session
    from app.models import DocumentationEntry as _DocEntry
    from sqlalchemy import select as _select
    async def _refresh_fr():
        await asyncio.sleep(5)  # let seed start first
        try:
            async with _session() as db:
                result = await db.execute(_select(_DocEntry.command_normalized))
                existing = [row[0] for row in result.fetchall()]
            for cmd in existing:
                try:
                    await _do_import(cmd, force_update=True)
                    await asyncio.sleep(0.2)
                except Exception as e:
                    logger.debug(f"fr refresh failed for {cmd}: {e}")
            logger.info(f"French refresh complete ({len(existing)} commands)")
        except Exception as e:
            logger.warning(f"French refresh error: {e}")
    asyncio.create_task(_refresh_fr())

    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Smart Command Memory",
    description="Capture, enrich, and search shell commands",
    version="1.0.0",
    lifespan=lifespan,
)

from app.config import get_settings as _get_settings
_settings = _get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commands.router, prefix="/api", tags=["commands"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(documentation.router, prefix="/api", tags=["documentation"])
app.include_router(stats.router, prefix="/api", tags=["stats"])
app.include_router(scripts.router, prefix="/api", tags=["scripts"])
app.include_router(download.router, prefix="/api", tags=["download"])
app.include_router(tldr.router, prefix="/api", tags=["tldr"])
app.include_router(wiki.router, prefix="/api", tags=["wiki"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
