import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { finding } from "../rules/registry.js";
import type { Analyzer, Finding } from "../types/index.js";

export const performanceAnalyzer: Analyzer = {
  id: "performance",
  category: "performance",
  async run(ctx) {
    const findings: Finding[] = [];
    const blobs = ctx.htmlSnippets.map((h) => h.content).join("\n");

    const imgs = [...blobs.matchAll(/<img\b[^>]*>/gi)];
    for (const m of imgs.slice(0, 40)) {
      const tag = m[0]!;
      if (!/\b(width|height)=/i.test(tag)) {
        findings.push(
          finding({
            ruleId: "perf/img-missing-dimensions",
            title: "Images missing width/height (CLS risk)",
            severity: "medium",
            category: "performance",
            explanation: "Image tags without dimensions can cause layout shift.",
            recommendation: "Set width/height or use aspect-ratio / next/image.",
            estimatedImpact: "Higher CLS risk on first paint.",
            file: ctx.htmlSnippets.find((h) => h.content.includes(tag))?.file,
          }),
        );
        break;
      }
    }

    if (imgs.some((m) => !/\bloading=["']lazy["']/i.test(m[0]!)) && imgs.length > 3) {
      findings.push(
        finding({
          ruleId: "perf/lazy-loading-opportunity",
          title: "Lazy-loading opportunities",
          severity: "low",
          category: "performance",
          explanation: "Multiple images without loading=\"lazy\".",
          recommendation: "Lazy-load below-the-fold images.",
          estimatedImpact: "Heavier initial network waterfalls.",
        }),
      );
    }

    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(blobs)) {
      findings.push(
        finding({
          ruleId: "perf/blocking-fonts",
          title: "Blocking webfonts detected",
          severity: "medium",
          category: "performance",
          explanation: "Google Fonts links may block rendering if not optimized.",
          recommendation: "Use font-display: swap, preload, or self-host fonts.",
          estimatedImpact: "Delayed text rendering / FOIT risk.",
        }),
      );
    }

    if (ctx.framework.id === "next" && !/next\/image|from ["']next\/image["']/i.test(blobs + ctx.files.join("\n"))) {
      // soft check — look in tsx files names only already in snippets
      const usesNextImage = ctx.htmlSnippets.some((h) =>
        /next\/image/.test(h.content),
      );
      if (!usesNextImage) {
        findings.push(
          finding({
            ruleId: "perf/next-image-hint",
            title: "Consider next/image for optimized images",
            severity: "info",
            category: "performance",
            explanation: "Next.js project without clear next/image usage in scanned files.",
            recommendation: "Prefer next/image for responsive optimized assets.",
            estimatedImpact: "Missed automatic image optimization.",
          }),
        );
      }
    }

    // Oversized static assets
    try {
      const assets = await fg(["public/**/*.{png,jpg,jpeg,webp,gif,svg}", "static/**/*.{png,jpg,jpeg,webp}"], {
        cwd: ctx.projectRoot,
        absolute: true,
        onlyFiles: true,
        ignore: ctx.config.ignore,
      });
      for (const file of assets.slice(0, 80)) {
        const st = await fs.stat(file);
        if (st.size > 500_000) {
          findings.push(
            finding({
              ruleId: "perf/oversized-image",
              title: "Oversized image asset",
              severity: "medium",
              category: "performance",
              explanation: `${path.relative(ctx.projectRoot, file)} is ${(st.size / 1024).toFixed(0)}KB.`,
              recommendation: "Compress or convert to modern formats (WebP/AVIF).",
              estimatedImpact: "Slower LCP on image-heavy pages.",
              file: path.relative(ctx.projectRoot, file),
            }),
          );
          break;
        }
      }
    } catch {
      /* soft-fail */
    }

    return findings;
  },
};
