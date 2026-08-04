import {
  LLMS_SECTIONS,
  RULESET_VERSION,
  RULES,
  ruleById,
} from "../rules/registry.js";
import type {
  AiReadinessIssue,
  AiReadinessRecommendation,
  LlmsValidationResult,
  RecommendationPriority,
} from "../types.js";

function parseSections(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  let current: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (current) {
      map.set(current.toLowerCase(), buf.join("\n").trim());
    }
    buf = [];
  };

  for (const line of lines) {
    const h = line.match(/^#\s+(.+)\s*$/);
    if (h) {
      flush();
      current = h[1]!.trim();
      continue;
    }
    if (current) buf.push(line);
  }
  flush();
  return map;
}

function hasBody(sectionBody: string | undefined): boolean {
  if (!sectionBody) return false;
  const cleaned = sectionBody.replace(/^[-*]\s*$/gm, "").trim();
  return cleaned.length >= 8;
}

function issue(
  ruleId: string,
  severity: RecommendationPriority,
  message: string,
): AiReadinessIssue {
  return { ruleId, severity, message };
}

function toRec(ruleId: string): AiReadinessRecommendation | null {
  const r = ruleById(ruleId);
  if (!r) return null;
  return {
    title: r.title,
    priority: r.severity,
    impact: r.impact,
    whyItMatters: r.why,
    recommendedAction: r.action,
    estimatedEffort: r.effort,
    ruleId: r.id,
  };
}

/**
 * Validate llms.txt Markdown structure and content quality.
 */
export function validateLlmsFile(content: string | null | undefined): LlmsValidationResult {
  const errors: AiReadinessIssue[] = [];
  const warnings: AiReadinessIssue[] = [];
  const suggestions: AiReadinessIssue[] = [];
  const recommendations: AiReadinessRecommendation[] = [];

  const push = (ruleId: string, bucket: "error" | "warning" | "suggestion") => {
    const r = ruleById(ruleId);
    if (!r) return;
    const msg = r.why;
    const item = issue(ruleId, r.severity, msg);
    if (bucket === "error") errors.push(item);
    else if (bucket === "warning") warnings.push(item);
    else suggestions.push(item);
    const rec = toRec(ruleId);
    if (rec) recommendations.push(rec);
  };

  if (content == null || content.trim().length === 0) {
    push("llms/missing-file", "error");
    return {
      rulesetVersion: RULESET_VERSION,
      score: 0,
      errors,
      warnings,
      suggestions,
      recommendations,
      sectionsFound: [],
      present: false,
      empty: true,
    };
  }

  const trimmed = content.trim();
  if (trimmed.length < 40) {
    push("llms/empty-file", "error");
  }

  const sections = parseSections(trimmed);
  const sectionsFound = [...sections.keys()].map((k) =>
    LLMS_SECTIONS.find((s) => s.toLowerCase() === k) ?? k,
  );

  const requiredPairs: {
    section: string;
    ruleId: string;
    bucket: "error" | "warning" | "suggestion";
  }[] = [
    { section: "Organization", ruleId: "llms/missing-organization", bucket: "error" },
    { section: "Summary", ruleId: "llms/missing-summary", bucket: "error" },
    { section: "Important URLs", ruleId: "llms/missing-important-urls", bucket: "error" },
    { section: "Products", ruleId: "llms/missing-products", bucket: "warning" },
    { section: "Services", ruleId: "llms/missing-services", bucket: "warning" },
    { section: "Target Audience", ruleId: "llms/missing-audience", bucket: "warning" },
    { section: "Documentation", ruleId: "llms/missing-documentation", bucket: "warning" },
    { section: "Knowledge Base", ruleId: "llms/missing-knowledge", bucket: "suggestion" },
    { section: "FAQ", ruleId: "llms/missing-faq", bucket: "warning" },
    { section: "Support", ruleId: "llms/missing-support", bucket: "warning" },
    { section: "Contact", ruleId: "llms/missing-contact", bucket: "warning" },
    {
      section: "Preferred Canonical Resources",
      ruleId: "llms/missing-canonicals",
      bucket: "warning",
    },
    { section: "Update Information", ruleId: "llms/missing-update-info", bucket: "suggestion" },
  ];

  for (const p of requiredPairs) {
    const body = sections.get(p.section.toLowerCase());
    if (!hasBody(body)) {
      push(p.ruleId, p.bucket);
    }
  }

  if (!/https:\/\//i.test(trimmed)) {
    push("llms/no-https-links", "warning");
  }

  // Score: start 100, subtract rule weights for triggered issues
  let score = 100;
  const triggered = new Set(
    [...errors, ...warnings, ...suggestions].map((i) => i.ruleId),
  );
  for (const r of RULES) {
    if (triggered.has(r.id)) {
      score -= r.weight;
    }
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    rulesetVersion: RULESET_VERSION,
    score,
    errors,
    warnings,
    suggestions,
    recommendations,
    sectionsFound,
    present: true,
    empty: trimmed.length < 40,
  };
}
