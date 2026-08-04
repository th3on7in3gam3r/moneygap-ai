import path from "node:path";
import { pathExists } from "../utils/fs.js";
import { finding } from "../rules/registry.js";
import type { Analyzer, Finding } from "../types/index.js";

async function anyExists(root: string, rels: string[]): Promise<boolean> {
  for (const r of rels) {
    if (await pathExists(path.join(root, r))) return true;
  }
  return false;
}

export const trustAnalyzer: Analyzer = {
  id: "trust",
  category: "trust",
  async run(ctx) {
    const findings: Finding[] = [];
    const root = ctx.projectRoot;
    const blob = ctx.files.join("\n").toLowerCase() + "\n" + ctx.htmlSnippets.map((h) => h.content).join("\n").toLowerCase();

    const checks: { id: string; title: string; paths: string[]; keywords: string[] }[] = [
      {
        id: "trust/missing-privacy",
        title: "Missing Privacy Policy surface",
        paths: ["src/app/(marketing)/privacy", "src/app/privacy", "pages/privacy", "app/privacy", "public/privacy.html"],
        keywords: ["privacy"],
      },
      {
        id: "trust/missing-terms",
        title: "Missing Terms of Service surface",
        paths: ["src/app/(marketing)/terms", "src/app/terms", "pages/terms", "app/terms"],
        keywords: ["terms"],
      },
      {
        id: "trust/missing-contact",
        title: "Missing Contact page",
        paths: ["src/app/(marketing)/contact", "src/app/contact", "pages/contact", "app/contact"],
        keywords: ["contact"],
      },
      {
        id: "trust/missing-about",
        title: "Missing About page",
        paths: ["src/app/(marketing)/about", "src/app/about", "pages/about", "app/about"],
        keywords: ["about"],
      },
      {
        id: "trust/missing-security",
        title: "Missing Security disclosure page",
        paths: ["src/app/(marketing)/security", "src/app/security", "pages/security"],
        keywords: ["security"],
      },
    ];

    for (const c of checks) {
      const byPath = await anyExists(root, c.paths.map((p) => p));
      // also check page.tsx under those dirs
      const byPage = await anyExists(
        root,
        c.paths.flatMap((p) => [`${p}/page.tsx`, `${p}/page.jsx`, `${p}.tsx`, `${p}.mdx`]),
      );
      const byKeyword = c.keywords.some((k) => blob.includes(`/${k}`) || blob.includes(`${k}/page`));
      if (!byPath && !byPage && !byKeyword) {
        findings.push(
          finding({
            ruleId: c.id,
            title: c.title,
            severity: c.id.includes("privacy") || c.id.includes("terms") ? "high" : "medium",
            category: "trust",
            explanation: `${c.title} was not detected via routes or filenames.`,
            recommendation: `Add a clear ${c.keywords[0]} page linked from the footer.`,
            estimatedImpact: "Lower visitor trust and compliance posture.",
          }),
        );
      }
    }

    if (!/cookie|consent|gdpr/i.test(blob)) {
      findings.push(
        finding({
          ruleId: "trust/missing-cookie-notice",
          title: "Missing cookie / consent notice signals",
          severity: "medium",
          category: "trust",
          explanation: "No cookie/consent related strings or components detected.",
          recommendation: "Add a consent banner / privacy preferences control.",
          estimatedImpact: "Weaker privacy UX expectations.",
        }),
      );
    }

    if (!/testimonial|review|case.study|social.proof/i.test(blob)) {
      findings.push(
        finding({
          ruleId: "trust/missing-social-proof",
          title: "Limited social proof signals",
          severity: "low",
          category: "trust",
          explanation: "Few testimonial/review/case-study markers found.",
          recommendation: "Surface testimonials or logos on key conversion pages.",
          estimatedImpact: "Lower conversion confidence.",
        }),
      );
    }

    return findings;
  },
};
