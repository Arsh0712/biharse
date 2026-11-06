import type { NextConfig } from "next";

/**
 * Baseline security headers — applied to every route in dev AND production.
 * Strict-Transport-Security is harmless on http dev but active once behind TLS.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/**
 * CSP — PRODUCTION ONLY. Dev is excluded because HMR needs ws:// connections and
 * react-refresh eval, which a strict CSP would break.
 *
 * Vendor origins audited against src/components/layout/consent-gate.tsx (consent-gated
 * GA4 + Meta Pixel) and the Razorpay Checkout loader:
 *  - GA4 script:      https://www.googletagmanager.com  (script-src)
 *  - GA4 beacons:     https://*.google-analytics.com / https://*.analytics.google.com (connect-src)
 *  - Meta Pixel script: https://connect.facebook.net    (script-src)
 *  - Meta Pixel beacons: https://www.facebook.com / https://connect.facebook.net (connect-src, img-src)
 *  - Razorpay:        https://checkout.razorpay.com (script-src, frame-src), https://api.razorpay.com
 *                     (frame-src, connect-src), https://lumberjack.razorpay.com (connect-src)
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.googletagmanager.com https://www.google-analytics.com https://*.razorpay.com https://www.facebook.com",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://connect.facebook.net",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  /**
   * Ship the SQLite database + uploaded media inside every serverless bundle.
   * On Vercel the filesystem is read-only, so src/lib/db.ts copies db/custom.db
   * to /tmp at cold start and src/lib/storage.ts seeds db/uploads the same way —
   * both need the files present in the traced bundle (process.cwd()).
   */
  outputFileTracingIncludes: {
    "/**": ["./db/**"],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    // CSP is applied only when NODE_ENV === 'production' (dev HMR would otherwise break).
    const headers =
      process.env.NODE_ENV === "production"
        ? [...securityHeaders, { key: "Content-Security-Policy", value: contentSecurityPolicy }]
        : securityHeaders;
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
