#!/usr/bin/env bash
# First-time installation of the GSDN Sites Tracker on a fresh server.
# Run this ONCE after cloning the repo. For later updates use ./deploy.sh
#
#   git clone <repo-url> && cd SitesTrackerSystem
#   ./setup-server.sh
#
# Requirements: Node.js 18+ and npm already installed (see README / the guide).
set -e
cd "$(dirname "$0")"

echo "==> GSDN Sites Tracker — first-time server setup"
echo "    Repo: $(pwd)"

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

echo "→ Starting the app under pm2 (name: gsdn-tracker, port 3000)…"
pm2 delete gsdn-tracker >/dev/null 2>&1 || true
PORT="${PORT:-3000}" pm2 start npm --name gsdn-tracker -- start
pm2 save

echo ""
echo "✓ Installation complete."
echo "  The app is running on http://<server-ip>:${PORT:-3000}"
echo "  • Make pm2 start on boot:   pm2 startup   (run the command it prints)"
echo "  • Later updates:            ./deploy.sh"
