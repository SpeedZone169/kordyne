import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://developer.api.autodesk.com",

  // Turnstile + Autodesk viewer scripts
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://developer.api.autodesk.com",
  "script-src-elem 'self' 'unsafe-inline' https://challenges.cloudflare.com https://developer.api.autodesk.com",

  // Turnstile iframe + Autodesk viewer iframe
  "frame-src 'self' https://challenges.cloudflare.com https://developer.api.autodesk.com",
  "child-src 'self' https://challenges.cloudflare.com blob:",

  // Supabase, Autodesk, Turnstile, general HTTPS APIs
  "connect-src 'self' https: wss: https://challenges.cloudflare.com",

  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: contentSecurityPolicy,
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), xr-spatial-tracking=()",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
