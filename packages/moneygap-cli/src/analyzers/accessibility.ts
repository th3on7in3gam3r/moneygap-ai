import { finding } from "../rules/registry.js";
import type { Analyzer, Finding } from "../types/index.js";

export const accessibilityAnalyzer: Analyzer = {
  id: "accessibility",
  category: "accessibility",
  async run(ctx) {
    const findings: Finding[] = [];
    const blobs = ctx.htmlSnippets.map((h) => h.content).join("\n");

    const imgs = [...blobs.matchAll(/<img\b[^>]*>/gi)];
    if (imgs.some((m) => !/\balt=/i.test(m[0]!))) {
      findings.push(
        finding({
          ruleId: "a11y/img-missing-alt",
          title: "Images missing alt text",
          severity: "high",
          category: "accessibility",
          explanation: "One or more <img> tags lack an alt attribute.",
          recommendation: "Add meaningful alt text (or alt=\"\" for decorative).",
          estimatedImpact: "Screen-reader and SEO image context gaps.",
        }),
      );
    }

    const headings = [...blobs.matchAll(/<h([1-6])\b/gi)].map((m) =>
      Number(m[1]),
    );
    for (let i = 1; i < headings.length; i += 1) {
      if (headings[i]! - headings[i - 1]! > 1) {
        findings.push(
          finding({
            ruleId: "a11y/heading-skip",
            title: "Heading hierarchy skip",
            severity: "medium",
            category: "accessibility",
            explanation: `Heading levels jump from h${headings[i - 1]} to h${headings[i]}.`,
            recommendation: "Keep heading levels sequential.",
            estimatedImpact: "Harder navigation for assistive tech.",
          }),
        );
        break;
      }
    }

    const inputs = [...blobs.matchAll(/<input\b[^>]*>/gi)];
    if (
      inputs.some(
        (m) =>
          !/type=["']hidden["']/i.test(m[0]!) &&
          !/\bid=/i.test(m[0]!) &&
          !/\baria-label=/i.test(m[0]!),
      ) &&
      !/<label\b/i.test(blobs)
    ) {
      findings.push(
        finding({
          ruleId: "a11y/input-missing-label",
          title: "Form inputs may lack labels",
          severity: "high",
          category: "accessibility",
          explanation: "Inputs found without nearby label / aria-label patterns.",
          recommendation: "Associate <label htmlFor> or aria-label on inputs.",
          estimatedImpact: "Forms unusable for many assistive users.",
        }),
      );
    }

    if (!/<main\b/i.test(blobs) && !/role=["']main["']/i.test(blobs)) {
      findings.push(
        finding({
          ruleId: "a11y/missing-main-landmark",
          title: "Missing main landmark",
          severity: "medium",
          category: "accessibility",
          explanation: "No <main> landmark detected in scanned layouts.",
          recommendation: "Wrap primary content in <main>.",
          estimatedImpact: "Weaker skip-navigation and structure.",
        }),
      );
    }

    if (!/<nav\b/i.test(blobs) && !/role=["']navigation["']/i.test(blobs)) {
      findings.push(
        finding({
          ruleId: "a11y/missing-nav-landmark",
          title: "Missing navigation landmark",
          severity: "low",
          category: "accessibility",
          explanation: "No <nav> landmark detected.",
          recommendation: "Mark primary navigation with <nav>.",
          estimatedImpact: "Harder landmark navigation.",
        }),
      );
    }

    return findings;
  },
};
