import type { NextConfig } from "next";

const pages = process.env.GITHUB_PAGES === "1";
const pagesBase = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  ...(pages
    ? {
        output: "export",
        ...(pagesBase ? { basePath: pagesBase } : {}),
      }
    : {
        cacheComponents: true,
        partialPrefetching: true,
      }),
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.trycloudflare.com"],
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
