#!/usr/bin/env bash
# certbot deploy hook: copy the renewed certificate into ./ssl (mounted into the container).
# Runs only for grindset.kloai.ru; touches nothing outside this project.
set -euo pipefail

DOMAIN=grindset.kloai.ru
DIR="$(cd "$(dirname "$0")/.." && pwd)"
LIVE="/etc/letsencrypt/live/$DOMAIN"

install -d -m 700 "$DIR/ssl"
# install follows the symlinks in live/ and copies real files
install -m 644 "$LIVE/fullchain.pem" "$DIR/ssl/crt.txt"
install -m 600 "$LIVE/privkey.pem" "$DIR/ssl/key.txt"

echo "Сертификат скопирован в $DIR/ssl"
