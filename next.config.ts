import type { NextConfig } from "next";

function buildContentSecurityPolicy(frameAncestors: string) {
  return [
  "default-src 'self'",
  "base-uri 'self'",
  `frame-ancestors ${frameAncestors}`,
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
}

const contentSecurityPolicy = buildContentSecurityPolicy("'none'");
const onshapeContentSecurityPolicy = buildContentSecurityPolicy(
  "https://cad.onshape.com https://*.onshape.com",
);

const nextConfig: NextConfig = {
  async headers() {
    const sharedSecurityHeaders = [
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), xr-spatial-tracking=()",
      },
    ];

    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: contentSecurityPolicy,
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      ...sharedSecurityHeaders,
    ];

    const onshapeSecurityHeaders = [
      {
        key: "Content-Security-Policy",
        value: onshapeContentSecurityPolicy,
      },
      ...sharedSecurityHeaders,
    ];

    return [
      {
        source: "/design-app/onshape/:path*",
        headers: onshapeSecurityHeaders,
      },
      {
        source: "/:path((?!design-app/onshape).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
