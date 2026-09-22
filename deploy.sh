#!/usr/bin/env bash
# One-shot deploy/update script for the GSDN Sites Tracker.
# Usage:  ./deploy.sh
#
# It resets the auto-generated lockfile (so `git pull` never conflicts),
# pulls the latest code, installs exact dependencies, syncs the database
# schema, rebuilds, and restarts the pm2 process.
set -e
cd "$(dirname "$0")"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "→ Repo: $(pwd)  (branch: $BRANCH)"

echo "→ Discarding local package-lock.json changes (auto-generated)…"
git checkout -- package-lock.json 2>/dev/null || true

echo "→ Pulling latest…"
git pull origin "$BRANCH"
echo "  now at: $(git log --oneline -1)"

echo "→ Installing dependencies (npm ci)…"
npm ci

echo "→ Syncing database schema…"
npx prisma db push --accept-data-loss

echo "→ Building…"
rm -rf .next
npm run build

echo "→ Restarting app…"
pm2 restart gsdn-tracker || pm2 start "npm start" --name gsdn-tracker
pm2 save || true

echo "✓ Done. Hard-refresh the browser (Ctrl+Shift+R)."
