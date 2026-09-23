// Extra hostnames (with port) allowed to submit Server Actions when the app runs
// behind a reverse proxy on a non-standard port. Comma-separate in .env, e.g.
//   ALLOWED_ORIGINS=161.97.78.116.nip.io:8444,tracker.example.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow uploading the Master workbook via a Server Action.
    serverActions: {
      bodySizeLimit: "16mb",
      ...(allowedOrigins.length ? { allowedOrigins } : {}),
    },
  },
};

export default nextConfig;
