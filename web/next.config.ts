import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // C:\Users\User has its own package-lock.json and node_modules, so Turbopack
    // would otherwise infer the home directory as the workspace root.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
