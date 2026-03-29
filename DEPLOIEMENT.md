# Guide de déploiement — cmdmem sur Internet

Architecture :
- **Backend** → Hetzner VPS CX22 (~3.29€/mois, SQLite persistant, Allemagne)
- **Frontend** → Vercel (gratuit, CDN mondial)
- **Domaine** → OVH ou Namecheap (~7-12€/an)

---

## Coûts

| Service     | Plan              | Prix          |
|-------------|-------------------|---------------|
| Hetzner CX22| 2vCPU/4GB/40GB    | **3.29€/mois** |
| Vercel      | Hobby             | **0€/mois**   |
| Domaine .fr | OVH               | **~7€/an**    |
| **Total**   |                   | **~3.90€/mois** |

---

## Étape 1 — Créer le VPS Hetzner

1. Aller sur **hetzner.com** → Cloud → Create Server
2. Choisir :
   - **Location** : Falkenstein (FSN1) ou Nuremberg (NBG1)
   - **Image** : Ubuntu 22.04
   - **Type** : CX22 (3.29€/mois)
   - **SSH Key** : ajouter ta clé publique (recommandé)
3. Créer le serveur → noter l'**adresse IP** (ex: `65.21.xxx.xxx`)

---

## Étape 2 — Pointer le domaine vers le VPS

Chez OVH / Namecheap, créer un enregistrement DNS :

```
Type : A
Nom  : api          (pour api.mondomaine.fr)
Valeur : 65.21.xxx.xxx   (IP du VPS Hetzner)
TTL  : 300
```

> Attendre 5-15 minutes que le DNS se propage.

---

## Étape 3 — Installer le backend sur le VPS

Se connecter au VPS :

```bash
ssh root@65.21.xxx.xxx
```

Lancer le script d'installation automatique :

```bash
curl -sSL https://raw.githubusercontent.com/Jbinks77/CGT_Mem/main/backend/deploy/setup-vps.sh | bash -s api.mondomaine.fr
```

Le script fait tout automatiquement :
- Installe Python 3.11, nginx, certbot
- Clone le repo depuis GitHub
- Installe les dépendances Python
- Configure le service systemd (redémarrage automatique)
- Configure nginx en reverse proxy
- Génère le certificat SSL Let's Encrypt

**Durée : ~5 minutes** (+ 30s pour le chargement du modèle d'embeddings)

Vérifier que ça fonctionne :

```bash
curl https://api.mondomaine.fr/api/health
# Doit retourner : {"status":"ok"}
```

---

## Étape 4 — Déployer le frontend sur Vercel

```powershell
cd C:\Users\botpo\AI\smart-command-memory\frontend
npx vercel login
npx vercel --prod
```

Quand Vercel demande les variables d'environnement :
```
BACKEND_URL = https://api.mondomaine.fr
```

Ou via l'interface Vercel :
1. vercel.com → New Project → Import depuis GitHub (`Jbinks77/CGT_Mem`)
2. Root Directory : `frontend`
3. Environment Variables → `BACKEND_URL` = `https://api.mondomaine.fr`
4. Deploy

Ton site sera sur : `https://cmdmem-XXXXXX.vercel.app` (ou domaine perso)

---

## Étape 5 — Mettre à jour le CORS du backend

Une fois que tu connais ton URL Vercel, mettre à jour le fichier `.env` sur le VPS :

```bash
ssh root@65.21.xxx.xxx
nano /opt/cmdmem/backend/.env
```

Modifier `ALLOWED_ORIGINS` :
```
ALLOWED_ORIGINS=["https://cmdmem-XXXXXX.vercel.app","https://api.mondomaine.fr"]
```

Puis redémarrer :
```bash
systemctl restart cmdmem
```

---

## Étape 6 — Seeder les données initiales (optionnel)

```bash
ssh root@65.21.xxx.xxx
cd /opt/cmdmem/backend
sudo -u cmdmem /opt/cmdmem/venv/bin/python -m app.db.seed
```

---

## Utiliser l'installateur depuis n'importe quel PC

Une fois déployé, sur n'importe quel PC Windows :

```powershell
irm "https://api.mondomaine.fr/api/download/installer.ps1" | iex
```

---

## Commandes de maintenance

```bash
# Voir l'état du service
systemctl status cmdmem

# Logs en temps réel
journalctl -u cmdmem -f

# Redémarrer le backend
systemctl restart cmdmem

# Mettre à jour le code
cd /opt/cmdmem && git pull
systemctl restart cmdmem

# Renouveler le certificat SSL (automatique, mais si besoin)
certbot renew
```

---

## Mises à jour

```bash
# Sur le VPS
cd /opt/cmdmem
git pull
systemctl restart cmdmem

# Frontend (depuis Windows)
cd frontend && npx vercel --prod
```
