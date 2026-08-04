import path from "node:path";
import {
  calculateAIReadiness,
  detectKnowledgeResources,
  validateLlmsFile,
} from "../ai-readiness/index.js";
import { finding } from "../rules/registry.js";
import { pathExists, readText } from "../utils/fs.js";
import type { Analyzer, Finding } from "../types/index.js";

async function resolveLlms(
  projectRoot: string,
): Promise<{ content: string | null; file: string | null }> {
  const candidates = [
    path.join(projectRoot, "public", "llms.txt"),
    path.join(projectRoot, "llms.txt"),
  ];
  for (const file of candidates) {
    if (await pathExists(file)) {
      return { content: await readText(file), file: path.relative(projectRoot, file) };
    }
  }
  return { content: null, file: null };
}

export const aiReadinessAnalyzer: Analyzer = {
  id: "ai-readiness",
  category: "aiReadiness",
  async run(ctx) {
    const findings: Finding[] = [];
    const blobs = ctx.htmlSnippets.map((h) => h.content).join("\n");
    const { content, file } = await resolveLlms(ctx.projectRoot);
    const validation = validateLlmsFile(content);

    if (!validation.present) {
      findings.push(
        finding({
          ruleId: "llms/missing-file",
          title: "Missing llms.txt",
          severity: "high",
          category: "aiReadiness",
          explanation:
            "AI systems have no dedicated guidance document describing your organization and primary resources.",
          recommendation:
            "Run `moneygap generate llms` and publish public/llms.txt.",
          estimatedImpact: "Weaker AI discoverability and machine understanding.",
        }),
      );
    } else {
      for (const err of validation.errors) {
        findings.push(
          finding({
            ruleId: err.ruleId,
            title: err.message.slice(0, 80),
            severity: err.severity === "info" ? "low" : err.severity,
            category: "aiReadiness",
            explanation: err.message,
            recommendation: "Improve llms.txt sections — run `moneygap validate llms`.",
            estimatedImpact: "Reduced AI guidance quality.",
            file: file ?? undefined,
          }),
        );
      }
      for (const w of validation.warnings.slice(0, 6)) {
        findings.push(
          finding({
            ruleId: w.ruleId,
            title: w.message.slice(0, 80),
            severity: w.severity === "info" ? "low" : w.severity,
            category: "aiReadiness",
            explanation: w.message,
            recommendation: "Fill missing llms.txt sections.",
            estimatedImpact: "Incomplete AI crawler guidance.",
            file: file ?? undefined,
          }),
        );
      }
    }

    const knowledge = detectKnowledgeResources(ctx.files);
    const hasJsonLd =
      /application\/ld\+json/i.test(blobs) || /"@type"\s*:/i.test(blobs);
    const readiness = calculateAIReadiness({
      llmsPresent: validation.present && !validation.empty,
      llmsValidationScore: validation.present ? validation.score : null,
      hasJsonLd,
      hasOrganizationSchema: /Organization/i.test(blobs),
      hasFaqSchema: /FAQPage/i.test(blobs),
      hasArticleSchema: /"@type"\s*:\s*"Article"/i.test(blobs),
      hasSemanticHeadings: /<h1[\s>]/i.test(blobs) && /<h2[\s>]/i.test(blobs),
      hasCanonical: /rel=["']canonical["']/i.test(blobs),
      hasContactTransparency:
        /contact/i.test(blobs) || ctx.files.some((f) => /contact/i.test(f)),
      hasDocumentation:
        knowledge.some((k) => k.kind === "docs") ||
        ctx.files.some((f) => /docs/i.test(f)),
      knowledgeResourceCount: knowledge.length,
    });

    // Soft signal: if readiness score is low beyond llms findings, add one summary finding
    if (readiness.score < 55 && findings.length < 3) {
      for (const r of readiness.recommendations.slice(0, 2)) {
        if (findings.some((f) => f.ruleId === r.ruleId)) continue;
        findings.push(
          finding({
            ruleId: r.ruleId ?? `ai-readiness/${r.title}`,
            title: r.title,
            severity: r.priority === "info" ? "low" : r.priority,
            category: "aiReadiness",
            explanation: r.whyItMatters,
            recommendation: r.recommendedAction,
            estimatedImpact: r.impact,
          }),
        );
      }
    }

    return findings;
  },
};
