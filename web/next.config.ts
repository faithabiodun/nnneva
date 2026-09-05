import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit .next/standalone: a self-contained server plus only the node_modules
  // it actually imports. The runtime image copies that instead of installing
  // dependencies, which takes the container from ~1GB to ~200MB and means the
  // image holds no build tooling.
  output: "standalone",
};

export default nextConfig;
