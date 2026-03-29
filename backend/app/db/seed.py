"""Seed the database with example data and generate embeddings."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import async_session, init_db
from app.models import Host, DocumentationEntry
from app.services.embeddings import generate_embedding, build_embedding_text
from sqlalchemy import select


SEED_HOSTS = [
    {"hostname": "workstation-01", "os": "Linux Ubuntu 22.04"},
    {"hostname": "desktop-win", "os": "Windows 11"},
    {"hostname": "server-prod", "os": "Linux Debian 12"},
]

SEED_DOCS = [
    {
        "command_normalized": "df -h",
        "description": "Affiche l'utilisation de l'espace disque par systeme de fichiers en format lisible",
        "section": "linux", "category": "stockage",
        "tags": ["disque", "stockage", "filesystem", "capacite"],
        "synonyms": ["espace disque", "occupation disque", "place disponible"],
        "usage_count": 12,
    },
    {
        "command_normalized": "top",
        "description": "Affiche en temps reel les processus en cours et l'utilisation des ressources systeme",
        "section": "linux", "category": "monitoring",
        "tags": ["processus", "cpu", "memoire", "monitoring"],
        "synonyms": ["charge systeme", "utilisation cpu", "processus actifs"],
        "usage_count": 34,
    },
    {
        "command_normalized": "journalctl -u",
        "description": "Affiche les logs d'un service via systemd journal",
        "section": "linux", "category": "logs",
        "tags": ["logs", "systemd", "journal", "service"],
        "synonyms": ["logs service", "erreurs service", "debug service", "logs nginx"],
        "usage_count": 8,
    },
    {
        "command_normalized": "docker compose up -d",
        "description": "Demarre tous les services definis dans docker-compose.yml en arriere-plan",
        "section": "automation", "category": "docker",
        "tags": ["docker", "compose", "conteneur", "deploiement"],
        "synonyms": ["lancer docker", "demarrer conteneurs", "deployer services"],
        "usage_count": 22,
    },
    {
        "command_normalized": "Get-Process",
        "description": "Liste tous les processus en cours d'execution sur Windows",
        "section": "windows", "category": "processus",
        "tags": ["processus", "tache", "powershell"],
        "synonyms": ["liste processus", "taches en cours", "programmes ouverts"],
        "usage_count": 15,
    },
    {
        "command_normalized": "chmod",
        "description": "Modifie les permissions d'un fichier : lecture/ecriture/execution",
        "section": "linux", "category": "permissions",
        "tags": ["permissions", "droits", "fichier", "acces"],
        "synonyms": ["changer permissions", "droits fichier", "rendre executable"],
        "usage_count": 9,
    },
    {
        "command_normalized": "netstat -tulnp",
        "description": "Affiche les ports ouverts et les connexions reseau actives avec les processus associes",
        "section": "linux", "category": "reseau",
        "tags": ["reseau", "ports", "connexions", "tcp", "udp"],
        "synonyms": ["ports ouverts", "connexions actives", "ecoute reseau"],
        "usage_count": 17,
    },
    {
        "command_normalized": "scp",
        "description": "Copie securisee de fichiers entre machines via SSH",
        "section": "linux", "category": "transfert",
        "tags": ["copie", "ssh", "transfert", "fichier", "distant"],
        "synonyms": ["copier fichier distant", "transfert ssh", "envoyer fichier serveur"],
        "usage_count": 6,
    },
    {
        "command_normalized": "ansible-playbook",
        "description": "Execute un playbook Ansible pour automatiser la configuration de serveurs",
        "section": "automation", "category": "configuration",
        "tags": ["ansible", "playbook", "automatisation", "configuration"],
        "synonyms": ["automatiser serveurs", "deployer configuration", "provisionner"],
        "usage_count": 11,
    },
    {
        "command_normalized": "Get-EventLog -LogName System",
        "description": "Consulte le journal d'evenements systeme de Windows",
        "section": "windows", "category": "logs",
        "tags": ["logs", "evenements", "systeme", "windows"],
        "synonyms": ["journal windows", "erreurs systeme", "evenements systeme"],
        "usage_count": 4,
    },
    {
        "command_normalized": "grep -r",
        "description": "Recherche recursivement un motif dans les fichiers d'un repertoire",
        "section": "linux", "category": "general",
        "tags": ["recherche", "texte", "fichier", "motif"],
        "synonyms": ["chercher texte", "rechercher dans fichiers", "trouver mot"],
        "usage_count": 28,
    },
    {
        "command_normalized": "git log --oneline",
        "description": "Affiche l'historique des commits en format condense",
        "section": "automation", "category": "general",
        "tags": ["git", "historique", "commits", "version"],
        "synonyms": ["historique git", "voir commits", "log git"],
        "usage_count": 19,
    },
    {
        "command_normalized": "kubectl get pods",
        "description": "Liste les pods Kubernetes dans le namespace courant",
        "section": "automation", "category": "docker",
        "tags": ["kubernetes", "pods", "k8s", "conteneur"],
        "synonyms": ["pods kubernetes", "lister pods", "etat pods"],
        "usage_count": 7,
    },
    {
        "command_normalized": "free -h",
        "description": "Affiche l'utilisation de la memoire RAM en format lisible",
        "section": "linux", "category": "monitoring",
        "tags": ["memoire", "ram", "monitoring"],
        "synonyms": ["memoire disponible", "utilisation ram", "memoire utilisee"],
        "usage_count": 14,
    },
    {
        "command_normalized": "ipconfig /all",
        "description": "Affiche la configuration reseau complete de Windows",
        "section": "windows", "category": "reseau",
        "tags": ["reseau", "ip", "configuration", "windows"],
        "synonyms": ["adresse ip windows", "configuration reseau", "carte reseau"],
        "usage_count": 10,
    },
]


async def seed():
    await init_db()

    async with async_session() as db:
        # Seed hosts
        for h in SEED_HOSTS:
            existing = await db.execute(select(Host).where(Host.hostname == h["hostname"]))
            if not existing.scalar_one_or_none():
                db.add(Host(**h))
        await db.commit()

        # Seed docs with embeddings
        for doc_data in SEED_DOCS:
            existing = await db.execute(
                select(DocumentationEntry).where(
                    DocumentationEntry.command_normalized == doc_data["command_normalized"]
                )
            )
            if existing.scalar_one_or_none():
                continue

            embedding_text = build_embedding_text(doc_data)
            embedding = generate_embedding(embedding_text)

            entry = DocumentationEntry(
                embedding=embedding,
                **doc_data,
            )
            db.add(entry)
            print(f"  + {doc_data['command_normalized']}")

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
