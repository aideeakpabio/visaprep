import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.replit.dev",
    "*.worf.replit.dev",
    "127.0.0.1",
  ],
  // Disable the "Compiling…" build-activity badge in the preview pane
  devIndicators: false,
  experimental: {
    // Keep the RSC router cache alive longer so Next.js doesn't
    // constantly refetch server-component payloads through Replit's proxy.
    // Failing RSC fetches fall back to full browser navigation, wiping
    // all React state — this was causing the results page to reset in a loop.
    staleTimes: {
      dynamic: 60,   // seconds — for dynamic (uncached) routes
      static: 300,   // seconds — for static routes
    },
  },
};

export default nextConfig;
