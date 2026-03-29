# Guide de déploiement — cmdmem sur Internet

Architecture cible :
- **Backend** → Fly.io (gratuit, SQLite persistant, Paris)
- **Frontend** → Vercel (gratuit, CDN mondial)

---

## Prérequis (à installer une fois)

```powershell
# 1. Git
winget install Git.Git

# 2. Fly CLI
powershell -c "iwr https://fly.io/install.ps1 -useb | iex"

# 3. Vercel CLI
npm install -g vercel
```

---

## Étape 1 — Pousser le code sur GitHub

```powershell
cd C:\Users\botpo\AI\smart-command-memory

git init
git add .
git commit -m "initial commit"

# Créer un repo sur github.com puis :
git remote add origin https://github.com/TON_USER/cmdmem.git
git push -u origin main
```

---

## Étape 2 — Déployer le backend sur Fly.io

```powershell
# Se connecter (crée un compte gratuit sur fly.io si besoin)
fly auth login

# Depuis le dossier backend
cd C:\Users\botpo\AI\smart-command-memory\backend

# Lancer le déploiement (utilise le fly.toml déjà configuré)
fly launch --name cmdmem-backend --no-deploy

# Créer le volume persistant pour SQLite
fly volumes create cmdmem_data --region cdg --size 1

# Déployer
fly deploy

# Vérifier
fly status
```

L'URL de ton backend sera : `https://cmdmem-backend.fly.dev`

---

## Étape 3 — Déployer le frontend sur Vercel

```powershell
cd C:\Users\botpo\AI\smart-command-memory\frontend

vercel login

# Premier déploiement (follow the prompts)
vercel --prod

# Quand Vercel demande les variables d'environnement, ajouter :
# BACKEND_URL = https://cmdmem-backend.fly.dev
```

Ou via l'interface Vercel :
1. vercel.com → New Project → Import depuis GitHub
2. Root Directory : `frontend`
3. Environment Variables → `BACKEND_URL` = `https://cmdmem-backend.fly.dev`
4. Deploy

Ton site sera sur : `https://cmdmem-XXXXXX.vercel.app`

---

## Étape 4 — Mettre à jour le CORS du backend

Une fois que tu connais ton URL Vercel, mettre à jour la variable d'env sur Fly :

```powershell
fly secrets set ALLOWED_ORIGINS="https://cmdmem-XXXXXX.vercel.app" --app cmdmem-backend
```

---

## Étape 5 — Seeder les données initiales (optionnel)

```powershell
fly ssh console --app cmdmem-backend
# Dans le shell Fly :
cd /app && python -m app.db.seed
exit
```

---

## Utiliser l'installateur depuis n'importe quel PC

Une fois déployé, sur n'importe quel PC Windows du monde :

```powershell
irm "https://cmdmem-backend.fly.dev/api/download/installer.ps1" | iex
```

Ou depuis la page **Téléchargement** de ton site Vercel.

---

## Mises à jour

```powershell
# Backend
cd backend && fly deploy

# Frontend
cd frontend && vercel --prod
```

---

## Coûts

| Service | Plan | Prix |
|---------|------|------|
| Fly.io  | Free tier (3 VMs shared) | **0€/mois** |
| Vercel  | Hobby | **0€/mois** |
| GitHub  | Free | **0€/mois** |

> Fly.io facture si tu dépasses les limites (160GB bande passante/mois).
> Pour un usage personnel c'est largement suffisant.
