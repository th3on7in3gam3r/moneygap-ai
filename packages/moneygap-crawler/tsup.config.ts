import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node20",
  external: [
    "playwright",
    "playwright-core",
    "chromium-bidi",
    "pg",
    "cheerio",
    "fast-xml-parser",
    "normalize-url",
    "p-queue",
    "robots-parser",
    "zod",
  ],
});
