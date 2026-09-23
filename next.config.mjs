// Extra hostnames (with port) allowed to submit Server Actions when the app runs
// behind a reverse proxy on a non-standard port. Comma-separate in .env, e.g.
//   ALLOWED_ORIGINS=161.97.78.116.nip.io:8444,tracker.example.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Security headers applied to every response (defense-in-depth on top of TLS).
const securityHeaders = [
  // Force HTTPS for 2 years (only sent over https; harmless over http).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise Next.js version
  experimental: {
    // Allow uploading the Master workbook via a Server Action.
    serverActions: {
      bodySizeLimit: "16mb",
      ...(allowedOrigins.length ? { allowedOrigins } : {}),
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
