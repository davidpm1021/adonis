import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Skip static optimization during build
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
};

export default nextConfig;
