# Smart Command Memory (cmdmem)

Application personnelle qui capture automatiquement les commandes shell, les enrichit via IA, et les rend retrouvables par recherche textuelle + semantique.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Agent local │────>│   Backend    │────>│  PostgreSQL  │
│  (bash/zsh/  │     │  (FastAPI)   │     │  + pgvector  │
│  powershell) │     └──────┬───────┘     └──────────────┘
└─────────────┘            │
                    ┌──────┴───────┐
                    │   Frontend   │
                    │  (Next.js)   │
                    └──────────────┘
```

## Demarrage rapide

### Prerequis
- Docker + Docker Compose

### Lancer l'application

```bash
cd smart-command-memory
docker compose up --build
```

L'application sera disponible sur :
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs

### Generer les embeddings pour les donnees d'exemple

```bash
# Apres le premier lancement
docker compose exec backend python -m app.db.seed
```

## Pages

### `/` - Recherche
Page minimaliste avec un champ de recherche centre. Tapez une commande ou une intention en langage naturel :
- `df -h` → trouve la commande exacte
- `espace disque` → trouve `df -h` par recherche semantique
- `logs nginx` → trouve `journalctl -u nginx`

### `/documentation` - Documentation
Commandes organisees en 3 sections :
- **Linux** : commandes systeme Linux/Unix
- **Windows** : commandes PowerShell/CMD
- **Automatisation** : Docker, Ansible, CI/CD, etc.

### `/documentation/:id` - Detail
Fiche complete d'une commande : description, tags, synonymes, categorie, statistiques d'utilisation.

## API

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/commands/ingest` | Ingerer une commande |
| GET | `/api/search?q=...` | Recherche hybride |
| GET | `/api/documentation` | Toute la documentation |
| GET | `/api/documentation/{section}` | Par section (linux/windows/automation) |
| GET | `/api/documentation/entry/{id}` | Detail d'une commande |
| GET | `/api/stats` | Statistiques |
| GET | `/api/hosts` | Machines connectees |
| GET | `/api/health` | Health check |

### Exemple d'ingestion

```bash
curl -X POST http://localhost:8000/api/commands/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "command": "df -h",
    "shell": "bash",
    "hostname": "mon-pc",
    "username": "user",
    "os": "Linux Ubuntu 22.04",
    "cwd": "/home/user",
    "exit_code": 0,
    "duration_ms": 45
  }'
```

### Exemple de recherche

```bash
curl "http://localhost:8000/api/search?q=espace%20disque"
```

## Agent local

L'agent capture automatiquement les commandes et les envoie au backend.

### Installation Bash
```bash
# Ajouter a ~/.bashrc
source /chemin/vers/agent/shell-hooks/bash-hook.sh
```

### Installation Zsh
```bash
# Ajouter a ~/.zshrc
source /chemin/vers/agent/shell-hooks/zsh-hook.sh
```

### Installation PowerShell
```powershell
# Ajouter a $PROFILE
. C:\chemin\vers\agent\shell-hooks\powershell-hook.ps1
```

### Configuration
```bash
# Changer l'endpoint (defaut: http://localhost:8000/api/commands/ingest)
export CMDMEM_ENDPOINT="http://monserveur:8000/api/commands/ingest"
```

### Envoi manuel
```bash
python3 agent/agent.py "docker ps -a" --shell bash --exit-code 0
```

## Enrichissement IA

Chaque commande est enrichie avec :
- **Description** en francais
- **Section** : linux / windows / automation
- **Categorie** : stockage, reseau, processus, etc.
- **Tags** : mots-cles pertinents
- **Synonymes** : intentions de recherche alternatives
- **Sensibilite** : detection de donnees sensibles

Si `ANTHROPIC_API_KEY` est configure, l'enrichissement utilise Claude. Sinon, un enrichissement par regles est utilise.

## Securite

Les secrets sont automatiquement masques :
- Mots de passe (`password=xxx` → `password=***MASKED***`)
- Tokens API, Bearer, JWT
- Cles AWS, GitHub tokens
- Patterns configurables dans `config.py`

## Structure du projet

```
smart-command-memory/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # Point d'entree FastAPI
│       ├── config.py            # Configuration
│       ├── database.py          # Connexion DB
│       ├── models.py            # Modeles SQLAlchemy
│       ├── schemas.py           # Schemas Pydantic
│       ├── api/
│       │   ├── commands.py      # Ingestion
│       │   ├── search.py        # Recherche hybride
│       │   ├── documentation.py # CRUD documentation
│       │   └── stats.py         # Statistiques
│       ├── services/
│       │   ├── enrichment.py    # Enrichissement IA
│       │   ├── embeddings.py    # Embeddings vectoriels
│       │   ├── search.py        # Recherche hybride
│       │   └── secrets.py       # Masquage de secrets
│       └── db/
│           ├── init.sql         # Schema + donnees exemple
│           └── seed.py          # Generateur d'embeddings
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx         # Page recherche
│       │   └── documentation/
│       │       ├── page.tsx     # Documentation
│       │       └── [id]/page.tsx # Detail commande
│       ├── components/
│       │   ├── SearchBar.tsx
│       │   └── CommandCard.tsx
│       └── lib/
│           └── api.ts           # Client API
└── agent/
    ├── agent.py                 # Agent Python
    └── shell-hooks/
        ├── bash-hook.sh
        ├── zsh-hook.sh
        └── powershell-hook.ps1
```

## Base de donnees

### Tables
- `hosts` : machines connectees
- `command_events` : historique brut des commandes capturees
- `documentation_entries` : commandes enrichies + embeddings vectoriels
- `command_doc_links` : liaison N:N entre events et documentation

### Recherche hybride
Score = 40% texte (trigram + ILIKE + tags + synonymes) + 60% semantique (cosine similarity sur embeddings 384-dim).
