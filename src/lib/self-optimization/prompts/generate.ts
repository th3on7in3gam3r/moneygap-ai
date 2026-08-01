import type { SelfOptPrompts } from "@/db/schema";
import type { SelfOptFindingInput } from "../types";

export function generatePrompts(
  finding: SelfOptFindingInput,
  context: { product: string; targetUrl: string },
): SelfOptPrompts {
  const base = `Product: ${context.product}
Site: ${context.targetUrl}
Issue: ${finding.title}
Problem: ${finding.problem}
Business impact: ${finding.businessImpact}
Why it matters: ${finding.whyItMatters}
Evidence:
${finding.evidence.map((e) => `- ${e}`).join("\n")}
Recommended Fix Path™: ${finding.fixPath}
Constraints: Do not invent metrics. Label estimates as AI Estimate. Prefer minimal diffs. Never auto-publish.`;

  return {
    cursor: `${base}

You are editing the MoneyGap AI Next.js codebase. Implement the Fix Path™ above with the smallest safe change. Show files to touch and a verification checklist:
${finding.verificationSteps.map((s) => `- ${s}`).join("\n")}`,
    chatgpt: `${base}

Act as a senior growth engineer. Produce a step-by-step implementation plan, copy for metadata/content if needed, and a verification checklist.`,
    claude: `${base}

Think carefully about trade-offs. Propose an implementation plan that preserves existing MoneyGap Engine™ behavior, avoids mock data, and includes verification steps.`,
    gemini: `${base}

Provide concrete file-level guidance for a Next.js App Router SaaS marketing site, plus SEO/metadata snippets ready to paste.`,
    copilot: `// MoneyGap Self Optimization™ finding
// ${finding.title}
// Fix: ${finding.fixPath}
// Page: ${finding.pageUrl ?? context.targetUrl}
// Implement the fix with minimal scope; add verification comments.`,
  };
}

export function attachPrompts(
  findings: SelfOptFindingInput[],
  context: { product: string; targetUrl: string },
): SelfOptFindingInput[] {
  return findings.map((f) => ({
    ...f,
    prompts: f.prompts ?? generatePrompts(f, context),
  }));
}
