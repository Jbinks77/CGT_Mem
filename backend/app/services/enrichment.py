"""
Enrichment service for commands.
Uses rule-based enrichment with auto-generated descriptions.
PowerShell cmdlets (Verb-Noun) are parsed automatically.
"""
import re
import logging

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Section detection
# ──────────────────────────────────────────────
SECTION_HINTS = {
    "linux": [
        "ls", "cd", "grep", "awk", "sed", "cat", "chmod", "chown", "df", "du",
        "top", "htop", "ps", "kill", "systemctl", "journalctl", "apt", "yum",
        "dnf", "pacman", "tar", "gzip", "ssh", "scp", "rsync", "curl", "wget",
        "find", "mount", "umount", "fdisk", "lsblk", "ip", "ifconfig", "netstat",
        "ss", "iptables", "ufw", "crontab", "man", "tail", "head", "sort", "uniq",
        "wc", "diff", "patch", "ln", "mkdir", "rmdir", "cp", "mv", "rm", "touch",
        "nano", "vim", "less", "more", "free", "uptime", "whoami", "hostname",
        "ping", "traceroute", "dig", "nslookup", "nc", "tcpdump", "strace",
    ],
    "windows": [
        "Get-", "Set-", "New-", "Remove-", "Import-", "Export-", "Start-",
        "Stop-", "Restart-", "Add-", "Clear-", "Enable-", "Disable-",
        "Test-", "Update-", "Install-", "Uninstall-", "Register-",
        "Invoke-", "Out-", "Write-", "Read-", "Select-", "Where-",
        "Format-", "Convert-", "Compare-", "Measure-", "Group-",
        "powershell", "pwsh", "cmd", "dir", "copy", "xcopy",
        "robocopy", "icacls", "net ", "netsh", "wmic", "reg ",
        "sfc", "dism", "chkdsk", "diskpart", "ipconfig", "tasklist",
        "taskkill", "where", "findstr", "type", "attrib", "sc ",
    ],
    "automation": [
        "docker", "kubectl", "terraform", "ansible", "vagrant", "make",
        "gradle", "maven", "npm", "yarn", "pnpm", "pip", "cargo",
        "git", "jenkins", "github", "gitlab", "cron",
        "systemd", "supervisor", "pm2", "nginx", "apache",
        "ansible-playbook", "helm", "docker-compose", "docker compose",
    ],
}

# ──────────────────────────────────────────────
# Category detection
# ──────────────────────────────────────────────
CATEGORY_HINTS = {
    "stockage": ["df", "du", "fdisk", "lsblk", "mount", "diskpart", "Disk", "Volume", "Partition", "Storage"],
    "reseau": ["ping", "netstat", "ss", "ip", "ifconfig", "curl", "wget", "traceroute", "dig", "nslookup",
               "ipconfig", "netsh", "Net", "Dns", "Tcp", "Http", "WebRequest", "NetAdapter", "NetConnection",
               "NetFirewall", "NetIPAddress", "NetRoute"],
    "processus": ["ps", "top", "htop", "kill", "tasklist", "taskkill", "Process", "Job"],
    "logs": ["journalctl", "tail", "dmesg", "EventLog", "WinEvent", "Log"],
    "permissions": ["chmod", "chown", "icacls", "attrib", "Acl", "Permission", "Credential"],
    "transfert": ["scp", "rsync", "sftp", "robocopy", "xcopy", "BitsTransfer"],
    "docker": ["docker", "docker-compose", "docker compose", "Container"],
    "configuration": ["ansible", "terraform", "puppet", "chef", "ItemProperty", "Registry"],
    "monitoring": ["top", "htop", "free", "uptime", "vmstat", "iostat", "Counter", "PerfCounter"],
    "paquets": ["apt", "yum", "dnf", "pacman", "pip", "npm", "yarn", "cargo", "Package", "Module", "PSRepository"],
    "fichiers": ["ChildItem", "Item", "Content", "Path", "Location", "Clipboard"],
    "services": ["Service", "systemctl"],
    "securite": ["Acl", "Credential", "Certificate", "SecureString", "Authenticode", "CmsMessage", "Firewall"],
    "systeme": ["Computer", "ComputerInfo", "Host", "Culture", "TimeZone", "Date", "Uptime", "HotFix", "WmiObject", "CimInstance"],
}

# ──────────────────────────────────────────────
# PowerShell verb translations (Verb -> french description)
# ──────────────────────────────────────────────
PS_VERB_FR = {
    "Get": ("Recupere", ["afficher", "lister", "voir", "obtenir"]),
    "Set": ("Modifie", ["changer", "configurer", "definir", "modifier"]),
    "New": ("Cree", ["creer", "nouveau", "ajouter"]),
    "Remove": ("Supprime", ["supprimer", "effacer", "retirer", "enlever"]),
    "Add": ("Ajoute", ["ajouter", "inserer"]),
    "Clear": ("Vide", ["vider", "effacer", "nettoyer"]),
    "Start": ("Demarre", ["demarrer", "lancer", "executer"]),
    "Stop": ("Arrete", ["arreter", "stopper", "terminer"]),
    "Restart": ("Redemarre", ["redemarrer", "relancer"]),
    "Enable": ("Active", ["activer", "autoriser"]),
    "Disable": ("Desactive", ["desactiver", "bloquer"]),
    "Test": ("Teste", ["tester", "verifier", "valider"]),
    "Update": ("Met a jour", ["mettre a jour", "actualiser"]),
    "Install": ("Installe", ["installer"]),
    "Uninstall": ("Desinstalle", ["desinstaller", "retirer"]),
    "Import": ("Importe", ["importer", "charger"]),
    "Export": ("Exporte", ["exporter", "sauvegarder"]),
    "Invoke": ("Execute", ["executer", "appeler", "lancer"]),
    "Register": ("Enregistre", ["enregistrer", "inscrire"]),
    "Unregister": ("Desenregistre", ["desenregistrer", "desinscrire"]),
    "Copy": ("Copie", ["copier", "dupliquer"]),
    "Move": ("Deplace", ["deplacer", "bouger"]),
    "Rename": ("Renomme", ["renommer"]),
    "Select": ("Selectionne", ["selectionner", "filtrer", "choisir"]),
    "Where": ("Filtre", ["filtrer", "ou", "condition"]),
    "Format": ("Formate", ["formater", "afficher"]),
    "Convert": ("Convertit", ["convertir", "transformer"]),
    "Compare": ("Compare", ["comparer", "difference"]),
    "Measure": ("Mesure", ["mesurer", "compter", "calculer"]),
    "Group": ("Groupe", ["grouper", "regrouper"]),
    "Sort": ("Trie", ["trier", "ordonner", "classer"]),
    "Write": ("Ecrit", ["ecrire", "afficher", "sortie"]),
    "Read": ("Lit", ["lire", "lecture"]),
    "Out": ("Redirige", ["rediriger", "sortie", "envoyer"]),
    "Send": ("Envoie", ["envoyer", "transmettre"]),
    "Receive": ("Recoit", ["recevoir"]),
    "Wait": ("Attend", ["attendre", "patienter"]),
    "Show": ("Affiche", ["afficher", "montrer"]),
    "Hide": ("Cache", ["cacher", "masquer"]),
    "Find": ("Recherche", ["rechercher", "trouver", "chercher"]),
    "Search": ("Recherche", ["rechercher", "chercher"]),
    "Resolve": ("Resout", ["resoudre"]),
    "Expand": ("Developpe", ["developper", "etendre"]),
    "Compress": ("Compresse", ["compresser", "archiver"]),
    "Optimize": ("Optimise", ["optimiser"]),
    "Debug": ("Debogue", ["deboguer", "debug"]),
    "Repair": ("Repare", ["reparer", "corriger"]),
    "Reset": ("Reinitialise", ["reinitialiser", "remettre a zero"]),
    "Suspend": ("Suspend", ["suspendre", "mettre en pause"]),
    "Resume": ("Reprend", ["reprendre", "continuer"]),
    "Enter": ("Entre dans", ["entrer"]),
    "Exit": ("Sort de", ["sortir", "quitter"]),
    "Use": ("Utilise", ["utiliser"]),
    "Disconnect": ("Deconnecte", ["deconnecter"]),
    "Connect": ("Connecte", ["connecter", "se connecter"]),
    "Mount": ("Monte", ["monter"]),
    "Dismount": ("Demonte", ["demonter"]),
}

# PowerShell noun translations
PS_NOUN_FR = {
    "Process": "les processus",
    "Service": "les services",
    "Item": "les elements (fichiers/dossiers)",
    "ChildItem": "les fichiers et sous-dossiers",
    "Content": "le contenu d'un fichier",
    "ItemProperty": "les proprietes d'un element",
    "Path": "le chemin",
    "Location": "le repertoire courant",
    "Clipboard": "le presse-papiers",
    "Object": "les objets",
    "Variable": "les variables",
    "Alias": "les alias de commandes",
    "Module": "les modules PowerShell",
    "Command": "les commandes disponibles",
    "Help": "l'aide",
    "History": "l'historique des commandes",
    "Host": "l'hote PowerShell",
    "Culture": "la culture/langue systeme",
    "Date": "la date et l'heure",
    "TimeZone": "le fuseau horaire",
    "Computer": "l'ordinateur",
    "ComputerInfo": "les informations systeme",
    "Disk": "les disques",
    "Volume": "les volumes de stockage",
    "Partition": "les partitions",
    "EventLog": "le journal d'evenements",
    "WinEvent": "les evenements Windows",
    "WmiObject": "les objets WMI",
    "CimInstance": "les instances CIM",
    "Counter": "les compteurs de performance",
    "Job": "les taches en arriere-plan",
    "ScheduledTask": "les taches planifiees",
    "NetAdapter": "les cartes reseau",
    "NetIPAddress": "les adresses IP",
    "NetRoute": "les routes reseau",
    "NetConnection": "les connexions reseau",
    "NetFirewallRule": "les regles de pare-feu",
    "DnsClientCache": "le cache DNS",
    "Acl": "les listes de controle d'acces (permissions)",
    "Credential": "les identifiants",
    "Certificate": "les certificats",
    "SecureString": "les chaines securisees",
    "ExecutionPolicy": "la politique d'execution",
    "PSSession": "les sessions PowerShell distantes",
    "PSRepository": "les depots PowerShell",
    "Package": "les paquets",
    "PackageProvider": "les fournisseurs de paquets",
    "WindowsFeature": "les fonctionnalites Windows",
    "WindowsOptionalFeature": "les fonctionnalites Windows optionnelles",
    "HotFix": "les mises a jour installees",
    "LocalUser": "les utilisateurs locaux",
    "LocalGroup": "les groupes locaux",
    "LocalGroupMember": "les membres d'un groupe local",
    "SmbShare": "les partages reseau SMB",
    "Printer": "les imprimantes",
    "BitLocker": "le chiffrement BitLocker",
    "AppxPackage": "les applications UWP",
    "StartupTask": "les taches de demarrage",
    "WebRequest": "une requete web",
    "RestMethod": "une API REST",
    "Expression": "une expression/commande",
    "String": "les chaines de caracteres",
    "Member": "les membres (proprietes/methodes) d'un objet",
    "Unique": "les elements uniques",
    "Type": "les types .NET",
    "Error": "les erreurs",
    "Warning": "les avertissements",
    "Output": "la sortie",
    "Null": "null (aucune sortie)",
    "File": "un fichier",
    "GridView": "une grille interactive",
    "Csv": "le format CSV",
    "Json": "le format JSON",
    "Xml": "le format XML",
    "Html": "le format HTML",
    "Table": "un tableau",
    "List": "une liste",
    "Wide": "un format large",
    "Verbose": "les messages detailles",
}

# ──────────────────────────────────────────────
# Static descriptions for common commands
# ──────────────────────────────────────────────
COMMAND_DESCRIPTIONS = {
    "df": "Affiche l'utilisation de l'espace disque par systeme de fichiers",
    "du": "Affiche la taille des fichiers et dossiers",
    "top": "Affiche en temps reel les processus et l'utilisation des ressources",
    "htop": "Moniteur interactif de processus systeme",
    "ps": "Liste les processus en cours d'execution",
    "kill": "Envoie un signal a un processus pour le terminer",
    "chmod": "Modifie les permissions d'un fichier ou dossier",
    "chown": "Change le proprietaire d'un fichier ou dossier",
    "grep": "Recherche un motif dans des fichiers ou un flux de texte",
    "find": "Recherche des fichiers selon des criteres (nom, taille, date...)",
    "tar": "Archive et compresse des fichiers",
    "ssh": "Connexion securisee a une machine distante",
    "scp": "Copie securisee de fichiers entre machines via SSH",
    "rsync": "Synchronisation de fichiers locale ou distante",
    "curl": "Transfert de donnees depuis ou vers un serveur (HTTP, FTP...)",
    "wget": "Telechargement de fichiers depuis le web",
    "systemctl": "Gere les services systemd (demarrer, arreter, activer...)",
    "journalctl": "Consulte les logs du journal systemd",
    "apt": "Gestionnaire de paquets Debian/Ubuntu",
    "yum": "Gestionnaire de paquets Red Hat/CentOS",
    "dnf": "Gestionnaire de paquets Fedora",
    "pacman": "Gestionnaire de paquets Arch Linux",
    "ping": "Teste la connectivite reseau vers un hote",
    "netstat": "Affiche les connexions reseau et ports ouverts",
    "ss": "Affiche les sockets reseau (remplacement moderne de netstat)",
    "ip": "Configure et affiche les interfaces reseau",
    "ifconfig": "Configure les interfaces reseau (ancien)",
    "iptables": "Configure le pare-feu Linux",
    "ufw": "Pare-feu simplifie pour Ubuntu",
    "crontab": "Planifie des taches periodiques",
    "mount": "Monte un systeme de fichiers",
    "fdisk": "Gere les partitions de disque",
    "lsblk": "Liste les peripheriques de stockage en bloc",
    "free": "Affiche l'utilisation de la memoire",
    "uptime": "Affiche depuis combien de temps le systeme tourne",
    "tail": "Affiche les dernieres lignes d'un fichier",
    "head": "Affiche les premieres lignes d'un fichier",
    "cat": "Affiche le contenu d'un fichier",
    "less": "Affiche un fichier page par page",
    "sort": "Trie les lignes d'un fichier",
    "uniq": "Supprime les lignes dupliquees consecutives",
    "wc": "Compte les lignes, mots et caracteres",
    "diff": "Compare deux fichiers ligne par ligne",
    "sed": "Editeur de flux pour transformer du texte",
    "awk": "Langage de traitement de texte ligne par ligne",
    "ln": "Cree des liens symboliques ou physiques",
    "mkdir": "Cree un repertoire",
    "cp": "Copie des fichiers ou dossiers",
    "mv": "Deplace ou renomme des fichiers",
    "rm": "Supprime des fichiers ou dossiers",
    "touch": "Cree un fichier vide ou met a jour sa date",
    "nano": "Editeur de texte simple en terminal",
    "vim": "Editeur de texte avance en terminal",
    "whoami": "Affiche le nom de l'utilisateur courant",
    "hostname": "Affiche ou modifie le nom de la machine",
    "dig": "Interroge les serveurs DNS",
    "nslookup": "Recherche DNS d'un nom de domaine",
    "traceroute": "Trace le chemin reseau vers un hote",
    "nc": "Outil reseau polyvalent (netcat)",
    "tcpdump": "Capture et analyse le trafic reseau",
    "strace": "Trace les appels systeme d'un processus",
    "dmesg": "Affiche les messages du noyau Linux",
    "docker": "Gere les conteneurs Docker",
    "docker-compose": "Orchestre des services multi-conteneurs Docker",
    "kubectl": "Controle un cluster Kubernetes",
    "terraform": "Infrastructure as Code - provisionne des ressources cloud",
    "ansible": "Automatisation de configuration de serveurs",
    "ansible-playbook": "Execute un playbook Ansible",
    "vagrant": "Gere des machines virtuelles de developpement",
    "make": "Execute des regles de build definies dans un Makefile",
    "git": "Systeme de controle de version distribue",
    "npm": "Gestionnaire de paquets Node.js",
    "yarn": "Gestionnaire de paquets Node.js alternatif",
    "pip": "Gestionnaire de paquets Python",
    "cargo": "Gestionnaire de paquets et build Rust",
    "helm": "Gestionnaire de paquets Kubernetes",
    "nginx": "Serveur web et reverse proxy",
    "pm2": "Gestionnaire de processus Node.js en production",
    "ipconfig": "Affiche la configuration reseau Windows",
    "tasklist": "Liste les processus Windows (CMD)",
    "taskkill": "Termine un processus Windows",
    "robocopy": "Copie robuste de fichiers et dossiers Windows",
    "netsh": "Configuration reseau Windows en ligne de commande",
    "sfc": "Verificateur de fichiers systeme Windows",
    "dism": "Maintenance d'images de deploiement Windows",
    "chkdsk": "Verifie et repare un disque Windows",
    "diskpart": "Gere les partitions de disque Windows",
    "ls": "Liste les fichiers et dossiers",
    "cd": "Change le repertoire courant",
    "pwd": "Affiche le repertoire courant",
    "echo": "Affiche du texte",
    "env": "Affiche ou modifie les variables d'environnement",
    "export": "Definit une variable d'environnement",
    "alias": "Cree un raccourci de commande",
    "xargs": "Construit et execute des commandes a partir de l'entree standard",
    "tee": "Lit l'entree standard et ecrit dans un fichier et la sortie standard",
    "nmap": "Scanner de ports et decouverte reseau",
    "lsof": "Liste les fichiers ouverts par les processus",
    "dd": "Copie et convertit des donnees brutes (images disque, USB...)",
    "cron": "Planificateur de taches Linux",
    "useradd": "Cree un utilisateur systeme",
    "usermod": "Modifie un utilisateur systeme",
    "userdel": "Supprime un utilisateur systeme",
    "groupadd": "Cree un groupe systeme",
    "passwd": "Change le mot de passe d'un utilisateur",
    "su": "Change d'utilisateur (switch user)",
    "sudo": "Execute une commande en tant qu'administrateur",
    "chroot": "Change le repertoire racine d'un processus",
    "screen": "Multiplexeur de terminaux (sessions persistantes)",
    "tmux": "Multiplexeur de terminaux moderne",
    "systemd": "Systeme d'initialisation et gestionnaire de services Linux",
    "service": "Gere les services systeme (ancien)",
}

# ──────────────────────────────────────────────
# Static synonyms for common commands
# ──────────────────────────────────────────────
COMMAND_SYNONYMS = {
    "df": ["espace disque", "occupation disque", "place disponible", "taille disque"],
    "du": ["taille dossier", "espace utilise", "poids fichier"],
    "top": ["charge systeme", "utilisation cpu", "processus actifs", "charge serveur"],
    "htop": ["moniteur processus", "charge cpu memoire"],
    "ps": ["liste processus", "processus en cours"],
    "kill": ["arreter processus", "tuer processus", "forcer arret"],
    "chmod": ["changer permissions", "droits fichier", "rendre executable"],
    "chown": ["changer proprietaire", "proprietaire fichier"],
    "grep": ["chercher texte", "rechercher dans fichier", "filtrer lignes"],
    "find": ["trouver fichier", "chercher fichier", "localiser"],
    "tar": ["archiver", "compresser", "decompresser", "extraire archive"],
    "ssh": ["connexion distante", "se connecter serveur", "acces distant"],
    "scp": ["copier fichier distant", "transfert ssh", "envoyer fichier serveur"],
    "rsync": ["synchroniser fichiers", "backup", "copie incrementale"],
    "curl": ["requete http", "appel api", "telecharger url"],
    "wget": ["telecharger fichier", "download"],
    "systemctl": ["gerer service", "demarrer service", "arreter service", "redemarrer service"],
    "journalctl": ["logs systeme", "voir logs", "logs service", "debug service"],
    "ping": ["tester connexion", "tester reseau", "verifier serveur"],
    "netstat": ["ports ouverts", "connexions actives", "ecoute reseau"],
    "ss": ["sockets ouvertes", "ports en ecoute"],
    "docker": ["conteneur", "lancer conteneur", "image docker"],
    "docker-compose": ["lancer services", "deployer conteneurs", "orchestrer docker"],
    "kubectl": ["kubernetes", "pods", "deploiement k8s"],
    "git": ["version", "commit", "push", "pull", "branche"],
    "npm": ["installer paquet node", "dependances javascript"],
    "free": ["memoire disponible", "utilisation ram", "memoire utilisee"],
    "tail": ["derniere lignes", "suivre fichier", "logs en direct"],
    "crontab": ["tache planifiee", "planifier commande", "job periodique"],
    "iptables": ["pare-feu", "firewall", "bloquer port", "ouvrir port"],
    "mount": ["monter disque", "monter partition", "attacher volume"],
    "ipconfig": ["adresse ip windows", "configuration reseau windows"],
    "tasklist": ["processus windows cmd", "taches windows"],
    "robocopy": ["copie fichiers windows", "backup windows"],
    "sudo": ["administrateur", "root", "elevation"],
    "nmap": ["scan ports", "decouverte reseau", "scanner"],
}


# ──────────────────────────────────────────────
# PowerShell auto-description engine
# ──────────────────────────────────────────────
def _parse_powershell_cmdlet(command: str) -> tuple[str, str] | None:
    """Parse a PowerShell Verb-Noun cmdlet. Returns (verb, noun) or None."""
    base = command.strip().split()[0] if command.strip() else ""
    match = re.match(r'^([A-Z][a-z]+)-([A-Za-z]+)$', base)
    if match:
        return match.group(1), match.group(2)
    return None


def _describe_powershell(verb: str, noun: str) -> str:
    """Generate a french description from a PowerShell Verb-Noun cmdlet."""
    verb_info = PS_VERB_FR.get(verb)
    verb_fr = verb_info[0] if verb_info else verb

    noun_fr = PS_NOUN_FR.get(noun)
    if noun_fr:
        return f"{verb_fr} {noun_fr}"

    # Split CamelCase noun into words for readability
    words = re.findall(r'[A-Z][a-z]*', noun)
    noun_readable = " ".join(w.lower() for w in words) if words else noun
    return f"{verb_fr} {noun_readable} (PowerShell)"


def _powershell_synonyms(verb: str, noun: str) -> list[str]:
    """Generate search synonyms for a PowerShell cmdlet."""
    synonyms = []

    verb_info = PS_VERB_FR.get(verb)
    if verb_info:
        verb_synonyms = verb_info[1]
    else:
        verb_synonyms = [verb.lower()]

    noun_fr = PS_NOUN_FR.get(noun, "")
    # Clean the noun for synonyms
    noun_clean = noun_fr.replace("les ", "").replace("le ", "").replace("la ", "").replace("l'", "").replace("un ", "").replace("une ", "") if noun_fr else noun.lower()

    # Also split CamelCase
    words = re.findall(r'[A-Z][a-z]*', noun)
    noun_words = [w.lower() for w in words] if words else [noun.lower()]

    for v in verb_synonyms[:2]:
        synonyms.append(f"{v} {noun_clean}")

    synonyms.extend(noun_words)
    synonyms.append(f"{verb}-{noun}")

    return synonyms


def _powershell_category(noun: str) -> str:
    """Detect category from PowerShell noun."""
    for cat, hints in CATEGORY_HINTS.items():
        for hint in hints:
            if hint in noun:
                return cat
    return "general"


# ──────────────────────────────────────────────
# Main enrichment logic
# ──────────────────────────────────────────────
async def enrich_command(command: str, shell: str, os_name: str | None = None) -> dict:
    """Enrich a command using local rules and auto-description."""
    return _enrich_with_rules(command, shell, os_name)


def _enrich_with_rules(command: str, shell: str, os_name: str | None = None) -> dict:
    base_cmd = command.strip().split()[0] if command.strip() else command

    section = _detect_section(command, shell, os_name)
    category = _detect_category(command, base_cmd)

    # Try PowerShell auto-description first
    ps_parsed = _parse_powershell_cmdlet(command)
    if ps_parsed:
        verb, noun = ps_parsed
        description = _describe_powershell(verb, noun)
        synonyms = _powershell_synonyms(verb, noun)
        if category == "general":
            category = _powershell_category(noun)
        tags = _generate_tags(command, base_cmd, category)
        return {
            "description": description,
            "section": section,
            "category": category,
            "tags": tags,
            "synonyms": synonyms,
            "is_sensitive": False,
        }

    # Static dictionary lookup
    description = COMMAND_DESCRIPTIONS.get(base_cmd)
    if not description:
        for key in COMMAND_DESCRIPTIONS:
            if command.strip().startswith(key):
                description = COMMAND_DESCRIPTIONS[key]
                break
    if not description:
        description = f"Commande: {command.strip()[:100]}"

    synonyms = COMMAND_SYNONYMS.get(base_cmd, [base_cmd])
    tags = _generate_tags(command, base_cmd, category)

    return {
        "description": description,
        "section": section,
        "category": category,
        "tags": tags,
        "synonyms": synonyms,
        "is_sensitive": False,
    }


def _detect_section(command: str, shell: str, os_name: str | None) -> str:
    cmd_lower = command.lower()

    if shell.lower() in ("powershell", "pwsh"):
        return "windows"

    for hint in SECTION_HINTS["automation"]:
        if hint in cmd_lower:
            return "automation"

    for hint in SECTION_HINTS["windows"]:
        if cmd_lower.startswith(hint.lower()) or hint.lower() in cmd_lower:
            return "windows"

    return "linux"


def _detect_category(command: str, base_cmd: str = "") -> str:
    cmd_lower = command.lower()
    for cat, hints in CATEGORY_HINTS.items():
        for hint in hints:
            if hint.lower() in cmd_lower:
                return cat
    return "general"


def _generate_tags(command: str, base_cmd: str, category: str) -> list[str]:
    tags = [base_cmd]
    if category != "general":
        tags.append(category)

    # Add pipe targets as tags
    if "|" in command:
        parts = command.split("|")
        for part in parts[1:]:
            pipe_cmd = part.strip().split()[0] if part.strip() else ""
            if pipe_cmd and pipe_cmd != base_cmd:
                tags.append(pipe_cmd)

    return tags
