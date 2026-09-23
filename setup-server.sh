#!/usr/bin/env bash
# First-time installation of the GSDN Sites Tracker on a fresh server.
# Run this ONCE after cloning the repo. For later updates use ./deploy.sh
#
#   git clone <repo-url> && cd SitesTrackerSystem
#   ./setup-server.sh                # runs on port 3000
#   ./setup-server.sh 8080           # choose a different port
#   PORT=8080 ./setup-server.sh      # (same thing via env var)
#
# Requirements: Node.js 18+ and npm already installed (see README / the guide).
set -e
cd "$(dirname "$0")"

echo "==> GSDN Sites Tracker — first-time server setup"
echo "    Repo: $(pwd)"

# Chosen port: first CLI argument > PORT env var > value in .env > 3000.
choose_port() {
  local p="${1:-${PORT:-}}"
  if [ -z "$p" ] && [ -f .env ]; then
    p="$(grep -E '^[[:space:]]*PORT=' .env | tail -1 | sed -E 's/^[^=]*=//; s/[^0-9]//g')"
  fi
  echo "${p:-3000}"
}
APP_PORT="$(choose_port "$1")"
case "$APP_PORT" in
  ''|*[!0-9]*) echo "✗ Invalid port: '$APP_PORT'" >&2; exit 1 ;;
esac
echo "→ App port: $APP_PORT"

# 1) Node check --------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js is not installed. Install Node 18+ first, then re-run." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node.js $(node -v) is too old. Need 18 or newer." >&2
  exit 1
fi
echo "→ Node $(node -v), npm $(npm -v)"

# 2) Environment file --------------------------------------------------------
if [ ! -f .env ]; then
  echo "→ Creating .env (SQLite database)…"
  cp .env.example .env
else
  echo "→ .env already exists — keeping it."
fi

# Persist the chosen port into .env so deploy.sh reuses it later.
if grep -qE '^[[:space:]]*PORT=' .env; then
  sed -i -E "s|^[[:space:]]*PORT=.*|PORT=${APP_PORT}|" .env
else
  echo "PORT=${APP_PORT}" >> .env
fi

# 3) Dependencies ------------------------------------------------------------
echo "→ Installing dependencies (npm ci)…"
npm ci

# 4) Database: generate client, create schema, import the 318 sites ----------
echo "→ Setting up the database + importing seed data…"
npm run setup

# 5) Production build --------------------------------------------------------
echo "→ Building the production bundle…"
rm -rf .next
npm run build

# 6) Process manager (pm2) ---------------------------------------------------
if ! command -v pm2 >/dev/null 2>&1; then
  echo "→ Installing pm2 globally…"
  npm install -g pm2
fi

echo "→ Starting the app under pm2 (name: gsdn-tracker, port ${APP_PORT})…"
pm2 delete gsdn-tracker >/dev/null 2>&1 || true
# Free the port in case a previous run left an orphaned next-server holding it.
if command -v fuser >/dev/null 2>&1; then fuser -k "${APP_PORT}/tcp" >/dev/null 2>&1 || true
elif command -v lsof  >/dev/null 2>&1; then kill $(lsof -t -i:"${APP_PORT}" 2>/dev/null) >/dev/null 2>&1 || true; fi
sleep 1
# Run Next directly (NOT via `npm start`) so pm2 owns the real process and
# restarts release the port cleanly.
PORT="$APP_PORT" pm2 start ./node_modules/next/dist/bin/next \
  --name gsdn-tracker --interpreter node -- start -p "$APP_PORT"
pm2 save

echo ""
echo "✓ Installation complete."
echo "  The app is running on http://<server-ip>:${APP_PORT}"
echo "  • Make pm2 start on boot:   pm2 startup   (run the command it prints)"
echo "  • Enable HTTPS:             sudo ./scripts/setup-https.sh   (see README)"
echo "  • Later updates:            ./deploy.sh"
