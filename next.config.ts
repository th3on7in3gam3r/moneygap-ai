import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdfkit out of the bundler so AFM font metrics resolve from node_modules.
  serverExternalPackages: ["pdfkit"],
  // Ensure AFM data files are included in Vercel serverless traces.
  outputFileTracingIncludes: {
    "/api/public/cli-report": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/public/audits/[slug]/pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
