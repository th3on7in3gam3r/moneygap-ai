import type { DiagnosticFinding } from "./types.js";

export function checkPerfHeuristics(html: string): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);

  if (imgTags.length === 0) {
    findings.push({
      id: "perf.no_images",
      category: "performance",
      severity: "info",
      title: "No <img> tags on this page",
      detail: "Performance image checks skipped for this HTML snapshot.",
    });
  } else {
    let missingDims = 0;
    let missingLazy = 0;
    for (const tag of imgTags) {
      const hasWidth = /\bwidth\s*=/i.test(tag);
      const hasHeight = /\bheight\s*=/i.test(tag);
      if (!hasWidth || !hasHeight) missingDims += 1;
      const loading = tag.match(/\bloading\s*=\s*["']?([^"'>\s]+)/i)?.[1];
      if (!loading || loading.toLowerCase() !== "lazy") {
        // First image often intentionally eager — only flag if many
        missingLazy += 1;
      }
    }

    if (missingDims > 0) {
      findings.push({
        id: "perf.img_dimensions",
        category: "performance",
        severity: missingDims >= 3 ? "warn" : "info",
        title: "Images missing width/height",
        detail: `${missingDims}/${imgTags.length} images lack explicit dimensions — a common CLS risk signal.`,
      });
    } else {
      findings.push({
        id: "perf.img_dimensions_ok",
        category: "performance",
        severity: "pass",
        title: "Image dimensions present",
        detail: "Sampled images include width/height attributes.",
      });
    }

    if (imgTags.length >= 4 && missingLazy === imgTags.length) {
      findings.push({
        id: "perf.lazy_load",
        category: "performance",
        severity: "info",
        title: "Consider lazy-loading below-the-fold images",
        detail: "No loading=\"lazy\" attributes found on images.",
      });
    }
  }

  const hasGoogleFonts =
    /fonts\.googleapis\.com/i.test(html) || /fonts\.gstatic\.com/i.test(html);
  if (hasGoogleFonts) {
    const preconnect =
      /rel\s*=\s*["']preconnect["'][^>]*fonts\.g/i.test(html) ||
      /fonts\.g[^>]*rel\s*=\s*["']preconnect["']/i.test(html);
    findings.push({
      id: preconnect ? "perf.fonts_preconnect_ok" : "perf.fonts_render_blocking",
      category: "performance",
      severity: preconnect ? "pass" : "warn",
      title: preconnect
        ? "Font preconnect detected"
        : "Google Fonts without preconnect",
      detail: preconnect
        ? "Preconnect hints found for font hosts."
        : "Google Fonts can delay text rendering. Add preconnect and consider font-display: swap.",
    });
  } else {
    findings.push({
      id: "perf.fonts_ok",
      category: "performance",
      severity: "pass",
      title: "No obvious render-blocking Google Fonts",
      detail: "This is a heuristic signal — not a lab Web Vitals measurement.",
    });
  }

  const nextImage = /_next\/image/i.test(html) || /next\/image/i.test(html);
  if (nextImage) {
    findings.push({
      id: "perf.next_image",
      category: "performance",
      severity: "pass",
      title: "Next.js image optimization hints",
      detail: "Detected next/image usage patterns in HTML.",
    });
  }

  findings.push({
    id: "perf.disclaimer",
    category: "performance",
    severity: "info",
    title: "Performance signals only",
    detail:
      "These are HTML heuristics, not measured Core Web Vitals (LCP/INP/CLS). Run a full MoneyGap AI scan for deeper scoring.",
  });

  return findings;
}

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim() || null;
}
