import path from "node:path";
import { pathExists } from "../utils/fs.js";
import { finding } from "../rules/registry.js";
import type { Analyzer, Finding } from "../types/index.js";

async function routeExists(root: string, names: string[]): Promise<boolean> {
  const bases = [
    "src/app",
    "src/app/(marketing)",
    "app",
    "pages",
    "src/pages",
  ];
  for (const b of bases) {
    for (const n of names) {
      const candidates = [
        path.join(root, b, n, "page.tsx"),
        path.join(root, b, n, "page.jsx"),
        path.join(root, b, `${n}.tsx`),
        path.join(root, b, `${n}.jsx`),
        path.join(root, b, `${n}.mdx`),
      ];
      for (const c of candidates) {
        if (await pathExists(c)) return true;
      }
    }
  }
  return false;
}

export const growthAnalyzer: Analyzer = {
  id: "growth",
  category: "growth",
  async run(ctx) {
    const findings: Finding[] = [];
    const blob = ctx.htmlSnippets.map((h) => h.content).join("\n");

    const cta = /(get started|start free|sign up|book a demo|request demo|try free|buy now|subscribe)/i.test(
      blob,
    );
    if (!cta) {
      findings.push(
        finding({
          ruleId: "growth/weak-cta",
          title: "Improve CTA visibility",
          severity: "high",
          category: "growth",
          explanation: "Few clear primary CTA phrases found in scanned UI copy.",
          recommendation: "Add a prominent above-the-fold primary CTA.",
          estimatedImpact: "Lower conversion on landing pages.",
        }),
      );
    }

    if (!(await routeExists(ctx.projectRoot, ["pricing", "plans"]))) {
      findings.push(
        finding({
          ruleId: "growth/missing-pricing",
          title: "Missing pricing page",
          severity: "medium",
          category: "growth",
          explanation: "No pricing/plans route detected.",
          recommendation: "Publish a clear pricing or plans page.",
          estimatedImpact: "Friction in buyer evaluation.",
        }),
      );
    }

    if (!(await routeExists(ctx.projectRoot, ["contact", "demo", "book"]))) {
      findings.push(
        finding({
          ruleId: "growth/missing-demo-contact",
          title: "Missing demo / contact flow",
          severity: "medium",
          category: "growth",
          explanation: "No contact/demo booking route detected.",
          recommendation: "Add contact or demo request flow.",
          estimatedImpact: "Lost high-intent leads.",
        }),
      );
    }

    if (!/(newsletter|subscribe|email.*signup|join.*list)/i.test(blob)) {
      findings.push(
        finding({
          ruleId: "growth/missing-newsletter",
          title: "Missing newsletter capture",
          severity: "low",
          category: "growth",
          explanation: "No newsletter/email capture patterns found.",
          recommendation: "Add optional email capture on content pages.",
          estimatedImpact: "Weaker nurture pipeline.",
        }),
      );
    }

    if (!/(testimonial|trusted by|customers|logo|case study)/i.test(blob)) {
      findings.push(
        finding({
          ruleId: "growth/missing-social-proof-cta",
          title: "Social proof near conversion paths",
          severity: "medium",
          category: "growth",
          explanation: "Limited social proof markers near UI copy.",
          recommendation: "Place logos/quotes beside primary CTAs.",
          estimatedImpact: "Lower conversion confidence.",
        }),
      );
    }

    return findings;
  },
};
