import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen is signed-in and live, so there is nothing to prerender or cache.
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
