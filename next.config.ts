import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["bullmq", "ioredis"],
  webpack: (config, { isServer, nextRuntime }) => {
    // Edge middleware bundles `bcryptjs` transitively via `NextAuth` providers
    // but never calls its hashing functions; provide a no-op `crypto` fallback
    // so the dev server stops warning about the Node `crypto` module.
    if (nextRuntime === "edge") {
      config.resolve.fallback = { ...config.resolve.fallback, crypto: false };
    }
    // `ioredis` is server-only (Redis Pub/Sub / rate limit / webhook dedup).
    // Server chunks resolve the real package via `serverExternalPackages`;
    // client and edge chunks resolve it to `false` so it is never bundled.
    if (!isServer || nextRuntime === "edge") {
      config.resolve.alias = { ...config.resolve.alias, ioredis: false };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
