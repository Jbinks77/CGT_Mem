from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database import init_db
from app.api import commands, search, documentation, stats, scripts, download, tldr, wiki

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


TLDR_SEED_COMMANDS = [
    # Sécurité / certificats
    "openssl", "ssh", "ssh-keygen", "gpg", "fail2ban", "ufw", "iptables", "nmap",
    "tcpdump", "wireshark", "netstat", "ss", "curl", "wget",
    # Système / logs
    "ls", "cd", "cat", "tail", "grep", "find", "chmod", "chown", "ps", "top",
    "htop", "df", "du", "free", "systemctl", "journalctl", "crontab",
    # Réseau
    "ping", "traceroute", "dig", "nslookup", "ifconfig", "ip", "route", "nc",
    # Archives / fichiers
    "tar", "zip", "unzip", "rsync", "scp", "cp", "mv", "rm", "mkdir",
    # Packages / devops
    "apt", "apt-get", "yum", "dnf", "pip", "git", "docker", "kubectl",
    # Utilisateurs / perms
    "sudo", "su", "useradd", "passwd", "chmod", "chown", "id", "who",
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
