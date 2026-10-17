import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp"],
  // Sharp's platform package contains native DLLs/shared libraries that
  // standalone tracing may omit even when it traces the native .node file.
  // Include the platform package so standalone servers can load Sharp.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@img/sharp-*/**/*"],
  },
  // Next.js 16 blocks cross-origin dev-mode requests (HMR, etc.) by default.
  // 127.0.0.1 is used here (in addition to localhost) because local test
  // tooling (Playwright, curl smoke tests) targets it directly.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...SECURITY_HEADERS,
          ...(process.env.TEN29_ENVIRONMENT === "staging"
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
