# Security Overview — GSDN Sites Tracker

How the system protects the connection to end users, the parts inside the system,
and the database — plus the server-side steps that complete the picture.

---

## 1. Connection: end user ↔ system (in transit)

- **TLS/HTTPS** terminates at nginx (`scripts/setup-https.sh`) — a trusted Let's
  Encrypt certificate (or self-signed for IP-only). All traffic between the browser
  and the server is encrypted.
- **HSTS** header (`Strict-Transport-Security`) tells browsers to only ever use
  HTTPS for this host, preventing downgrade/SSL-strip attacks.
- Additional response headers (in `next.config.mjs`, sent on every response):
  - `X-Content-Type-Options: nosniff` — no MIME sniffing.
  - `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` —
    clickjacking protection (the app can't be embedded in an iframe).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` disables camera/mic/geolocation.
  - `poweredByHeader: false` — the Next.js version is not advertised.
- The reverse proxy forwards the real host with its port (`Host $http_host`) so
  Server Actions validate correctly (no downgrade of the origin check).

**Verify:** `curl -sI https://<host>:<port> | grep -i strict-transport` should show
the HSTS header.

## 2. Inside the system (between parts)

- **Every route requires authentication.** `middleware.ts` blocks any request that
  has no session cookie and redirects to `/login`; real validation (expiry, active
  user) happens server-side in `getCurrentUser()`.
- **Server Actions** (all mutations) run only on the server; Next.js enforces an
  **Origin ↔ Host check** on every action (CSRF protection), reinforced by the
  `SameSite=Lax` cookie.
- **Role-based access control.** `lib/permissions.ts` defines a matrix
  (module → sub-section → action). `requirePermission("…")` gates admin actions
  (users/roles), and the UI hides what a user can't do.
  - *In progress:* wiring `requirePermission` into the existing operational actions
    (site phases, acquisition gates, risks, maintenance, deletion approvals) so the
    matrix fully governs those too.
- **Uploaded files** (avatars) are validated by type and size, stored under a fixed
  filename derived from the user id (no path traversal), and SVG is rejected (no
  script-in-image XSS).

## 3. Passwords & login

- **Hashing:** bcrypt, cost factor **12** (`bcryptjs`). Plaintext passwords are
  never stored or logged.
- **Password policy:** minimum 8 characters, at least one letter and one number
  (`passwordIssue()`), enforced on create / change / reset.
- **Forced rotation:** new and reset accounts must change the password at first
  login (`mustChangePassword`).
- **Brute-force protection:** per-identifier+IP rate limiting with lockout after 8
  failures for 15 minutes (`lib/rateLimit.ts`).
- **No account enumeration:** a bcrypt compare always runs (even for unknown
  identifiers, against a dummy hash) and the error message is always generic.
- **2FA (optional):** TOTP via an authenticator app (Google Authenticator / Authy),
  enrolled with a QR code; required at login when enabled.

## 4. Sessions & cookies

- The cookie holds a **random 256-bit token**; only its **SHA-256 hash** is stored
  in the database, so a database leak can't be used to forge sessions.
- Cookie flags: **`__Host-` prefix**, `HttpOnly`, `Secure`, `SameSite=Lax`,
  `Path=/`, no `Domain` — it can't be read by JavaScript, only travels over HTTPS,
  and no other host on the shared domain can set/override it.
- Sessions expire after 7 days; expired rows are purged on access and on login.
- **Logout** deletes the session; **deactivating** a user or **resetting** their
  password immediately invalidates all their sessions.

## 5. Database

- Default is **SQLite** (`dev.db`) — a local file, **not** under the web root and
  **not** served to the network, so it has no open port to attack.
- All queries go through **Prisma** with parameter binding → no SQL injection.
- Recommended: restrict the file so only the app user can read it:
  ```bash
  chmod 600 ~/projects/sts/dev.db
  ```
- Back it up regularly: `cp ~/projects/sts/dev.db ~/gsdn-backup-$(date +%F).db`.
- For multi-user scale, switch to **PostgreSQL** (see INSTALL.md) and connect over
  a local socket or TLS; keep the DB bound to `localhost`, never public.

## 6. Server hardening checklist

- [ ] **Change the default admin password** immediately (or set `ADMIN_PASSWORD`
      before first `seed:admin`).
- [ ] App listens on an **internal port** (e.g. 3010); only nginx (HTTPS) is public.
- [ ] Firewall: allow only 22 (SSH), 80, and your HTTPS port; close the app port
      externally (`ufw` **and** the provider's panel).
- [ ] Keep packages updated (`npm audit`), and the OS patched.
- [ ] `chmod 600` the database file and `.env`.
- [ ] Consider **fail2ban** on SSH and nginx.
- [ ] Keep certificates auto-renewing (certbot timer) if using a domain.

## Reporting

Found an issue? Contact the project administrator — do not open a public issue with
exploit details.
