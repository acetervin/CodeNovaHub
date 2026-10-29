import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Files can be up to 25 MB (lib/uploads.ts). Next's defaults are 1 MB per form, and 10 MB once middleware runs:
  // above that it cuts the upload short and the server sees "Unexpected end of form".
  experimental: { serverActions: { bodySizeLimit: "26mb" }, proxyClientMaxBodySize: "26mb" },
  poweredByHeader: false,
  devIndicators: { position: "bottom-right" }, // bottom-left is where the nav's "more" button sits
  // Client data lives here: no framing by other sites (clickjacking), HTTPS only, no leaking file links in referrers.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ],
    }];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
