import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Trigger Vercel redeploy with my-app as root directory
  // Pin the root to this project: a stray package-lock.json in a parent folder
  // (e.g. the home directory) otherwise makes Next treat that folder as the root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
