import type { ModuleDefinition } from "@/lib/analysis/engine/types";

export const SHARED_GROWTH_RULES = `CRITICAL RULES (MoneyGap Engine™):
- You are part of an AI Business Growth Intelligence Platform — NOT an SEO tool or auditor.
- Focus on what is MISSING, never merely catalog what exists (brief contrast only).
- Every finding must answer: What prevents full growth potential, and how do we fix it?
- Connect every signal to: Visibility → Traffic → Leads → Customers → Revenue.
- Never give jargon without that business-outcome chain.
- Estimates are directional AI Estimates only — never claim certainty or guaranteed ROI.
- Prefer 2–5 high-value findings for this module (avoid laundry lists).
- detectionStatus: not_found (clearly missing), partial (weak/incomplete), found (only if noting a critical gap around something weak).
- expectedRoi is integer 1–5 (directional).
- opportunityIndex and priorityScore / confidence are integers 0–100.
- severity: critical | high | medium | low.
- fixes must include Quick Wins (quick_win), Medium Effort (medium), and Long-Term Strategy (long_term) when relevant.
- Each fix needs: tier, action, difficulty, estimatedTime, priority, expectedImpact, resources (string or null).
- estimatedAnnualRevenue is USD annual opportunity (integer) or null.
- estimatedConversionLift is percent points as integer (e.g. 15 ≈ 15% relative lift) or null.
- evidenceSummary: short factual evidence for why the gap exists (1–3 sentences).
- supportingSignals: 2–5 concrete observable signals (what was / was not detected).
- businessReasoning: why this matters for this business type (plain English ROI path).
- detectionSource: string like "module:marketing" or a short detection label.`;

export function buildModuleInstructions(
  def: ModuleDefinition,
  kgContext?: string,
): string {
  const kgBlock =
    kgContext && kgContext.trim()
      ? `

Knowledge Graph guidance (proprietary industry intelligence — use when relevant to this module; do not invent catalog facts beyond this pack):
${kgContext.trim()}`
      : "";

  return `You are ${def.name} for MoneyGap AI.

Mission: ${def.mission}

Absence catalog to investigate (find what is missing, not inventory what works):
${def.absenceCatalog.map((item) => `- ${item}`).join("\n")}

${SHARED_GROWTH_RULES}
${kgBlock}

Return JSON matching the schema. Set moduleId to "${def.id}" and category to "${def.id}" on every finding.`;
}

export const fixSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "tier",
    "action",
    "difficulty",
    "estimatedTime",
    "priority",
    "expectedImpact",
    "resources",
  ],
  properties: {
    tier: { type: "string", enum: ["quick_win", "medium", "long_term"] },
    action: { type: "string" },
    difficulty: { type: "string" },
    estimatedTime: { type: "string" },
    priority: { type: "string" },
    expectedImpact: { type: "string" },
    resources: { type: ["string", "null"] },
  },
} as const;

export const findingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "moduleId",
    "category",
    "title",
    "detectionStatus",
    "summary",
    "whatsMissing",
    "whyItMatters",
    "businessImpact",
    "estimatedAnnualRevenue",
    "estimatedLeads",
    "estimatedTraffic",
    "estimatedConversionLift",
    "estimateRationale",
    "confidence",
    "likelyCauses",
    "fixes",
    "helpfulResources",
    "severity",
    "difficulty",
    "estimatedTime",
    "expectedRoi",
    "opportunityIndex",
    "priorityScore",
    "evidenceSummary",
    "supportingSignals",
    "businessReasoning",
    "detectionSource",
  ],
  properties: {
    moduleId: { type: "string" },
    category: { type: "string" },
    title: { type: "string" },
    detectionStatus: {
      type: "string",
      enum: ["found", "not_found", "partial"],
    },
    summary: { type: "string" },
    whatsMissing: { type: "string" },
    whyItMatters: { type: "string" },
    businessImpact: { type: "string" },
    estimatedAnnualRevenue: { type: ["integer", "null"] },
    estimatedLeads: { type: ["integer", "null"] },
    estimatedTraffic: { type: ["integer", "null"] },
    estimatedConversionLift: { type: ["integer", "null"] },
    estimateRationale: { type: "string" },
    confidence: { type: "integer" },
    likelyCauses: { type: "array", items: { type: "string" } },
    fixes: { type: "array", items: fixSchema },
    helpfulResources: { type: "array", items: { type: "string" } },
    severity: {
      type: "string",
      enum: ["critical", "high", "medium", "low"],
    },
    difficulty: { type: "string" },
    estimatedTime: { type: "string" },
    expectedRoi: { type: "integer" },
    opportunityIndex: { type: "integer" },
    priorityScore: { type: "integer" },
    evidenceSummary: { type: "string" },
    supportingSignals: { type: "array", items: { type: "string" } },
    businessReasoning: { type: "string" },
    detectionSource: { type: "string" },
  },
} as const;

export const moduleOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: { type: "array", items: findingSchema },
  },
} as const;
