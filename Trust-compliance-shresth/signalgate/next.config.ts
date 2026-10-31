import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Allow sharing the dev server through a tunnel (Cloudflare quick tunnel / ngrok) with full interactivity.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.io"],
};

export default nextConfig;
