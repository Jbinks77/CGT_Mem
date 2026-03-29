#!/bin/bash
# ============================================================
#  cmdmem — Script d'installation VPS Hetzner (Ubuntu 22.04)
#  Usage : bash setup-vps.sh <domaine> <github_repo_url>
#  Exemple : bash setup-vps.sh api.mondomaine.fr https://github.com/Jbinks77/CGT_Mem.git
# ============================================================
set -e

DOMAIN="${1:-}"
REPO_URL="${2:-https://github.com/Jbinks77/CGT_Mem.git}"
APP_DIR="/opt/cmdmem"
DATA_DIR="/opt/cmdmem/data"
VENV_DIR="/opt/cmdmem/venv"
SERVICE_USER="cmdmem"
PORT=8000

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash setup-vps.sh <domaine> [repo_url]"
  echo "Exemple: bash setup-vps.sh api.mondomaine.fr"
  exit 1
fi

echo "======================================"
echo " cmdmem — Installation sur $DOMAIN"
echo "======================================"

# ── 1. Système ──────────────────────────────────────────────
echo "[1/9] Mise à jour du système..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl nginx certbot python3-certbot-nginx

# ── 2. Python 3.11 ──────────────────────────────────────────
echo "[2/9] Installation de Python 3.11..."
apt-get install -y -qq software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update -qq
apt-get install -y -qq python3.11 python3.11-venv python3.11-dev build-essential

# ── 3. Utilisateur système ───────────────────────────────────
echo "[3/9] Création de l'utilisateur $SERVICE_USER..."
id -u $SERVICE_USER &>/dev/null || useradd --system --create-home --shell /bin/bash $SERVICE_USER

# ── 4. Cloner le repo ────────────────────────────────────────
echo "[4/9] Clonage du repo..."
rm -rf $APP_DIR
git clone $REPO_URL $APP_DIR
mkdir -p $DATA_DIR
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

# ── 5. Environnement virtuel + dépendances ───────────────────
echo "[5/9] Installation des dépendances Python..."
sudo -u $SERVICE_USER python3.11 -m venv $VENV_DIR
sudo -u $SERVICE_USER $VENV_DIR/bin/pip install --upgrade pip -q
sudo -u $SERVICE_USER $VENV_DIR/bin/pip install -r $APP_DIR/backend/requirements.txt -q

# ── 6. Fichier .env ──────────────────────────────────────────
echo "[6/9] Configuration..."
cat > $APP_DIR/backend/.env << EOF
DATABASE_PATH=/opt/cmdmem/data/cmdmem.db
ALLOWED_ORIGINS=["https://${DOMAIN}","https://$(echo $DOMAIN | sed 's/api\.//')"]
EOF
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/backend/.env

# ── 7. Service systemd ───────────────────────────────────────
echo "[7/9] Configuration du service systemd..."
cp $APP_DIR/backend/deploy/cmdmem.service /etc/systemd/system/cmdmem.service
sed -i "s|__APP_DIR__|$APP_DIR/backend|g" /etc/systemd/system/cmdmem.service
sed -i "s|__VENV_DIR__|$VENV_DIR|g" /etc/systemd/system/cmdmem.service
sed -i "s|__SERVICE_USER__|$SERVICE_USER|g" /etc/systemd/system/cmdmem.service
sed -i "s|__PORT__|$PORT|g" /etc/systemd/system/cmdmem.service

systemctl daemon-reload
systemctl enable cmdmem
systemctl start cmdmem

echo "   Démarrage du service (chargement du modèle ~30s)..."
sleep 35
systemctl status cmdmem --no-pager | head -20

# ── 8. Nginx ─────────────────────────────────────────────────
echo "[8/9] Configuration de nginx..."
cp $APP_DIR/backend/deploy/nginx.conf /etc/nginx/sites-available/cmdmem
sed -i "s|__DOMAIN__|$DOMAIN|g" /etc/nginx/sites-available/cmdmem
sed -i "s|__PORT__|$PORT|g" /etc/nginx/sites-available/cmdmem
ln -sf /etc/nginx/sites-available/cmdmem /etc/nginx/sites-enabled/cmdmem
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 9. SSL Let's Encrypt ─────────────────────────────────────
echo "[9/9] Certificat SSL (Let's Encrypt)..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo ""
echo "======================================"
echo "  Installation terminée !"
echo "  Backend disponible sur : https://$DOMAIN"
echo "  Test : curl https://$DOMAIN/api/health"
echo "======================================"
echo ""
echo "Commandes utiles :"
echo "  systemctl status cmdmem    # état du service"
echo "  journalctl -u cmdmem -f    # logs en temps réel"
echo "  systemctl restart cmdmem   # redémarrer"
echo ""
echo "Pour seeder les données initiales :"
echo "  sudo -u cmdmem $VENV_DIR/bin/python -m app.db.seed"
echo "  (depuis le dossier $APP_DIR/backend)"
