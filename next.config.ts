import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable automatic Next.js agent-rules insertion into AGENTS.md so AGENTS.md matches CLAUDE.md verbatim
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
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
