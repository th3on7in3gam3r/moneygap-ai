import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Node-only packages out of the Turbopack/webpack graph for client bundles.
  serverExternalPackages: ["pdfkit", "moneygap-crawler", "playwright", "playwright-core"],
  // Ensure AFM data files are included in Vercel serverless traces.
  outputFileTracingIncludes: {
    "/api/public/cli-report": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/public/audits/[slug]/pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
