#!/usr/bin/env bash
# Put the GSDN Sites Tracker behind HTTPS using nginx as a reverse proxy.
# Run with sudo, AFTER the app is running (setup-server.sh).
#
# Two modes:
#   • Public domain  -> free, trusted Let's Encrypt certificate (auto-renews)
#   • IP / intranet  -> self-signed certificate (browser shows a one-time warning)
#
# Usage:
#   sudo ./scripts/setup-https.sh                                   # self-signed, HTTPS on 443
#   sudo DOMAIN=tracker.example.com EMAIL=you@example.com \
#        ./scripts/setup-https.sh                                   # Let's Encrypt
#   sudo APP_PORT=8080 HTTPS_PORT=8443 ./scripts/setup-https.sh     # custom ports
#
# Variables (all optional):
#   DOMAIN     public hostname -> triggers Let's Encrypt. Omit for self-signed.
#   EMAIL      contact e-mail for Let's Encrypt (recommended with DOMAIN).
#   APP_PORT   port the Node app listens on. Default: PORT from .env, else 3000.
#   HTTPS_PORT port nginx serves HTTPS on. Default: 443.
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ Please run with sudo (it edits nginx config)." >&2
  exit 1
fi

# --- resolve ports ----------------------------------------------------------
if [ -z "${APP_PORT:-}" ] && [ -f "$REPO_DIR/.env" ]; then
  APP_PORT="$(grep -E '^[[:space:]]*PORT=' "$REPO_DIR/.env" | tail -1 | sed -E 's/^[^=]*=//; s/[^0-9]//g')"
fi
APP_PORT="${APP_PORT:-3000}"
HTTPS_PORT="${HTTPS_PORT:-443}"
SERVER_NAME="${DOMAIN:-_}"

if [ -n "${DOMAIN:-}" ]; then MODE="Let's Encrypt ($DOMAIN)"; else MODE="self-signed"; fi
echo "==> HTTPS setup"
echo "    app port   : $APP_PORT"
echo "    https port : $HTTPS_PORT"
echo "    mode       : $MODE"

# --- install nginx ----------------------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
  echo "→ Installing nginx…"
  apt-get update -qq && apt-get install -y nginx
fi

PROXY_BLOCK=$(cat <<PROXY
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        # keep the Excel import progress bar streaming
        proxy_set_header X-Accel-Buffering no;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
PROXY
)

SITE=/etc/nginx/sites-available/gsdn-tracker

if [ -n "${DOMAIN:-}" ]; then
  # ---- Let's Encrypt path --------------------------------------------------
  echo "→ Installing certbot…"
  apt-get install -y certbot python3-certbot-nginx

  # Minimal HTTP server block; certbot injects the TLS block + redirect.
  cat > "$SITE" <<CONF
server {
    listen 80;
    server_name ${DOMAIN};
${PROXY_BLOCK}
}
CONF
  ln -sf "$SITE" /etc/nginx/sites-enabled/gsdn-tracker
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  echo "→ Requesting certificate from Let's Encrypt…"
  certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos \
    ${EMAIL:+-m "$EMAIL"} ${EMAIL:---register-unsafely-without-email}

  echo ""
  echo "✓ HTTPS enabled: https://${DOMAIN}"
  echo "  Certificate auto-renews via the certbot systemd timer."
else
  # ---- self-signed path ----------------------------------------------------
  SSL_DIR=/etc/nginx/ssl
  mkdir -p "$SSL_DIR"
  IP_GUESS="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [ ! -f "$SSL_DIR/gsdn-selfsigned.crt" ]; then
    echo "→ Generating a self-signed certificate (valid 10 years)…"
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
      -keyout "$SSL_DIR/gsdn-selfsigned.key" \
      -out "$SSL_DIR/gsdn-selfsigned.crt" \
      -subj "/CN=${IP_GUESS:-gsdn-tracker}" >/dev/null 2>&1
  fi

  cat > "$SITE" <<CONF
server {
    listen 80;
    server_name ${SERVER_NAME};
    return 301 https://\$host:${HTTPS_PORT}\$request_uri;
}
server {
    listen ${HTTPS_PORT} ssl;
    server_name ${SERVER_NAME};

    ssl_certificate     ${SSL_DIR}/gsdn-selfsigned.crt;
    ssl_certificate_key ${SSL_DIR}/gsdn-selfsigned.key;
    ssl_protocols TLSv1.2 TLSv1.3;

${PROXY_BLOCK}
}
CONF
  ln -sf "$SITE" /etc/nginx/sites-enabled/gsdn-tracker
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  echo ""
  echo "✓ HTTPS enabled (self-signed): https://${IP_GUESS:-<server-ip>}${HTTPS_PORT:+:$HTTPS_PORT}"
  echo "  Browsers show a one-time 'not private' warning — click Advanced → Proceed."
  echo "  For a trusted certificate, point a domain at this server and re-run with DOMAIN=…"
fi

echo ""
echo "  Firewall reminder: allow ${HTTPS_PORT}/tcp (and 80/tcp).  e.g.:"
echo "    sudo ufw allow ${HTTPS_PORT}/tcp && sudo ufw allow 80/tcp"
