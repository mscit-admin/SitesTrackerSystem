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

# Install dependencies ONLY when the lockfile actually changed since the last
# successful install. Reinstalling identical packages on every deploy wastes
# memory and can trigger the OOM killer on a busy VPS (npm ci deletes and
# rebuilds node_modules). We fall back to `npm install` if `npm ci` is killed.
HASH_FILE=".deploy-deps-hash"
LOCK_HASH="$( (sha1sum package-lock.json 2>/dev/null || shasum package-lock.json 2>/dev/null) | awk '{print $1}')"
if [ -d node_modules ] && [ -f "$HASH_FILE" ] && [ "$LOCK_HASH" = "$(cat "$HASH_FILE" 2>/dev/null)" ]; then
  echo "→ Dependencies unchanged — skipping install."
else
  echo "→ Installing dependencies…"
  # --no-audit/--no-fund reduce work/memory; --prefer-offline reuses the cache.
  if npm ci --no-audit --no-fund --prefer-offline; then
    :
  else
    echo "  npm ci failed (possibly OOM) — retrying with npm install…"
    npm install --no-audit --no-fund --prefer-offline
  fi
  echo "$LOCK_HASH" > "$HASH_FILE"
fi

echo "→ Syncing database schema…"
npx prisma db push --accept-data-loss

echo "→ Ensuring admin role + first admin user…"
npm run seed:admin || true

echo "→ Building…"
rm -rf .next
npm run build

echo "→ Restarting app…"
APP_PORT="$(grep -E '^[[:space:]]*PORT=' .env 2>/dev/null | tail -1 | sed -E 's/^[^=]*=//; s/[^0-9]//g')"
APP_PORT="${APP_PORT:-3000}"
echo "  port: $APP_PORT"
# Recreate the process cleanly and free the port, so a stale next-server child
# from an earlier run can never keep holding it (EADDRINUSE crash-loop).
pm2 delete gsdn-tracker >/dev/null 2>&1 || true
if command -v fuser >/dev/null 2>&1; then fuser -k "${APP_PORT}/tcp" >/dev/null 2>&1 || true
elif command -v lsof  >/dev/null 2>&1; then kill $(lsof -t -i:"${APP_PORT}" 2>/dev/null) >/dev/null 2>&1 || true; fi
sleep 1
# Run Next directly (NOT via `npm start`) so pm2 owns the real process.
PORT="$APP_PORT" pm2 start ./node_modules/next/dist/bin/next \
  --name gsdn-tracker --interpreter node -- start -p "$APP_PORT"
pm2 save || true

echo "✓ Done. Hard-refresh the browser (Ctrl+Shift+R)."
