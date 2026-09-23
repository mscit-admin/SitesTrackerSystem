# GSDN Sites Tracker — Installation Guide

Complete instructions to install and run the system on a fresh Linux server
(Ubuntu 20.04/22.04/24.04 or Debian 11/12). Everything is covered: prerequisites,
install, choosing a port, enabling HTTPS, auto-start on boot, updates, backups,
PostgreSQL, and troubleshooting.

The app is a **Next.js** application with a **Prisma** database. By default it uses
**SQLite** (a single file — no separate database server), which is the simplest and
recommended setup for one server. The repository already contains all seed data
(318 sites + risks + the original Excel), so no separate data upload is needed.

---

## 0. Requirements

- A Linux server (Ubuntu/Debian) with `sudo` access.
- **Node.js 18 or newer** and **npm**.
- **git**.
- Outbound internet during install (to fetch npm packages).
- Open the app/HTTPS ports in any cloud firewall/security group.

---

## 1. Install Node.js, git (one time)

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# verify
node -v      # should print v18.x or newer
npm -v
git --version
```

> Prefer Node via nvm? `nvm install 18 && nvm use 18` works too — just make sure
> `node` is on PATH for the user that runs pm2.

---

## 2. Get the code

The installation directory is **`~/projects/sts`**.

```bash
mkdir -p ~/projects
git clone https://github.com/mscit-admin/SitesTrackerSystem.git ~/projects/sts
cd ~/projects/sts

# use the current working branch
git checkout claude/eager-fermat-q6xj2f
```

---

## 3. First-time install (one command)

```bash
./setup-server.sh            # runs on port 3000
# or choose a port:
./setup-server.sh 8080
```

This single script:
1. Checks Node is 18+.
2. Creates `.env` from `.env.example` (SQLite database) and saves your chosen port.
3. `npm ci` — installs exact dependencies.
4. `npm run setup` — creates the database schema **and imports the 318 sites**.
5. Builds the production bundle.
6. Installs **pm2** (if missing) and starts the app as `gsdn-tracker`.

When it finishes, the app is live at:

```
http://<server-ip>:<port>
```

---

## 4. Choosing / changing the port

- **At install:** `./setup-server.sh <port>` (e.g. `./setup-server.sh 8080`).
- **Later:** edit `PORT=` in the `.env` file, then run `./deploy.sh` to restart on it.

The chosen port is stored in `.env` and reused automatically by every update.

---

## 5. Plain HTTP (no HTTPS)

If you don't need HTTPS yet, skip nginx entirely — the app serves HTTP directly.
Just choose the port and open `http://<server-ip>:<port>`.

```bash
cd ~/projects/sts
# (optional) if you previously enabled HTTPS, disable the nginx site so it frees the ports
sudo rm -f /etc/nginx/sites-enabled/gsdn-tracker && sudo systemctl reload nginx 2>/dev/null || true

# serve on port 80 -> clean URL http://<server-ip>   (root can bind 80)
sed -i -E 's/^PORT=.*/PORT=80/' .env
sudo fuser -k 80/tcp 2>/dev/null || true
./deploy.sh
sudo ufw allow 80/tcp
```

Prefer a non-privileged port? Use `PORT=8080` instead and open `http://<server-ip>:8080`
(`sudo ufw allow 8080/tcp`). You can enable HTTPS later at any time (section 6).

## 6. Enable HTTPS (SSL) — optional, later

HTTPS is provided by **nginx** as a reverse proxy in front of the Node app. One
script sets it up. Run it **after** the app is running (step 3).

### A) You have a public domain — free trusted certificate (Let's Encrypt)

Point the domain's DNS **A record** at the server first, and make sure port **80**
is reachable (needed for domain validation). Then:

```bash
sudo DOMAIN=tracker.example.com EMAIL=you@example.com ./scripts/setup-https.sh
```

- Installs nginx + certbot, obtains a trusted certificate, redirects `http → https`.
- The certificate **auto-renews** via certbot's systemd timer.
- App is then served at `https://tracker.example.com`.

### B) No domain — only an IP address (self-signed certificate)

Let's Encrypt needs a domain, so with only an IP you use a **self-signed**
certificate. This is the normal, supported setup for an IP-only server:

```bash
# app on internal 3000, HTTPS on 8443, cert bound to your public IP
sudo APP_PORT=3000 HTTPS_PORT=8443 IP=161.97.78.116 ./scripts/setup-https.sh
sudo ufw allow 8443/tcp
```

- `IP=` sets the certificate's address (use your **public** IP). Omit it to
  auto-detect the server's first IP.
- Generates a self-signed certificate (valid 10 years, with the IP as a SAN) and
  serves HTTPS on `HTTPS_PORT`.
- Browse to `https://<your-ip>:<HTTPS_PORT>`. The browser shows a one-time
  "Not secure / Your connection is not private" warning → **Advanced → Proceed**.
  This is expected for self-signed certs and is safe on your own server; the traffic
  is still encrypted.
- To serve on the standard `443` instead, drop `HTTPS_PORT` (then the URL is just
  `https://<your-ip>`).

### Custom ports

```bash
sudo APP_PORT=8080 HTTPS_PORT=8443 ./scripts/setup-https.sh
```

- `APP_PORT` = the Node app's port (defaults to the value in `.env`).
- `HTTPS_PORT` = the port nginx serves HTTPS on (defaults to 443).

### Open the firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp        # or your custom HTTPS_PORT
```

Also open these ports in your cloud provider's security group if you have one.

> The nginx config keeps the **Excel import progress bar** streaming correctly
> (`proxy_buffering off; X-Accel-Buffering no`).

---

## 7. Start automatically on server reboot

```bash
pm2 startup                   # prints a command — copy & run it exactly
pm2 save                      # remembers the running app
```

After this, `gsdn-tracker` restarts automatically whenever the server boots.

---

## 8. Updating to the latest version

Whenever you want to pull the newest code and redeploy:

```bash
cd ~/projects/sts
./deploy.sh
```

`deploy.sh` pulls the latest commit, installs dependencies, syncs the database
schema, rebuilds, and restarts pm2 on the same port. Then hard-refresh the browser
(**Ctrl+Shift+R**).

---

## 9. Managing the app (pm2 cheat sheet)

```bash
pm2 status                    # is it running?
pm2 logs gsdn-tracker         # live logs (Ctrl+C to exit)
pm2 restart gsdn-tracker      # restart
pm2 stop gsdn-tracker         # stop
pm2 start gsdn-tracker        # start again
```

---

## 10. Backups (SQLite)

The whole database is one file: `dev.db` in the project folder. To back it up:

```bash
cp ~/projects/sts/dev.db ~/gsdn-backup-$(date +%F).db
```

Restore by copying a backup back over `dev.db` and running `pm2 restart gsdn-tracker`.
You can also keep a copy of `.env`.

---

## 11. Optional: PostgreSQL instead of SQLite

For heavier multi-user load you can switch to PostgreSQL:

1. Install PostgreSQL and create a database + user.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. In `.env`, set:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/gsdn?schema=public"
   ```
4. Apply the schema and import the data:
   ```bash
   npm run setup
   ```
5. Rebuild and restart:
   ```bash
   ./deploy.sh
   ```

---

## 12. Re-importing / updating data from a new Excel file

Two ways:

- **From the app (recommended):** Sites screen → **"تحديث من إكسل"** button. Upload a
  new `GSDN_Master` (`.xlsb`/`.xlsx`); existing sites update, new ones are added, with
  a live progress bar.
- **From the server (full reload):** put the new file at `data/source/GSDN_Master.xlsb`,
  then:
  ```bash
  pip install -r scripts/requirements.txt
  python3 scripts/extract_xlsb.py     # regenerates data/sites.json + data/risks.json
  npm run db:seed                     # reloads them into the database
  # regenerate the region-detection reference (optional, keeps auto-region accurate)
  node scripts/genGeoReference.js
  ./deploy.sh
  ```

---

## 13. Troubleshooting

**A change I made doesn't appear in the browser.**
Almost always a stale build. Run `./deploy.sh` (it clears `.next` and rebuilds), then
hard-refresh (**Ctrl+Shift+R**). If `git pull` complains about `package-lock.json`,
`deploy.sh` already handles it by discarding the auto-generated lockfile changes.

**Port already in use / app keeps restarting (`EADDRINUSE`).**
An old `next-server` process is still holding the port. Recover with:
```bash
cd ~/projects/sts
pm2 delete gsdn-tracker
sudo fuser -k "$(grep -E '^PORT=' .env | sed -E 's/[^0-9]//g')"/tcp   # free the app port
./deploy.sh
```
The updated `setup-server.sh`/`deploy.sh` run Next directly under pm2 and free the
port before starting, so this no longer recurs. To just move to a free port, change
`PORT=` in `.env` and run `./deploy.sh`.

> Note: the **app port** and the **HTTPS port** must differ. Recommended: keep the
> app on an internal port like `3000` and let nginx serve HTTPS on `443` (or `8443`).
> Don't set the app's `PORT` to the same value you pass as `HTTPS_PORT`.

**`pm2: command not found`.**
Install it globally: `sudo npm install -g pm2`. If still not found, ensure npm's
global bin is on PATH (`npm bin -g`).

**Build fails with a font/network error.**
The app loads its Arabic font (Cairo) at runtime, not at build time, so builds work
offline. If a build fails, re-run `./deploy.sh` after confirming `npm ci` succeeded.

**nginx: `nginx -t` fails after HTTPS setup.**
Check `sudo nginx -t` output. Make sure no other site config binds the same port; the
script disables the default site (`/etc/nginx/sites-enabled/default`).

**Let's Encrypt certificate request fails.**
The domain must resolve to this server and port 80 must be open to the internet for
validation. Verify DNS (`dig +short tracker.example.com`) and firewall, then re-run
the HTTPS script.

**Reset the database to a clean state (re-import all 318 sites).**
```bash
npm run db:reset      # WARNING: wipes current data, then re-seeds from data/*.json
pm2 restart gsdn-tracker
```

---

## Quick reference

| Task | Command |
|---|---|
| First install (port 3000) | `./setup-server.sh` |
| First install (custom port) | `./setup-server.sh 8080` |
| Enable HTTPS (domain) | `sudo DOMAIN=example.com EMAIL=you@example.com ./scripts/setup-https.sh` |
| Enable HTTPS (self-signed) | `sudo ./scripts/setup-https.sh` |
| Start on boot | `pm2 startup` then `pm2 save` |
| Update | `./deploy.sh` |
| Logs | `pm2 logs gsdn-tracker` |
| Backup DB | `cp dev.db ~/gsdn-backup-$(date +%F).db` |
