/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Defense-in-depth HTTP headers for an internal analyst tool that holds
  // no patient data but does hold analyst credentials and generated
  // bulletins. None of this replaces the auth checks in middleware.ts and
  // every route handler — it narrows what a compromised or malicious
  // response, or a browser bug, could do on top of that.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // This app is never meant to be embedded in another site's frame.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from guessing content types away from what
          // the server declared (e.g. treating a JSON response as HTML).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full referring URL (which can contain a
          // bulletin ID or query text) to third-party resources.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No geolocation/camera/microphone use anywhere in this app.
          { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js needs inline/eval script allowances in dev; kept
              // permissive enough for the framework's own hydration script
              // while still blocking arbitrary third-party script origins.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // Leaflet (RegionMap) loads tile images from OpenStreetMap.
              "img-src 'self' data: https://*.tile.openstreetmap.org",
              "connect-src 'self'",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
