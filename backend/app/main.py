from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database import init_db
from app.api import commands, search, documentation, stats, scripts, download, tldr, wiki, cve

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


TLDR_SEED_COMMANDS = [

    # ═══════════════════════════════════════════════════════════════════════════
    # LINUX / UNIX
    # ═══════════════════════════════════════════════════════════════════════════

    # Fichiers & navigation
    "ls", "cd", "pwd", "cp", "mv", "rm", "mkdir", "rmdir", "touch", "ln",
    "find", "locate", "which", "whereis", "tree", "file", "stat", "du", "df",
    "lsof", "fuser", "mount", "umount", "dd", "shred", "truncate",
    "basename", "dirname", "realpath",

    # Lecture / texte
    "cat", "less", "more", "head", "tail", "tac", "nl", "bat",
    "grep", "egrep", "fgrep", "ripgrep", "awk", "sed", "cut", "tr",
    "sort", "uniq", "wc", "diff", "patch", "comm", "join", "paste",
    "column", "tee", "xargs", "strings", "od", "xxd", "hexdump",

    # Archives & compression
    "tar", "gzip", "gunzip", "bzip2", "bunzip2", "xz", "zip", "unzip",
    "7z", "rar", "unrar", "zstd", "pigz",

    # Processus & jobs
    "ps", "top", "htop", "atop", "pgrep", "pkill", "kill", "killall",
    "nice", "renice", "nohup", "bg", "fg", "jobs", "wait", "watch",
    "timeout", "time", "strace", "ltrace", "ldd",

    # Réseau
    "ping", "ping6", "traceroute", "tracepath", "mtr", "netstat", "ss",
    "ip", "ifconfig", "route", "arp", "dig", "nslookup", "host", "whois",
    "curl", "wget", "nc", "ncat", "socat", "nmap", "masscan",
    "tcpdump", "wireshark", "tshark", "iptables", "ip6tables", "nftables",
    "ufw", "firewalld", "iperf3", "hping3", "fping", "ab", "wrk",
    "ssh", "scp", "sftp", "rsync", "mosh", "telnet", "ftp",

    # Sécurité
    "openssl", "ssh-keygen", "ssh-copy-id", "ssh-agent", "ssh-add",
    "gpg", "gpg2", "age", "pass", "pwgen",
    "fail2ban", "fail2ban-client", "lynis", "rkhunter", "chkrootkit",
    "auditd", "ausearch", "auditctl",
    "hashcat", "john", "hydra", "medusa",
    "nikto", "sqlmap", "wfuzz", "dirb", "gobuster", "ffuf",
    "metasploit", "msfconsole", "msfvenom",
    "certbot", "acme.sh",

    # Certificats & crypto
    "openssl",  # déjà présent, ok (dédupliqué automatiquement)
    "cfssl", "easyrsa", "keytool",

    # Système & monitoring
    "uname", "hostname", "hostnamectl", "uptime", "date", "timedatectl",
    "free", "vmstat", "iostat", "sar", "mpstat", "pidstat",
    "lscpu", "lsmem", "lspci", "lsusb", "lsblk", "blkid", "dmidecode",
    "dmesg", "journalctl", "syslog", "logrotate",
    "systemctl", "service", "init", "rc-service", "supervisorctl",
    "crontab", "at", "anacron",
    "env", "printenv", "export", "set", "unset", "source",
    "echo", "printf", "read",
    "history", "alias", "type", "help",
    "man", "info", "tldr",

    # Utilisateurs & permissions
    "sudo", "su", "runuser", "doas",
    "useradd", "usermod", "userdel", "adduser", "deluser",
    "groupadd", "groupmod", "groupdel",
    "passwd", "chpasswd", "chage", "shadow",
    "id", "who", "whoami", "w", "last", "lastlog", "finger",
    "chmod", "chown", "chgrp", "umask", "acl", "setfacl", "getfacl",
    "visudo", "sudoers",

    # Disques & filesystems
    "fdisk", "gdisk", "parted", "gparted", "cfdisk",
    "mkfs", "mkswap", "swapon", "swapoff",
    "fsck", "e2fsck", "tune2fs", "resize2fs",
    "lvm", "pvs", "vgs", "lvs", "pvcreate", "vgcreate", "lvcreate",
    "mdadm", "zfs", "btrfs",
    "smartctl", "hdparm", "nvme",

    # Packages & gestionnaires
    "apt", "apt-get", "apt-cache", "dpkg", "snap",
    "yum", "dnf", "rpm", "zypper", "pacman", "brew",
    "pip", "pip3", "pipx", "poetry", "conda", "virtualenv",
    "npm", "yarn", "pnpm", "npx",
    "gem", "bundle", "cargo", "go", "mvn", "gradle",

    # Dev / VCS
    "git", "git-flow", "gh", "gitlab",
    "make", "cmake", "gcc", "g++", "clang", "gdb",
    "python", "python3", "ruby", "node", "deno", "php",
    "vim", "neovim", "nano", "emacs",
    "tmux", "screen", "byobu",
    "jq", "yq", "xmllint", "csvkit",

    # Containers & orchestration
    "docker", "docker-compose", "podman", "buildah", "skopeo",
    "kubectl", "helm", "minikube", "kind", "k3s",
    "ansible", "ansible-playbook", "ansible-vault", "ansible-galaxy",
    "terraform", "terragrunt", "vault",
    "vagrant", "packer",

    # Cloud
    "aws", "az", "gcloud", "doctl", "linode-cli",

    # Bases de données
    "mysql", "mysqldump", "mysqladmin",
    "psql", "pg_dump", "pg_restore", "pg_basebackup",
    "redis-cli", "mongodump", "mongorestore",
    "sqlite3", "influx",

    # Scripting utilitaires
    "bash", "sh", "zsh", "fish",
    "test", "expr", "bc", "dc",
    "base64", "md5sum", "sha1sum", "sha256sum", "sha512sum",
    "iconv", "locale",
    "curl",  # déjà présent

    # ═══════════════════════════════════════════════════════════════════════════
    # POWERSHELL
    # ═══════════════════════════════════════════════════════════════════════════

    # Navigation & fichiers
    "get-childitem", "set-location", "get-location", "push-location", "pop-location",
    "get-item", "get-content", "set-content", "add-content", "clear-content",
    "copy-item", "move-item", "remove-item", "new-item", "rename-item",
    "test-path", "resolve-path", "split-path", "join-path", "get-acl", "set-acl",
    "get-itempropertyw",

    # Processus
    "get-process", "stop-process", "start-process", "wait-process",
    "get-job", "start-job", "stop-job", "receive-job", "remove-job", "wait-job",
    "invoke-command", "invoke-expression",

    # Services & démarrage
    "get-service", "start-service", "stop-service", "restart-service",
    "set-service", "new-service", "remove-service",
    "get-scheduledtask", "register-scheduledtask", "unregister-scheduledtask",
    "start-scheduledtask", "stop-scheduledtask",

    # Réseau
    "test-netconnection", "test-connection", "resolve-dnsname",
    "invoke-webrequest", "invoke-restmethod",
    "get-netadapter", "set-netadapter", "enable-netadapter", "disable-netadapter",
    "get-netipaddress", "new-netipaddress", "remove-netipaddress",
    "get-netroute", "new-netroute", "remove-netroute",
    "get-dnsclientcache", "clear-dnsclientcache",
    "get-nettcpconnection",

    # Utilisateurs & groupes
    "get-localuser", "new-localuser", "set-localuser", "remove-localuser",
    "enable-localuser", "disable-localuser",
    "get-localgroup", "new-localgroup", "remove-localgroup",
    "add-localgroupmember", "remove-localgroupmember", "get-localgroupmember",

    # Archives
    "compress-archive", "expand-archive",

    # Modules & aide
    "get-module", "import-module", "remove-module",
    "install-module", "update-module", "uninstall-module", "find-module",
    "get-command", "get-help", "get-alias", "new-alias", "set-alias",
    "update-help",

    # Variables & environnement
    "get-variable", "set-variable", "new-variable", "remove-variable", "clear-variable",
    "get-psdrive", "new-psdrive", "remove-psdrive",
    "get-childitem",  # alias env: pour les variables d'env

    # Événements & logs
    "get-eventlog", "clear-eventlog", "write-eventlog",
    "get-winevent", "new-winevent",

    # Registre Windows
    "get-itemproperty", "set-itemproperty", "new-itemproperty", "remove-itemproperty",
    "get-childitem",  # alias pour HKLM: etc.

    # Sécurité & certificats
    "get-executionpolicy", "set-executionpolicy",
    "get-certificate", "get-pfxcertificate", "new-selfsignedcertificate",
    "protect-cmsmessage", "unprotect-cmsmessage",
    "convertto-securestring", "convertfrom-securestring",
    "get-credential",

    # Traitement de données
    "select-object", "where-object", "sort-object", "group-object",
    "measure-object", "foreach-object", "tee-object",
    "compare-object", "find-object",
    "out-file", "out-null", "out-gridview", "out-string", "out-host",
    "format-table", "format-list", "format-wide",
    "convertto-json", "convertfrom-json",
    "convertto-csv", "convertfrom-csv",
    "convertto-html", "convertto-xml",
    "export-csv", "import-csv",
    "export-clixml", "import-clixml",
    "select-string",

    # WMI / CIM
    "get-ciminstance", "invoke-cimmethod", "set-ciminstance",
    "new-ciminstance", "remove-ciminstance",
    "get-wmiobject", "invoke-wmimethod",

    # Remoting
    "enter-pssession", "exit-pssession",
    "new-pssession", "remove-pssession", "get-pssession",
    "enable-psremoting", "disable-psremoting",
    "copy-item",  # remoting

    # Utilitaires
    "write-host", "write-output", "write-error", "write-warning", "write-verbose",
    "read-host",
    "get-date", "set-date",
    "get-random", "start-sleep",
    "measure-command", "measure-object",
    "clear-host",
    "get-computerinfo", "get-hotfix",
    "restart-computer", "stop-computer",
    "get-culture", "get-uiculture",
    "send-mailmessage",
    "start-transcript", "stop-transcript",

    # Sécurité PS avancé
    "get-authenticodesignature", "set-authenticodesignature",
    "get-filehash",

    # Windows CMD (compatibles PowerShell)
    "ipconfig", "ping", "tracert", "netsh", "net",
    "tasklist", "taskkill", "sc", "reg",
    "icacls", "takeown", "runas",
    "diskpart", "chkdsk", "sfc", "dism",
    "bcdedit", "bootrec",
    "wmic", "winrm", "winrs",
    "msiexec", "regsvr32",
    "eventvwr", "perfmon", "resmon",
    "gpupdate", "gpresult",
    "certmgr", "certutil",
    "cipher",
    "netstat", "nbtstat", "arp", "route", "pathping",
    "nslookup", "hostname", "systeminfo",
    "powercfg", "shutdown", "logoff",
    "clip", "xcopy", "robocopy",
    "where", "findstr", "more", "type",
    "attrib", "cacls",
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
    async def _seed(commands: list):
        for cmd in commands:
            try:
                await _do_import(cmd)
                await asyncio.sleep(0.25)  # be polite with GitHub
            except Exception as e:
                logger.debug(f"tldr seed failed for {cmd}: {e}")
        logger.info("tldr seed complete")
    # Deduplicate seed list while preserving order
    _seen: set[str] = set()
    _deduped = []
    for _c in TLDR_SEED_COMMANDS:
        if _c not in _seen:
            _seen.add(_c)
            _deduped.append(_c)
    logger.info(f"Seeding {len(_deduped)} commands...")
    asyncio.create_task(_seed(_deduped))

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
app.include_router(cve.router, prefix="/api", tags=["cve"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
