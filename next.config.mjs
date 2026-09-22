/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow uploading the Master workbook via a Server Action.
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
