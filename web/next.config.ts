import type { NextConfig } from "next";

/**
 * Next.js configuration for theory-bets-web app.
 *
 * Transpiles @dock108/ui package to ensure compatibility with Next.js
 * build process. This is required for all apps using shared UI components.
 */
const ignoreBuildErrors = process.env.NEXT_IGNORE_BUILD_ERRORS === "true";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@dock108/ui", "@dock108/ui-kit", "@dock108/js-core"],
  // Container builds can opt out of typechecking failures (e.g. when upstream
  // package exports/types resolution behaves differently under Turbopack).
  // Keep this OFF by default to avoid masking real issues in local/CI builds.
  typescript: {
    ignoreBuildErrors,
  },
};

export default nextConfig;

