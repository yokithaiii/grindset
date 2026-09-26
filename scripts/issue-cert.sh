#!/usr/bin/env bash
# Issue a Let's Encrypt certificate for grindset.kloai.ru and set up auto-renewal.
#
#   sudo bash scripts/issue-cert.sh you@example.com --dry-run   # test against staging first
#   sudo bash scripts/issue-cert.sh you@example.com             # real certificate
#
# Safe for other projects on the server:
#  - certbot listens on port 80 of BIND_IP only (not kloai's 217.114.0.208);
#  - writes only /etc/letsencrypt/*/grindset.kloai.ru and ./ssl of this project;
#  - hooks are stored in this certificate's renewal config, not in global hook dirs.
set -euo pipefail

DOMAIN=grindset.kloai.ru
DIR="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="${1:?usage: sudo bash scripts/issue-cert.sh you@example.com [--dry-run]}"
shift

[ "$(id -u)" -eq 0 ] || { echo "Запустите через sudo"; exit 1; }
command -v certbot >/dev/null || { echo "Установите certbot: sudo apt install -y certbot"; exit 1; }
[ -f "$DIR/.env" ] || { echo "Нет $DIR/.env"; exit 1; }

BIND_IP="$(grep -E '^BIND_IP=' "$DIR/.env" | tail -n1 | cut -d= -f2- | tr -d '"'"'"'[:space:]')"
[ -n "$BIND_IP" ] || { echo "BIND_IP пуст в .env"; exit 1; }
[ "$BIND_IP" != "217.114.0.208" ] || { echo "BIND_IP совпадает с IP kloai — нужен другой IP"; exit 1; }

COMPOSE="docker compose -f $DIR/docker-compose.yml"

# grindset holds port 80 on BIND_IP: stop it while certbot answers the challenge.
certbot certonly --standalone \
  --http-01-address "$BIND_IP" \
  --cert-name "$DOMAIN" -d "$DOMAIN" \
  -m "$EMAIL" --agree-tos --non-interactive \
  --pre-hook "$COMPOSE stop grindset" \
  --post-hook "$COMPOSE up -d grindset" \
  --deploy-hook "bash $DIR/scripts/copy-cert.sh" \
  "$@"

echo
echo "Готово. Проверка продления: sudo certbot renew --cert-name $DOMAIN --dry-run"
